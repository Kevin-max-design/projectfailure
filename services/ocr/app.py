from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import uvicorn
import shutil
import os
import io
import time
import base64
import fitz # PyMuPDF
from PIL import Image
import pytesseract

# ��Tesseract binary auto-discovery �ĢĢĢzDescription
def _find_tesseract_binary() -> str | None:
    found = shutil.which("tesseract")
    if found:
        return found
    for candidate in [
        "/opt/homebrew/bin/tesseract",
        "/usr/local/bin/tesseract",
        "/usr/bin/tesseract",
    ]:
        if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            return candidate
    return None

_tess_cmd = _find_tesseract_binary()
if _tess_cmd:
    pytesseract.pytesseract.tesseract_cmd = _tess_cmd
    print(f"[app] Tesseract binary resolved: {_tess_cmd}")
else:
    print("[app] WARNING: Tesseract binary not found on PATH or common locations.")

from schemas import OCRResponse, OCRPageResult, OCRBlock, BoundingBox, HealthResponse, OCRDocumentRegion
from preprocessing.image_processor import ImageProcessor
from providers.tesseract_provider import TesseractProvider
from providers.paddle_provider import PaddleOCRProvider

app = FastAPI(title="MedMemory Local OCR Service")

@app.get("/health", response_model=HealthResponse)
def health_check():
    tess_version = None
    try:
        v = pytesseract.get_tesseract_version()
        tess_version = getattr(v, 'public_version', None) or str(v)
    except Exception as e:
        print(f"[health] Tesseract version check failed: {e}")
        pass

    paddle_avail = PaddleOCRProvider.is_available()
    engine = "paddleocr" if paddle_avail else "tesseract"
    
    return HealthResponse(
        status="healthy" if tess_version or paddle_avail else "unconfigured",
        engine=engine,
        tesseractVersion=tess_version,
        paddleAvailable=paddle_avail
    )

@app.post("/ocr", response_model=OCRResponse)
async def perform_ocr(
    file: UploadFile = File(...),
    engine: str = Form("paddleocr")
):
    start_time = time.time()
    
    try:
        file_bytes = await file.read()
        filename = file.filename.lower() if file.filename else ""
        
        pages_result = []
        is_pdf = filename.endswith('.pdf') or file.content_type == 'application/pdf'
        
        paddle_avail = PaddleOCRProvider.is_available()
        active_engine = engine
        if active_engine == "paddleocr" and not paddle_avail:
            active_engine = "tesseract"
            print("PaddleOCR requested but not available. Falling back to Tesseract.")

        detected_regions = None

        if is_pdf:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            total_native_chars = 0
            for page in doc:
                total_native_chars += len(page.get_text().strip())
                
            if total_native_chars > 50:
                print(f"PDF contains native text ({total_native_chars} chars). Bypassing OCR...")
                for idx, page in enumerate(doc):
                    page_num = idx + 1
                    blocks = page.get_text("blocks")
                    ocr_blocks = []
                    full_texts = []
                    
                    for b_adx, b in enumerate(blocks):
                        x0, y0, x1, y1, text, block_no, block_type = b
                        if block_type != 0:
                            continue
                        text = text.strip()
                        if not text:
                            continue
                        full_texts.append(text)
                        
                        ocr_blocks.append(OCRBlock(
                            id=f"block_{page_num}_{b_adx}",
                            text=text,
                            confidence=1.0,
                            boundingBox=BoundingBox(
                                 x=int(x0),
                                 y=int(y0),
                                 width=max(1, int(x1 - x0)),
                                 height=max(1, int(y1 - y0))
                            )
                        ))
                    
                    pages_result.append(OCRPageResult(
                        page=page_num,
                        rotationDegrees=0,
                        skewAngle=0.0,
                        width=612,
                        height=792,
                        blocks=ocr_blocks,
                        fullText="\n".join(full_texts)
                    ))
            else:
                print("PDF=appears to be scanned. Rendering pages and running OCR...")
                for idx, page in enumerate(doc):
                    page_num = idx + 1
                    zoom = 300 / 72
                    mat = fitz.Matrix(zoom, zoom)
                    pix = page.get_pixmap(matrix=mat)
                    img_data = pix.tobytes("png")
                    
                    pil_img = Image.open(io.BytesIO(img_data))
                    processed_pil, rotation_angle, skew_angle = ImageProcessor.preprocess_image(pil_img)
                    
                    if active_engine == "paddleocr":
                        page_res = PaddleOCRProvider.extract_page_data(processed_pil, page_num, rotation_angle)
                    else:
                        page_res = TesseractProvider.extract_page_data(processed_pil, page_num, rotation_angle)
                        
                    orig_buffer = io.BytesIO()
                    pil_img.save(orig_buffer, format="PNG")
                    page_res.originalImageBase64 = base64.b64encode(orig_buffer.getvalue()).decode("utf-8")
                    
                    buffer = io.BytesIO()
                    processed_pil.save(buffer, format="PNG")
                    page_res.normalizedImageBase64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
                    
                    page_res.skewAngle = skew_angle
                    page_res.width = processed_pil.width
                    page_res.height = processed_pil.height
                    
                    pages_result.append(page_res)
        else:
            pil_img = Image.open(io.BytesIO(file_bytes))
            corrected_orig = ImageProcessor.correct_exif_orientation(pil_img)
            processed_pil, rotation_angle, skew_angle = ImageProcessor.preprocess_image(corrected_orig)
            
            if active_engine == "paddleocr":
                page_res = PaddleOCRProvider.extract_page_data(processed_pil, 1, rotation_angle)
            else:
                page_res = TesseractProvider.extract_page_data(processed_pil, 1, rotation_angle)
                
            orig_buffer = io.BytesIO()
            corrected_orig.save(orig_buffer, format="PNG")
            page_res.originalImageBase64 = base64.b64encode(orig_buffer.getvalue()).decode("utf-8")
            
            buffer = io.BytesIO()
            processed_pil.save(buffer, format="PNG")
            page_res.normalizedImageBase64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
            
            page_res.skewAngle = skew_angle
            page_res.width = processed_pil.width
            page_res.height = processed_pil.height
            pages_result.append(page_res)
            
            regions = ImageProcessor.detect_document_regions(processed_pil)
            detected_regions = []
            for idx, reg in enumerate(regions):
                x, y, w, h = reg["box"]
                cropped_pil = processed_pil.crop((x, y, x + w, y + h))
                
                if active_engine == "paddleocr":
                    reg_ocr = PaddleOCRProvider.extract_page_data(cropped_pil, 1, rotation_angle)
                else:
                    reg_ocr = TesseractProvider.extract_page_data(cropped_pil, 1, rotation_angle)
                    
                crop_buffer = io.BytesIO()
                cropped_pil.save(crop_buffer, format="PNG")
                crop_b64 = base64.b64encode(crop_buffer.getvalue()).decode("utf-8")
                
                reg_ocr.skewAngle = skew_angle
                reg_ocr.width = cropped_pil.width
                reg_ocr.height = cropped_pil.height
                
                detected_regions.append(OCRDocumentRegion(
                    regionId=reg["region_id"],
                    boundingBox=BoundingBox(x=x, y=y, width=w, height=h),
                    confidence=reg["confidence"],
                    croppedImageBase64=crop_b64,
                    ocrResult=reg_ocr
                ))
                
        processing_time = int((time.time() - start_time) * 1000)
        
        return OCRResponse(
            pages=pages_result,
            engine=active_engine,
            processingTimeMs=processing_time,
            detectedRegions=detected_regions
        )
        
    except Exception as e:
        print(f"OCR service processing error: {e}")
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)
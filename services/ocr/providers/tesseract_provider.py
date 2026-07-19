import pytesseract
from PIL import Image
from schemas import OCRBlock, BoundingBox, OCRPageResult
import uuid
import os
import shutil

# Auto-discover Tesseract binary so the service works even when
# /opt/homebrew/bin is not in the process PATH (common in npm scripts on macOS)
def _find_tesseract() -> str | None:
    # 1. Already on PATH?
    found = shutil.which("tesseract")
    if found:
        return found
    # 2. Common Homebrew locations
    for candidate in [
        "/opt/homebrew/bin/tesseract",   # macOS Apple Silicon
        "/usr/local/bin/tesseract",       # macOS Intel / Linux
        "/usr/bin/tesseract",             # Ubuntu/Debian
    ]:
        if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            return candidate
    return None

_tess_path = _find_tesseract()
if _tess_path:
    pytesseract.pytesseract.tesseract_cmd = _tess_path
    print(f"[TesseractProvider] Using Tesseract binary: {_tess_path}")

class TesseractProvider:
    @staticmethod
    def extract_page_data(image: Image.Image, page_number: int, rotation_degrees: int) -> OCRPageResult:
        """
        Runs Tesseract OCR on a single image and aggregates word-level output
        into layout blocks.
        """
        try:
            # Run Tesseract OCR and get complete layout dataset
            data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            
            blocks_map = {}
            n_boxes = len(data['text'])
            
            for i in range(n_boxes):
                # Only process word-level objects (level 5 is word level)
                if data['level'][i] != 5:
                    continue
                
                text = str(data['text'][i]).strip()
                if not text:
                    continue
                
                block_num = data['block_num'][i]
                left = data['left'][i]
                top = data['top'][i]
                width = data['width'][i]
                height = data['height'][i]
                conf = float(data['conf'][i]) / 100.0 # Convert 0-100 to 0-1
                
                if block_num not in blocks_map:
                    blocks_map[block_num] = {
                        'words': [],
                        'box': {'x_min': left, 'y_min': top, 'x_max': left + width, 'y_max': top + height},
                        'confidences': []
                    }
                else:
                    # Update block bounding box dimensions
                    b = blocks_map[block_num]['box']
                    b['x_min'] = min(b['x_min'], left)
                    b['y_min'] = min(b['y_min'], top)
                    b['x_max'] = max(b['x_max'], left + width)
                    b['y_max'] = max(b['y_max'], top + height)
                
                blocks_map[block_num]['words'].append(text)
                if conf >= 0: # -1 indicates no confidence score
                    blocks_map[block_num]['confidences'].append(conf)
            
            ocr_blocks = []
            full_texts = []
            
            for block_num, info in sorted(blocks_map.items()):
                block_text = " ".join(info['words']).strip()
                if not block_text:
                    continue
                    
                full_texts.append(block_text)
                
                box = info['box']
                bbox = BoundingBox(
                    x=box['x_min'],
                    y=box['y_min'],
                    width=box['x_max'] - box['x_min'],
                    height=box['y_max'] - box['y_min']
                )
                
                # Average confidence or default to 0.8
                avg_conf = sum(info['confidences']) / len(info['confidences']) if info['confidences'] else 0.8
                
                ocr_blocks.append(OCRBlock(
                    id=f"block_{page_number}_{block_num}_{uuid.uuid4().hex[:4]}",
                    text=block_text,
                    confidence=round(avg_conf, 3),
                    boundingBox=bbox
                ))
            
            full_text = "\n".join(full_texts)
            
            return OCRPageResult(
                page=page_number,
                rotationDegrees=rotation_degrees,
                blocks=ocr_blocks,
                fullText=full_text
            )
            
        except Exception as e:
            print(f"Tesseract extraction failed on page {page_number}: {e}")
            # Return empty page result on failure
            return OCRPageResult(
                page=page_number,
                rotationDegrees=rotation_degrees,
                blocks=[],
                fullText=""
            )

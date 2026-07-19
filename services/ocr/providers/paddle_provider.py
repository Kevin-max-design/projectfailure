from PIL import Image
import numpy as np
from schemas import OCRBlock, BoundingBox, OCRPageResult
import uuid

class PaddleOCRProvider:
    _ocr_instance = None

    @classmethod
    def get_ocr_instance(cls):
        if cls._ocr_instance is None:
            from paddleocr import PaddleOCR
            # Disable logger to keep console output clean
            cls._ocr_instance = PaddleOCR(use_angle_cls=True, show_log=False, lang='en')
        return cls._ocr_instance

    @classmethod
    def is_available(cls) -> bool:
        try:
            import paddleocr
            import paddle
            return True
        except ImportError:
            return False

    @classmethod
    def extract_page_data(cls, image: Image.Image, page_number: int, rotation_degrees: int) -> OCRPageResult:
        """
        Runs PaddleOCR on a single image and converts layout results to OCRBlocks.
        """
        if not cls.is_available():
            raise RuntimeError("PaddleOCR or PaddlePaddle is not installed in the environment.")
            
        try:
            ocr = cls.get_ocr_instance()
            
            # Convert PIL Image to numpy array (RGB)
            img_np = np.array(image)
            
            # Run PaddleOCR
            result = ocr.ocr(img_np, cls=True)
            
            ocr_blocks = []
            full_texts = []
            
            # PaddleOCR returns a list of results, one for each image processed
            if result and result[0]:
                for idx, line in enumerate(result[0]):
                    # Line format: [ [[x1,y1], [x2,y2], [x3,y3], [x4,y4]], (text, confidence) ]
                    coords, (text, conf) = line
                    text = text.strip()
                    if not text:
                        continue
                        
                    full_texts.append(text)
                    
                    # Calculate bounding box
                    xs = [pt[0] for pt in coords]
                    ys = [pt[1] for pt in coords]
                    x_min, x_max = min(xs), max(xs)
                    y_min, y_max = min(ys), max(ys)
                    
                    bbox = BoundingBox(
                        x=int(x_min),
                        y=int(y_min),
                        width=int(x_max - x_min),
                        height=int(y_max - y_min)
                    )
                    
                    ocr_blocks.append(OCRBlock(
                        id=f"block_{page_number}_{idx}_{uuid.uuid4().hex[:4]}",
                        text=text,
                        confidence=round(float(conf), 3),
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
            print(f"PaddleOCR extraction failed on page {page_number}: {e}")
            return OCRPageResult(
                page=page_number,
                rotationDegrees=rotation_degrees,
                blocks=[],
                fullText=""
            )

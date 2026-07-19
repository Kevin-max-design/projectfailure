import cv2
import numpy as np
from PIL import Image, ImageOps
import pytesseract
import math
import uuid

class ImageProcessor:
    @staticmethod
    def correct_exif_orientation(image: Image.Image) -> Image.Image:
        """Correct image orientation based on EXIF metadata."""
        try:
            return ImageOps.exif_transpose(image)
        except Exception as e:
            print(f"EXIF orientation correction failed: {e}")
            return image

    @staticmethod
    def detect_and_correct_rotation(image: Image.Image) -> tuple[Image.Image, int]:
        """
        Use Tesseract OSD (Orientation and Script Detection) to identify and correct
        90, 180, or 270 degree rotation.
        Returns: (Corrected Image, Rotation angle applied clockwise)
        """
        try:
            # Convert PIL Image to OpenCV format
            open_cv_image = np.array(image)
            # Convert RGB to BGR
            if len(open_cv_image.shape) == 3 and open_cv_image.shape[2] == 3:
                open_cv_image = cv2.cvtColor(open_cv_image, cv2.COLOR_RGB2BGR)
            
            # Run OSD
            osd = pytesseract.image_to_osd(open_cv_image)
            
            # Parse OSD output
            # Example: "Rotate: 90\nOrientation in degrees: 90..."
            rotate_angle = 0
            for line in osd.split('\n'):
                if 'Rotate:' in line:
                    rotate_angle = int(line.split(':')[1].strip())
                    break
            
            if rotate_angle in [90, 180, 270]:
                print(f"Detected rotation of {rotate_angle} degrees. Rotating...")
                # Rotate image
                if rotate_angle == 90:
                    image = image.rotate(-90, expand=True) # Counter-clockwise for PIL is clockwise for Tesseract OSD
                elif rotate_angle == 180:
                    image = image.rotate(180, expand=True)
                elif rotate_angle == 270:
                    image = image.rotate(-270, expand=True)
                return image, rotate_angle
            
        except Exception as e:
            print(f"Orientation detection failed: {e}")
            
        return image, 0

    @staticmethod
    def deskew(cv_image: np.ndarray) -> tuple[np.ndarray, float]:
        """
        Straighten/deskew the image using minAreaRect contours.
        Returns: (Deskewed image, skew angle in degrees)
        """
        try:
            gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY) if len(cv_image.shape) == 3 else cv_image
            
            # Threshold the image
            thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
            
            # Find contours
            contours, _ = cv2.findContours(thresh, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
            
            angles = []
            for c in contours:
                area = cv2.contourArea(c)
                if area < 100 or area > 100000:
                    continue
                rect = cv2.minAreaRect(c)
                angle = rect[-1]
                
                # minAreaRect returns angle in [-90, 0)
                if angle < -45:
                    angle = -(90 + angle)
                else:
                    angle = -angle
                angles.append(angle)
            
            if not angles:
                return cv_image, 0.0
                
            median_angle = np.median(angles)
            
            # Ignore tiny skews or extreme angles
            if abs(median_angle) < 0.5 or abs(median_angle) > 15:
                return cv_image, 0.0
                
            (h, w) = cv_image.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
            rotated = cv2.warpAffine(cv_image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
            
            print(f"Deskewing image by {median_angle:.2f} degrees...")
            return rotated, median_angle
        except Exception as e:
            print(f"Deskew failed: {e}")
            return cv_image, 0.0

    @staticmethod
    def preprocess_image(image: Image.Image) -> tuple[Image.Image, int, float]:
        """
        Complete preprocessing flow:
        - EXIF correction
        - Auto rotation correction
        - Deskew
        - Grayscale/CLAHE/Denoise/Sharpen
        - Resize if too large (> 3000px)
        """
        # 1. EXIF correction
        img = ImageProcessor.correct_exif_orientation(image)
        
        # 2. Auto rotation check
        img, rotation_angle = ImageProcessor.detect_and_correct_rotation(img)
        
        # Convert to OpenCV format for CV operations
        cv_img = np.array(img)
        if len(cv_img.shape) == 3 and cv_img.shape[2] == 3:
            cv_img = cv2.cvtColor(cv_img, cv2.COLOR_RGB2BGR)
            
        # 3. Deskew
        cv_img, skew_angle = ImageProcessor.deskew(cv_img)
        
        # 4. Image Enhancement
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY) if len(cv_img.shape) == 3 else cv_img
        
        # CLAHE (Contrast Enhancement)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(enhanced, None, 10, 7, 21)
        
        # Sharpening filter
        kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
        sharpened = cv2.filter2D(denoised, -1, kernel)
        
        # Resize if extremely large
        max_size = 3000
        h, w = sharpened.shape[:2]
        if max(h, w) > max_size:
            scale = max_size / max(h, w)
            new_w = int(w * scale)
            new_h = int(h * scale)
            sharpened = cv2.resize(sharpened, (new_w, new_h), interpolation=cv2.INTER_AREA)
            print(f"Resized image from {w}x{h} to {new_w}x{new_h} due to size limit.")
            
        # Convert back to PIL Image
        processed_pil = Image.fromarray(sharpened)
        
        return processed_pil, rotation_angle, float(skew_angle)

    @staticmethod
    def detect_document_regions(image: Image.Image) -> list[dict]:
        try:
            cv_img = np.array(image)
            if len(cv_img.shape) == 3 and cv_img.shape[2] == 3: cv_img = cv2.cvtColor(cv_img, cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY) if len(cv_img.shape) == 3 else cv_img
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
            dilated = cv2.dilate(thresh, kernel, iterations=2)
            contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            img_h, img_w = gray.shape[:2]
            img_area = img_h * img_w
            regions = []
            for idx, c in enumerate(contours):
                x, y, w, h = cv2.boundingRect(c)
                area = w * h
                if area > (img_area * 0.04) and area < (img_area * 0.98):
                    peri = cv2.arcLength(c, True)
                    approx = cv2.approxPolyDP(c, 0.02 * peri, True)
                    conf = 0.90 if len(approx) == 4 else 0.75
                    regions.append({"box": [int(x), int(y), int(w), int(h)], "confidence": float(conf), "region_id": f"region_{idx}_{uuid.uuid4().hex[:4]}"})
            regions = sorted(regions, key=lambda r: (r["box"][1], r["box"][0]))
            if not regions: regions.append({"box": [0, 0, img_w, img_h], "confidence": 1.0, "region_id": "region_full_0"})
            return regions
        except Exception as e:
            print("Region detection failed:", e)
            return [{"box": [0, 0, image.width, image.height], "confidence": 1.0, "region_id": "region_full_fallback"}]


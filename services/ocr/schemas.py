from pydantic import BaseModel, Field
from typing import List, Optional

class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int

class OCRBlock(BaseModel):
    id: str
    text: str
    confidence: float
    boundingBox: BoundingBox

class OCRPageResult(BaseModel):
    page: int
    rotationDegrees: int
    skewAngle: float = 0.0
    width: Optional[int] = None
    height: Optional[int] = None
    blocks: List[OCRBlock]
    fullText: str
    originalImageBase64: Optional[str] = None
    normalizedImageBase64: Optional[str] = None

class OCRDocumentRegion(BaseModel):
    regionId: str
    boundingBox: BoundingBox
    confidence: float
    croppedImageBase64: str  # PNG format, base64 encoded
    ocrResult: OCRPageResult

class OCRResponse(BaseModel):
    pages: List[OCRPageResult]
    engine: str
    processingTimeMs: int
    detectedRegions: Optional[List[OCRDocumentRegion]] = None

class HealthResponse(BaseModel):
    status: str
    engine: str
    tesseractVersion: Optional[str] = None
    paddleAvailable: bool

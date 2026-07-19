export interface OCRResult {
  rawText: string;
  pages: {
    pageNumber: number;
    text: string;
    rotationDegrees?: number;
    skewAngle?: number;
    width?: number;
    height?: number;
    originalImageBase64?: string;
    normalizedImageBase64?: string;
    blocks?: any[];
  }[];
  confidence: number; // 0 to 1
  engine?: string;
  detectedRegions?: {
    regionId: string;
    boundingBox: { x: number; y: number; width: number; height: number };
    confidence: number;
    croppedImageBase64: string;
    ocrResult: any;
  }[];
}

export interface OCRProvider {
  extractText(fileBuffer: Buffer, mimeType: string): Promise<OCRResult>;
}

export class DemoOCRProvider implements OCRProvider {
  async extractText(fileBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    // Artificial delay to simulate processing
    await new Promise((resolve) => setTimeout(resolve, 1500));

    return {
      rawText: "Demo raw OCR text extracted from the mock document.",
      pages: [
        {
          pageNumber: 1,
          text: "Demo raw OCR text extracted from the mock document."
        }
      ],
      confidence: 0.98
    };
  }
}

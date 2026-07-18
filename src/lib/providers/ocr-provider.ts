export interface OCRResult {
  rawText: string;
  pages: {
    pageNumber: number;
    text: string;
  }[];
  confidence: number; // 0 to 1
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

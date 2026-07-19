"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoOCRProvider = void 0;
class DemoOCRProvider {
    async extractText(fileBuffer, mimeType) {
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
exports.DemoOCRProvider = DemoOCRProvider;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalOCRProvider = void 0;
class LocalOCRProvider {
    constructor() {
        this.baseUrl = process.env.LOCAL_OCR_URL || 'http://127.0.0.1:8001';
    }
    async extractText(fileBuffer, mimeType) {
        // 1. Check health of local OCR service
        try {
            const healthRes = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(2000) });
            if (!healthRes.ok) {
                throw new Error('Health check returned non-200');
            }
        }
        catch (err) {
            const error = new Error('Local OCR service is temporarily unavailable. Please start the service using "npm run ocr:start".');
            error.code = 'LOCAL_OCR_UNAVAILABLE';
            throw error;
        }
        // 2. Perform OCR call
        try {
            const formData = new FormData();
            const fileBlob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
            formData.append('file', fileBlob, 'document_file');
            formData.append('engine', 'paddleocr');
            const response = await fetch(`${this.baseUrl}/ocr`, {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                const errorDetail = await response.text();
                throw new Error(errorDetail || `OCR service responded with status ${response.status}`);
            }
            const ocrResponse = await response.json();
            const pages = ocrResponse.pages.map((p) => ({
                pageNumber: p.page,
                text: p.fullText,
                rotationDegrees: p.rotationDegrees,
                skewAngle: p.skewAngle,
                width: p.width,
                height: p.height,
                originalImageBase64: p.originalImageBase64,
                normalizedImageBase64: p.normalizedImageBase64,
                blocks: p.blocks
            }));
            // Aggregate raw text
            const rawText = pages.map(p => p.text).join('\n\n');
            // Calculate aggregated confidence (average of all page block confidences)
            let totalBlocks = 0;
            let totalConfidenceSum = 0;
            for (const page of ocrResponse.pages) {
                if (page.blocks && page.blocks.length > 0) {
                    totalBlocks += page.blocks.length;
                    totalConfidenceSum += page.blocks.reduce((sum, b) => sum + b.confidence, 0);
                }
            }
            const averageConfidence = totalBlocks > 0 ? (totalConfidenceSum / totalBlocks) : 0.85;
            return {
                rawText,
                pages,
                confidence: Number(averageConfidence.toFixed(3)),
                engine: ocrResponse.engine || 'paddleocr',
                detectedRegions: ocrResponse.detectedRegions
            };
        }
        catch (err) {
            if (err.code === 'LOCAL_OCR_UNAVAILABLE') {
                throw err;
            }
            console.error('Local OCR provider error:', err);
            throw new Error(`Failed to extract text using local OCR: ${err.message}`);
        }
    }
}
exports.LocalOCRProvider = LocalOCRProvider;

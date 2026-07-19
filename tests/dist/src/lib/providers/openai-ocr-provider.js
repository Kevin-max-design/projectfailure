"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIOCRProvider = void 0;
const openai_1 = __importDefault(require("openai"));
class OpenAIOCRProvider {
    constructor() {
        this.openai = new openai_1.default({
            apiKey: process.env.AI_API_KEY || process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        });
        this.model = process.env.AI_MODEL || 'gpt-4o';
    }
    async extractText(fileBuffer, mimeType) {
        var _a, _b;
        if (mimeType === 'application/pdf') {
            try {
                const pdf = require('pdf-parse');
                const data = await pdf(fileBuffer);
                const rawText = data.text || '';
                // Split by form feed (\f) to get pages
                const rawPages = rawText.split('\f');
                const pages = rawPages
                    .map((text, index) => ({
                    pageNumber: index + 1,
                    text: text.trim(),
                }))
                    .filter((p) => p.text.length > 0);
                // If the PDF is scanned (has almost no text)
                if (rawText.replace(/\s/g, '').length < 50) {
                    throw new Error('This PDF appears to be a scanned image with no selectable text. Please upload it as a PNG or JPEG image so our AI can read the text.');
                }
                return {
                    rawText,
                    pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: rawText }],
                    confidence: 0.95
                };
            }
            catch (err) {
                console.error('PDF parsing error:', err);
                throw new Error(err.message || 'Failed to parse text from PDF document.');
            }
        }
        else {
            // It's an image
            const base64Image = fileBuffer.toString('base64');
            const dataUrl = `data:${mimeType};base64,${base64Image}`;
            try {
                const response = await this.openai.chat.completions.create({
                    model: this.model,
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: 'You are an OCR transcription engine. Please read this medical document image and transcribe all of its text content exactly as written. Do not summarize or interpret the medical findings. Only output the transcribed text.'
                                },
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: dataUrl
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens: 4096
                });
                const rawText = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '';
                return {
                    rawText,
                    pages: [
                        {
                            pageNumber: 1,
                            text: rawText
                        }
                    ],
                    confidence: 0.92
                };
            }
            catch (err) {
                console.error('OpenAI vision OCR error:', err);
                throw new Error('AI transcription service timed out or failed to parse the image.');
            }
        }
    }
}
exports.OpenAIOCRProvider = OpenAIOCRProvider;

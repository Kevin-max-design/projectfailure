"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOCRProvider = createOCRProvider;
exports.createExtractionProvider = createExtractionProvider;
exports.createQAProvider = createQAProvider;
const ocr_provider_1 = require("./ocr-provider");
const medical_extraction_provider_1 = require("./medical-extraction-provider");
const question_answering_provider_1 = require("./question-answering-provider");
const local_qa_provider_1 = require("./local-qa-provider");
const openai_ocr_provider_1 = require("./openai-ocr-provider");
const openai_extraction_provider_1 = require("./openai-extraction-provider");
const openai_qa_provider_1 = require("./openai-qa-provider");
const local_ocr_provider_1 = require("./local-ocr-provider");
const local_extraction_provider_1 = require("./local-extraction-provider");
const mode_1 = require("../mode");
function createOCRProvider() {
    if ((0, mode_1.isDemoMode)()) {
        return new ocr_provider_1.DemoOCRProvider();
    }
    const provider = process.env.OCR_PROVIDER || 'local';
    if (provider === 'local') {
        return new local_ocr_provider_1.LocalOCRProvider();
    }
    if (provider === 'openai') {
        const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
        if (!key) {
            throw new Error('API key is missing for OpenAI OCR provider in production mode.');
        }
        return new openai_ocr_provider_1.OpenAIOCRProvider();
    }
    throw new Error(`Unsupported OCR provider: "${provider}" in production mode.`);
}
function createExtractionProvider() {
    if ((0, mode_1.isDemoMode)()) {
        return new medical_extraction_provider_1.DemoMedicalExtractionProvider();
    }
    const provider = process.env.MEDICAL_EXTRACTION_PROVIDER || process.env.AI_PROVIDER || 'local';
    if (provider === 'local') {
        return new local_extraction_provider_1.LocalExtractionProvider();
    }
    if (provider === 'openai') {
        const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
        if (!key) {
            throw new Error('API key is missing for OpenAI Medical Extraction provider in production mode.');
        }
        return new openai_extraction_provider_1.OpenAIExtractionProvider();
    }
    throw new Error(`Unsupported Medical Extraction provider: "${provider}" in production mode.`);
}
function createQAProvider() {
    if ((0, mode_1.isDemoMode)()) {
        return new question_answering_provider_1.DemoQuestionAnsweringProvider();
    }
    const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    if (!key) {
        console.warn('API key is missing for OpenAI Question Answering provider. Falling back to Local QA Provider.');
        return new local_qa_provider_1.LocalQAProvider();
    }
    return new openai_qa_provider_1.OpenAIQAProvider();
}

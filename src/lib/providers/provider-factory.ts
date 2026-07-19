import { OCRProvider, DemoOCRProvider } from './ocr-provider';
import { MedicalExtractionProvider, DemoMedicalExtractionProvider } from './medical-extraction-provider';
import { QuestionAnsweringProvider, DemoQuestionAnsweringProvider } from './question-answering-provider';
import { LocalQAProvider } from './local-qa-provider';
import { OpenAIOCRProvider } from './openai-ocr-provider';
import { OpenAIExtractionProvider } from './openai-extraction-provider';
import { OpenAIQAProvider } from './openai-qa-provider';
import { LocalOCRProvider } from './local-ocr-provider';
import { LocalExtractionProvider } from './local-extraction-provider';
import { isDemoMode } from '../mode';

export function createOCRProvider(): OCRProvider {
  if (isDemoMode()) {
    return new DemoOCRProvider();
  }
  const provider = process.env.OCR_PROVIDER || 'local';
  if (provider === 'local') {
    return new LocalOCRProvider();
  }
  if (provider === 'openai') {
    const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('API key is missing for OpenAI OCR provider in production mode.');
    }
    return new OpenAIOCRProvider();
  }
  throw new Error(`Unsupported OCR provider: "${provider}" in production mode.`);
}

export function createExtractionProvider(): MedicalExtractionProvider {
  if (isDemoMode()) {
    return new DemoMedicalExtractionProvider();
  }
  const provider = process.env.MEDICAL_EXTRACTION_PROVIDER || process.env.AI_PROVIDER || 'local';
  if (provider === 'local') {
    return new LocalExtractionProvider();
  }
  if (provider === 'openai') {
    const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('API key is missing for OpenAI Medical Extraction provider in production mode.');
    }
    return new OpenAIExtractionProvider();
  }
  throw new Error(`Unsupported Medical Extraction provider: "${provider}" in production mode.`);
}

export function createQAProvider(): QuestionAnsweringProvider {
  if (isDemoMode()) {
    return new DemoQuestionAnsweringProvider();
  }
  const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) {
    console.warn('API key is missing for OpenAI Question Answering provider. Falling back to Local QA Provider.');
    return new LocalQAProvider();
  }
  return new OpenAIQAProvider();
}

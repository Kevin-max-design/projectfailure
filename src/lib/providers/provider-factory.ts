import { OCRProvider, DemoOCRProvider } from './ocr-provider';
import { MedicalExtractionProvider, DemoMedicalExtractionProvider } from './medical-extraction-provider';
import { QuestionAnsweringProvider, DemoQuestionAnsweringProvider } from './question-answering-provider';
import { OpenAIOCRProvider } from './openai-ocr-provider';
import { OpenAIExtractionProvider } from './openai-extraction-provider';
import { OpenAIQAProvider } from './openai-qa-provider';
import { isDemoMode } from '../mode';

export function createOCRProvider(): OCRProvider {
  if (isDemoMode()) {
    return new DemoOCRProvider();
  }
  const provider = process.env.OCR_PROVIDER || 'openai';
  if (provider === 'openai') {
    const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    if (!key) {
      console.warn('API key is missing for OpenAI OCR provider. Falling back to DemoOCRProvider.');
      return new DemoOCRProvider();
    }
    return new OpenAIOCRProvider();
  }
  throw new Error(`Unsupported OCR provider: "${provider}" in production mode.`);
}

export function createExtractionProvider(): MedicalExtractionProvider {
  if (isDemoMode()) {
    return new DemoMedicalExtractionProvider();
  }
  const provider = process.env.AI_PROVIDER || 'openai';
  if (provider === 'openai') {
    const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    if (!key) {
      console.warn('API key is missing for OpenAI Medical Extraction provider. Falling back to DemoMedicalExtractionProvider.');
      return new DemoMedicalExtractionProvider();
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
    console.warn('API key is missing for OpenAI Question Answering provider. Falling back to DemoQuestionAnsweringProvider.');
    return new DemoQuestionAnsweringProvider();
  }
  return new OpenAIQAProvider();
}

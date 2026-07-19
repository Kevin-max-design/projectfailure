"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIExtractionProvider = void 0;
const medical_extraction_provider_1 = require("./medical-extraction-provider");
const openai_1 = __importDefault(require("openai"));
class OpenAIExtractionProvider {
    constructor() {
        this.openai = new openai_1.default({
            apiKey: process.env.AI_API_KEY || process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        });
        this.model = process.env.AI_MODEL || 'gpt-4o';
    }
    async extractMedicalData(ocrText, category) {
        var _a, _b;
        const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
        if (!key) {
            throw new Error('API key is missing for OpenAI Medical Extraction provider in production mode. Please add your AI_API_KEY to .env.local.');
        }
        const prompt = `You are a medical-document structuring engine. Your task is STAGE B: convert the provided faithful raw transcription of a medical document (Stage A capture) into structured medical sections.
You are NOT diagnosing the patient. Extract only information explicitly visible or clearly stated in the supplied document text.
Never fill missing information using medical knowledge or assumptions. If a field is not present in the text, assign null.
Preserve the exact original wording in the sourceText fields.
Do not convert absence of information into negative findings (e.g. if there is no allergy info, do not write "no known allergies").

Extract the information into the JSON format matching this schema:
- documentType: Use exactly one of: 'PRESCRIPTION' | 'LAB_REPORT' | 'DISCHARGE_SUMMARY' | 'OP_BILL_RECEIPT' | 'PHARMACY_INVOICE' | 'IMAGING_REPORT' | 'DIAGNOSTIC_ORDER' | 'PROCEDURE_REPORT' | 'MEDICAL_CERTIFICATE' | 'CLINICAL_NOTE' | 'OTHER_MEDICAL_DOCUMENT'. Use 'OTHER_MEDICAL_DOCUMENT' if unsure.
- classificationConfidence: number between 0.0 and 1.0 representing your confidence in the documentType classification
- classificationSource: always set to 'llm'
- documentTitle: { value: string | null, confidence: number, sourceText: string | null, page: number }
- documentDate: { value: string | null, confidence: number, sourceText: string | null, page: number } (Format: YYYY-MM-DD)

- patientDetails: {
    patientNameOnDocument: { value: string | null, confidence: number, sourceText: string | null, page: number },
    age: { value: string | null, confidence: number, sourceText: string | null, page: number },
    gender: { value: string | null, confidence: number, sourceText: string | null, page: number },
    patientIdOrMrn: { value: string | null, confidence: number, sourceText: string | null, page: number }
  }
- encounterDetails: {
    hospitalName: { value: string | null, confidence: number, sourceText: string | null, page: number },
    clinicName: { value: string | null, confidence: number, sourceText: string | null, page: number },
    doctorName: { value: string | null, confidence: number, sourceText: string | null, page: number },
    doctorSpecialization: { value: string | null, confidence: number, sourceText: string | null, page: number },
    admissionDate: { value: string | null, confidence: number, sourceText: string | null, page: number },
    dischargeDate: { value: string | null, confidence: number, sourceText: string | null, page: number },
    visitDate: { value: string | null, confidence: number, sourceText: string | null, page: number }
  }
- clinicalInformation: {
    chiefComplaints: Array of { value: string | null, confidence: number, sourceText: string | null, page: number },
    presentingSymptoms: Array of { value: string | null, confidence: number, sourceText: string | null, page: number },
    historyOfPresentIllness: { value: string | null, confidence: number, sourceText: string | null, page: number },
    pastMedicalHistory: { value: string | null, confidence: number, sourceText: string | null, page: number },
    familyHistory: { value: string | null, confidence: number, sourceText: string | null, page: number },
    provisionalDiagnoses: Array of { value: string | null, confidence: number, sourceText: string | null, page: number },
    finalDiagnoses: Array of { value: string | null, confidence: number, sourceText: string | null, page: number },
    comorbidities: Array of { value: string | null, confidence: number, sourceText: string | null, page: number }
  }
- examination: {
    vitals: {
      bp: { value: string | null, confidence: number, sourceText: string | null, page: number },
      hr: { value: string | null, confidence: number, sourceText: string | null, page: number },
      temp: { value: string | null, confidence: number, sourceText: string | null, page: number },
      rr: { value: string | null, confidence: number, sourceText: string | null, page: number },
      spo2: { value: string | null, confidence: number, sourceText: string | null, page: number }
    },
    generalExamination: { value: string | null, confidence: number, sourceText: string | null, page: number },
    systemicExamination: { value: string | null, confidence: number, sourceText: string | null, page: number },
    clinicalFindings: { value: string | null, confidence: number, sourceText: string | null, page: number }
  }
- investigations: {
    testsOrdered: Array of { value: string | null, confidence: number, sourceText: string | null, page: number },
    imaging: Array of { studyName: string, findings: string | null, impression: string | null, confidence: number, sourceText: string | null, page: number },
    investigationFindings: { value: string | null, confidence: number, sourceText: string | null, page: number }
  }
- treatment: {
    surgeries: Array of { value: string | null, confidence: number, sourceText: string | null, page: number },
    treatmentGiven: { value: string | null, confidence: number, sourceText: string | null, page: number },
    hospitalCourse: { value: string | null, confidence: number, sourceText: string | null, page: number }
  }
- dischargePlan: {
    dietaryAdvice: { value: string | null, confidence: number, sourceText: string | null, page: number },
    activityAdvice: { value: string | null, confidence: number, sourceText: string | null, page: number },
    warningSigns: Array of { value: string | null, confidence: number, sourceText: string | null, page: number },
    referrals: Array of { value: string | null, confidence: number, sourceText: string | null, page: number },
    nextVisit: { value: string | null, confidence: number, sourceText: string | null, page: number }
  }

- diagnoses: Array of { name: string, onsetWeeks: number | null, isChronic: boolean | null, confidence: number, sourceText: string | null, page: number, notes: string | null }
- medications: Array of { medicineName: string, genericName: string | null, strength: string | null, dosage: string | null, route: string | null, frequency: string | null, duration: string | null, instructions: string | null, startDate: string | null, endDate: string | null, reason: string | null, confidence: number, sourceText: string | null, page: number }
- labResults: Array of { testName: string, value: string, unit: string | null, referenceRange: string | null, abnormalFlag: boolean | null, date: string | null, confidence: number, sourceText: string | null, page: number }
- procedures: Array of { name: string, date: string | null, surgeonName: string | null, notes: string | null, confidence: number, sourceText: string | null, page: number }

- allergies: Array of { value: string | null, confidence: number, sourceText: string | null, page: number }
- notes: Array of { value: string | null, confidence: number, sourceText: string | null, page: number }
- certificatesOrRecommendations: Array of { value: string | null, confidence: number, sourceText: string | null, page: number }
- unreadableSections: Array of { description: string, page: number }

All structured values must strictly correspond to what is in the document raw text content below.
If a section is empty or not in the text, do not populate it. Return empty arrays for arrays, or empty sections.

Document raw text content (Stage A Capture):
"""
${ocrText}
"""`;
        try {
            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a highly precise medical extraction API. You output ONLY valid JSON matching the specified schema. Never include codeblock formatting like ```json ... ```.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                response_format: { type: 'json_object' }
            });
            const responseText = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '';
            return await this.parseAndValidate(responseText, ocrText, category);
        }
        catch (err) {
            console.error('OpenAI medical extraction error:', err);
            throw new Error(err.message || 'Failed to extract medical data from text.');
        }
    }
    async parseAndValidate(responseText, ocrText, category) {
        var _a, _b;
        try {
            const parsed = JSON.parse(responseText);
            const validated = medical_extraction_provider_1.MedicalExtractionSchema.parse(parsed);
            return validated;
        }
        catch (err) {
            console.warn('JSON parsing or Zod validation failed. Retrying with repair prompt...', err);
            const repairPrompt = `You recently performed medical extraction, but the JSON output failed Zod validation with these errors:
${err.message || err}

Please correct the JSON payload to strictly match the schema rules:
- All required fields must exist.
- Non-optional nulls/empty arrays should be assigned correctly.
- Ensure confidence fields are numbers (0.0 to 1.0).
- Do not invent any values.
Original raw text:
"""
${ocrText}
"""

Invalid output to repair:
"""
${responseText}
"""`;
            try {
                const repairResponse = await this.openai.chat.completions.create({
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a JSON repair assistant. Output ONLY the corrected valid JSON.'
                        },
                        {
                            role: 'user',
                            content: repairPrompt
                        }
                    ],
                    response_format: { type: 'json_object' }
                });
                const repairedText = ((_b = (_a = repairResponse.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '';
                const parsedRepaired = JSON.parse(repairedText);
                return medical_extraction_provider_1.MedicalExtractionSchema.parse(parsedRepaired);
            }
            catch (repairErr) {
                console.error('Repair attempt also failed:', repairErr);
                throw new Error('Structured medical extraction failed validation. The AI response was malformed.');
            }
        }
    }
}
exports.OpenAIExtractionProvider = OpenAIExtractionProvider;

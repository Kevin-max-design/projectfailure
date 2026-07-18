import { MedicalExtraction, MedicalExtractionProvider, MedicalExtractionSchema } from './medical-extraction-provider';
import { DocumentCategory } from '@/types';
import OpenAI from 'openai';

export class OpenAIExtractionProvider implements MedicalExtractionProvider {
  private openai: OpenAI;
  private model: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.AI_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    });
    this.model = process.env.AI_MODEL || 'gpt-4o';
  }

  async extractMedicalData(ocrText: string, category?: DocumentCategory): Promise<MedicalExtraction> {
    const prompt = `You are a medical-document transcription and structuring engine.
You are NOT diagnosing the patient.
Extract only information explicitly visible or clearly stated in the supplied document text.
Never fill missing information using medical knowledge or assumptions.
Never guess medication dose, frequency, duration, diagnosis, patient name, doctor name, or dates.
If a text field is unclear, return null.
If a section is uncertain, provide a lower confidence score (e.g. 0.30–0.60).
Preserve the exact original wording in the sourceText fields.
Do not convert absence of information into negative findings. For example, if there is no allergy information, return null or empty array, NOT "no known allergies".
Document category suggestion from user is: ${category || 'Auto Detect'}.

Extract the information into the JSON format matching this Zod schema:
- documentType: 'Prescription' | 'Lab Report' | 'Discharge Summary' | 'Imaging Report' | 'Medical Certificate' | 'Vaccination Record' | 'Other' (or 'Auto Detect' if unsure)
- documentTitle: { value: string | null, confidence: number, sourceText: string | null, page: number }
- documentDate: { value: string | null, confidence: number, sourceText: string | null, page: number } (Format: YYYY-MM-DD)
- hospitalName: { value: string | null, confidence: number, sourceText: string | null, page: number }
- doctorName: { value: string | null, confidence: number, sourceText: string | null, page: number }
- doctorSpecialization: { value: string | null, confidence: number, sourceText: string | null, page: number }
- patientNameOnDocument: { value: string | null, confidence: number, sourceText: string | null, page: number }
- patientAgeOnDocument: { value: string | null, confidence: number, sourceText: string | null, page: number }
- diagnoses: Array of { name: string, onsetWeeks: number | null, isChronic: boolean | null, confidence: number, sourceText: string | null, page: number, notes: string | null }
- medications: Array of { medicineName: string, genericName: string | null, strength: string | null, dosage: string | null, route: string | null, frequency: string | null, duration: string | null, instructions: string | null, startDate: string | null, endDate: string | null, reason: string | null, confidence: number, sourceText: string | null, page: number }
- labResults: Array of { testName: string, value: string, unit: string | null, referenceRange: string | null, abnormalFlag: boolean | null, date: string | null, confidence: number, sourceText: string | null, page: number }
- procedures: Array of { name: string, date: string | null, surgeonName: string | null, notes: string | null, confidence: number, sourceText: string | null, page: number }
- unreadableSections: Array of { description: string, page: number }

Document raw text content:
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

      const responseText = response.choices[0]?.message?.content || '';
      return await this.parseAndValidate(responseText, ocrText, category);
    } catch (err: any) {
      console.error('OpenAI medical extraction error:', err);
      throw new Error(err.message || 'Failed to extract medical data from text.');
    }
  }

  private async parseAndValidate(responseText: string, ocrText: string, category?: DocumentCategory): Promise<MedicalExtraction> {
    try {
      const parsed = JSON.parse(responseText);
      const validated = MedicalExtractionSchema.parse(parsed);
      return validated;
    } catch (err: any) {
      console.warn('JSON parsing or Zod validation failed. Retrying with repair prompt...', err);
      // Run repair prompt
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

        const repairedText = repairResponse.choices[0]?.message?.content || '';
        const parsedRepaired = JSON.parse(repairedText);
        return MedicalExtractionSchema.parse(parsedRepaired);
      } catch (repairErr: any) {
        console.error('Repair attempt also failed:', repairErr);
        throw new Error('Structured medical extraction failed validation. The AI response was malformed.');
      }
    }
  }
}

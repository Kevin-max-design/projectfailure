import { z } from 'zod';
import OpenAI from 'openai';
import { RelevantHistoryResult } from '../services/medical-context-service';

export const DoctorBriefSchema = z.object({
  patientSummary: z.string(),
  currentReason: z.object({
    category: z.string(),
    onset: z.string(),
    severity: z.string(),
    location: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    symptoms: z.array(z.string())
  }),
  relevantHistory: z.array(z.object({
    title: z.string(),
    date: z.string(),
    details: z.string(),
    relevanceExplanation: z.string(),
    sourceDocumentId: z.string().nullable().optional(),
    sourcePage: z.number().nullable().optional(),
    sourceText: z.string().nullable().optional()
  })),
  currentMedications: z.array(z.object({
    name: z.string(),
    details: z.string(),
    provenance: z.enum(['verified', 'patient-reported', 'patient-entered'])
  })),
  allergies: z.array(z.object({
    name: z.string(),
    provenance: z.enum(['verified', 'patient-reported', 'patient-entered'])
  })),
  relevantInvestigations: z.array(z.object({
    title: z.string(),
    date: z.string(),
    details: z.string(),
    sourceDocumentId: z.string().nullable().optional()
  })),
  limitations: z.string()
});

export type DoctorBrief = z.infer<typeof DoctorBriefSchema>;

export class DoctorBriefProvider {
  private openai?: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey: apiKey,
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      });
    }
    this.model = process.env.AI_MODEL || 'gpt-4o';
  }

  /**
   * Generates a Doctor Brief snapshot.
   * If AI is configured and keys are present, uses GPT to summarize Patient Summary,
   * otherwise falls back to the deterministic layout immediately.
   */
  async generateBrief(
    patientName: string,
    patientAge: number,
    patientDob: string,
    intakeContext: any,
    retrievedHistory: RelevantHistoryResult
  ): Promise<DoctorBrief> {
    
    // Determine fallback content first
    const fallbackBrief = this.generateDeterministicFallback(intakeContext, retrievedHistory);

    if (!this.openai) {
      return fallbackBrief;
    }

    try {
      const prompt = `
You are a medical brief generation engine. Your job is to summarize patient-reported symptoms and organize their relevant medical history into a structured Doctor Brief.
You MUST strictly adhere to the following safety rules:
1. DO NOT diagnose the patient's current symptoms.
2. DO NOT recommend treatments, medications, or tests.
3. DO NOT claim that a past condition is causing the current symptom (e.g. "This pain is likely pancreatitis"). Keep explanations descriptive of context relevance only.
4. DO NOT make statements of clinical certainty.
5. All allergy information or chronic condition statements must show correct provenance.
6. The "patientSummary" field should be a neutral, concise 1-2 sentence overview of the patient reported issue and why they are seeking help.

Patient Info:
- Name: ${patientName}
- Age: ${patientAge}
- DOB: ${patientDob}

Current Patient-Reported Complaint:
- Category: ${intakeContext.reason_category}
- Location: ${intakeContext.problem_location || 'Not specified'}
- Onset: ${intakeContext.onset}
- Severity: ${intakeContext.severity}
- Symptoms: ${intakeContext.selected_symptoms?.join(', ') || 'None selected'}
- Description: ${intakeContext.patient_description || 'None provided'}

Retrieved Relevant History & Meds:
${JSON.stringify(retrievedHistory, null, 2)}

Output a valid JSON object matching this schema:
{
  "patientSummary": "string summarising current situation",
  "currentReason": {
    "category": "string",
    "onset": "string",
    "severity": "string",
    "location": "string or null",
    "description": "string or null",
    "symptoms": ["string"]
  },
  "relevantHistory": [
    {
      "title": "string",
      "date": "string",
      "details": "string",
      "relevanceExplanation": "string explaining connection neutrals",
      "sourceDocumentId": "string or null",
      "sourcePage": number or null,
      "sourceText": "string or null"
    }
  ],
  "currentMedications": [
    {
      "name": "string",
      "details": "string",
      "provenance": "verified" | "patient-reported" | "patient-entered"
    }
  ],
  "allergies": [
    {
      "name": "string",
      "provenance": "verified" | "patient-reported" | "patient-entered"
    }
  ],
  "relevantInvestigations": [
    {
      "title": "string",
      "date": "string",
      "details": "string",
      "sourceDocumentId": "string or null"
    }
  ],
  "limitations": "disclaimer message"
}
`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      const jsonText = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(jsonText);

      // Zod validation check
      const validation = DoctorBriefSchema.safeParse(parsed);
      if (!validation.success) {
        console.warn('AI brief did not validate, falling back:', validation.error);
        return fallbackBrief;
      }

      // Check if AI tried to insert diagnoses or treatments
      const contentStr = jsonText.toLowerCase();
      if (
        contentStr.includes('recommend') ||
        contentStr.includes('prescribe') ||
        contentStr.includes('cause of your') ||
        contentStr.includes('diagnose')
      ) {
        console.warn('AI brief contained restricted diagnostic language, falling back.');
        return fallbackBrief;
      }

      return validation.data;
    } catch (error) {
      console.error('Error generating AI brief, falling back:', error);
      return fallbackBrief;
    }
  }

  /**
   * Safe, 100% deterministic template formatter.
   */
  private generateDeterministicFallback(intakeContext: any, retrievedHistory: RelevantHistoryResult): DoctorBrief {
    const relevantHistory = retrievedHistory.records
      .filter(r => r.type === 'diagnosis' || r.type === 'procedure')
      .map(r => ({
        title: r.title,
        date: r.date,
        details: r.details,
        relevanceExplanation: r.relevanceExplanation,
        sourceDocumentId: r.sourceDocumentId || null,
        sourcePage: r.sourcePage || null,
        sourceText: r.sourceText || null
      }));

    const currentMedications = retrievedHistory.records
      .filter(r => r.type === 'medication')
      .map(r => ({
        name: r.title,
        details: r.details,
        provenance: 'verified' as const
      }));

    const relevantInvestigations = retrievedHistory.records
      .filter(r => r.type === 'lab_result')
      .map(r => ({
        title: r.title,
        date: r.date,
        details: r.details,
        sourceDocumentId: r.sourceDocumentId || null
      }));

    // Wording rules enforcement
    const allergiesList = retrievedHistory.allergies.length > 0
      ? retrievedHistory.allergies.map(a => ({
          name: a.name,
          provenance: a.provenance as 'verified' | 'patient-reported' | 'patient-entered'
        }))
      : [];

    const severityStr = String(intakeContext.severity);

    return {
      patientSummary: `Patient presents with self-reported ${intakeContext.reason_category} starting ${intakeContext.onset} (${intakeContext.selected_symptoms?.join(', ') || 'no associated symptoms selected'}).`,
      currentReason: {
        category: intakeContext.reason_category,
        onset: intakeContext.onset,
        severity: severityStr,
        location: intakeContext.problem_location || null,
        description: intakeContext.patient_description || null,
        symptoms: intakeContext.selected_symptoms || []
      },
      relevantHistory,
      currentMedications,
      allergies: allergiesList,
      relevantInvestigations,
      limitations: 'This brief summarizes information available in the patient’s MedMemory records and patient-reported information. It may not represent the patient’s complete medical history.'
    };
  }
}

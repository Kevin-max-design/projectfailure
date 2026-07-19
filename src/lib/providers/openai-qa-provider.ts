import { QuestionAnsweringProvider, QAAnswer, Citation } from './question-answering-provider';
import OpenAI from 'openai';

export class OpenAIQAProvider implements QuestionAnsweringProvider {
  private openai: OpenAI;
  private model: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.AI_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    });
    this.model = process.env.AI_MODEL || 'gpt-4o';
  }

  async askQuestion(
    question: string,
    patientId: string,
    contextChunks: { text: string; documentId: string; documentTitle: string; pageNumber: number; date: string }[],
    structuredRecords: any[],
    compressedMemory?: string,
    copilotContext?: any
  ): Promise<QAAnswer> {
    
    // Build context prompt
    const chunkContext = contextChunks
      .map(
        (chunk, idx) =>
          `[Document Citation ID: ${idx}]
Title: ${chunk.documentTitle} (Page: ${chunk.pageNumber}, Date: ${chunk.date || 'N/A'})
Text Snippet:
"""
${chunk.text}
"""`
      )
      .join('\n\n');

    const recordsContext = structuredRecords
      .map((record) => {
        if (record.type === 'diagnosis') {
          return `- Diagnosis: ${record.name} (Onset: ${record.onset_weeks || 'N/A'} weeks, Chronic: ${record.is_chronic || 'N/A'}, Notes: ${record.notes || 'N/A'}, Verification: ${record.verification_status})`;
        } else if (record.type === 'medication') {
          return `- Medication: ${record.medicine_name} (Generic: ${record.generic_name || 'N/A'}, Strength: ${record.strength || 'N/A'}, Dose: ${record.dosage || 'N/A'}, Frequency: ${record.frequency || 'N/A'}, Duration: ${record.duration || 'N/A'}, Verification: ${record.verification_status})`;
        } else if (record.type === 'lab_result') {
          return `- Lab Result: ${record.test_name} = ${record.value} ${record.unit || ''} (Range: ${record.reference_range || 'N/A'}, Abnormal: ${record.abnormal_flag || 'N/A'}, Date: ${record.test_date || 'N/A'}, Verification: ${record.verification_status})`;
        } else if (record.type === 'procedure') {
          return `- Procedure: ${record.name} (Date: ${record.date || 'N/A'}, Notes: ${record.notes || 'N/A'}, Verification: ${record.verification_status})`;
        }
        return `- Record: ${record.title} (${record.record_type})`;
      })
      .join('\n');

    // Format Copilot intelligence (Lab panels, journeys, med switches) if provided
    let copilotContextString = '';
    if (copilotContext) {
      if (copilotContext.panels) {
        copilotContextString += '\n[LABORATORY PANELS & STATISTICS]\n' + JSON.stringify(copilotContext.panels, null, 2) + '\n';
      }
      if (copilotContext.switches) {
        copilotContextString += '\n[MEDICATION TIMELINE & THERAPEUTIC SWITCHES]\n' + JSON.stringify(copilotContext.switches, null, 2) + '\n';
      }
      if (copilotContext.journeys) {
        copilotContextString += '\n[DISEASE JOURNEY TIMELINES]\n' + JSON.stringify(copilotContext.journeys, null, 2) + '\n';
      }
    }

    const prompt = `You are a precise medical assistant chatbot and Physician Copilot.
Your goal is to answer the physician's or patient's questions about their medical records.

CRITICAL SAFETY RULE: You are not a doctor. You must NEVER formulate clinical diagnoses, suggest treatments, prescribe medications, or state causation of symptoms. Keep all explanations strictly objective.
CRITICAL EVIDENCE RULE: Answer the question ONLY based on the provided document text chunks, patient memory, lab panels, medication switches, and structured medical records below. Do not assume or invent details.
If the context does not contain evidence to answer the question, or if a user asks about a condition not documented in their records (e.g., "Do I have kidney disease?"), you MUST reply:
"I couldn't find a verified record documenting [condition] in the records currently available." (replace [condition] with the disease or concern they asked about).

Patient Compact Memory:
${compressedMemory || 'No patient compact memory available.'}

Context - Lab Panels, Journeys, and Medication Switches:
${copilotContextString || 'No longitudinal copilot intelligence available.'}

Context - Uploaded Document Text Chunks:
${chunkContext || 'No raw document text available.'}

Context - Structured Medical Records:
${recordsContext || 'No structured records available.'}

Patient Question: "${question}"

Provide your answer. Your answer must include citations pointing to the specific Document Citation IDs (e.g. "[Document Citation ID: 0]") when referencing document contents.
Format your final output as a JSON object matching this schema:
{
  "answer": "Your detailed textual answer...",
  "citations": [
    {
      "documentId": "the Document Citation ID matching the chunk used (e.g., '0' or '1')",
      "documentTitle": "the title of the document matching the chunk used",
      "pageNumber": page number (integer),
      "date": "document date (YYYY-MM-DD)",
      "snippet": "the exact text snippet from the document that verifies this fact"
    }
  ]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a precise citation-backed medical QA engine. Output ONLY a valid JSON object matching the requested schema.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' }
      });

      const responseText = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(responseText);

      // Clean/validate citations array
      const citations: Citation[] = (parsed.citations || []).map((cit: any, idx: number) => {
        // Fallback to match with context chunk
        const docIdx = parseInt(cit.documentId);
        const matchingChunk = !isNaN(docIdx) && contextChunks[docIdx] ? contextChunks[docIdx] : null;

        return {
          documentId: matchingChunk ? matchingChunk.documentId : (cit.documentId || `doc-${idx}`),
          documentTitle: matchingChunk ? matchingChunk.documentTitle : (cit.documentTitle || 'Medical Document'),
          pageNumber: matchingChunk ? matchingChunk.pageNumber : (cit.pageNumber || 1),
          date: matchingChunk ? matchingChunk.date : (cit.date || ''),
          snippet: cit.snippet || ''
        };
      });

      return {
        answer: parsed.answer || "I couldn't find that information in your uploaded records.",
        citations
      };
    } catch (err: any) {
      console.error('RAG QA OpenAI error:', err);
      return {
        answer: "Failed to query the AI assistant. Please configure your OpenAI API key or try again later.",
        citations: []
      };
    }
  }
}

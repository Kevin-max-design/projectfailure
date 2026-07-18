import { QAAnswer, DemoQuestionAnsweringProvider } from '../providers/question-answering-provider';
import { mockDb } from '../supabase/service';

export class RAGEngine {
  private qaProvider: DemoQuestionAnsweringProvider;

  constructor() {
    this.qaProvider = new DemoQuestionAnsweringProvider();
  }

  /**
   * Ask My Records - Retrieval Augmented Generation
   * 1. Fetches all medical records for the specific patient (strictly filtered by patientId).
   * 2. Fetches matching chunks from document_chunks (simulated vector / text search).
   * 3. Combines structured + unstructured context.
   * 4. Queries QA Provider to build safe, citation-backed answer.
   */
  async answerPatientQuestion(patientId: string, question: string): Promise<QAAnswer> {
    // Browser Mock DB RAG logic
    const diagnoses = mockDb.query('diagnoses').select().eq('patient_id', patientId).data || [];
    const medications = mockDb.query('medications').select().eq('patient_id', patientId).data || [];
    const labResults = mockDb.query('lab_results').select().eq('patient_id', patientId).data || [];
    const procedures = mockDb.query('procedures').select().eq('patient_id', patientId).data || [];

    const structuredRecords = [
      ...diagnoses.map(d => ({ type: 'diagnosis', ...d })),
      ...medications.map(m => ({ type: 'medication', ...m })),
      ...labResults.map(l => ({ type: 'lab_result', ...l })),
      ...procedures.map(p => ({ type: 'procedure', ...p }))
    ];

    const pages = mockDb.query('document_pages').select().data || [];
    const contextChunks = pages.map((p: any) => ({
      text: p.ocr_text || '',
      documentId: p.document_id,
      documentTitle: 'Medical Record',
      pageNumber: p.page_number,
      date: ''
    }));

    const answerResult = await this.qaProvider.askQuestion(
      question,
      patientId,
      contextChunks,
      structuredRecords
    );

    mockDb.query('activity_logs').insert({
      patient_id: patientId,
      action: 'rag_query_submitted',
      metadata: {
        question: question,
        citationCount: answerResult.citations.length
      }
    });

    return answerResult;
  }
}

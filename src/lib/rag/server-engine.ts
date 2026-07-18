import { createAdminClient } from '../supabase/server';
import { QAAnswer, DemoQuestionAnsweringProvider } from '../providers/question-answering-provider';

export class ServerRAGEngine {
  private qaProvider: DemoQuestionAnsweringProvider;

  constructor() {
    this.qaProvider = new DemoQuestionAnsweringProvider();
  }

  async answerPatientQuestion(patientId: string, question: string): Promise<QAAnswer> {
    const supabase = createAdminClient();

    // STRICT USER ISOLATION
    const { data: diagnoses } = await supabase
      .from('diagnoses')
      .select('name, notes, onset_weeks, is_chronic, verification_status')
      .eq('patient_id', patientId);

    const { data: medications } = await supabase
      .from('medications')
      .select('medicine_name, generic_name, strength, dosage, frequency, route, duration, verification_status')
      .eq('patient_id', patientId);

    const { data: labResults } = await supabase
      .from('lab_results')
      .select('test_name, value, unit, reference_range, abnormal_flag, test_date, verification_status')
      .eq('patient_id', patientId);

    const { data: procedures } = await supabase
      .from('procedures')
      .select('name, date, notes, verification_status')
      .eq('patient_id', patientId);

    const { data: pages } = await supabase
      .from('document_pages')
      .select('*, documents(file_name, category)')
      .eq('documents.patient_id', patientId);

    const structuredRecords: any[] = [];
    if (diagnoses) structuredRecords.push(...diagnoses.map((d: any) => ({ type: 'diagnosis', ...d })));
    if (medications) structuredRecords.push(...medications.map((m: any) => ({ type: 'medication', ...m })));
    if (labResults) structuredRecords.push(...labResults.map((l: any) => ({ type: 'lab_result', ...l })));
    if (procedures) structuredRecords.push(...procedures.map((p: any) => ({ type: 'procedure', ...p })));

    const contextChunks: { text: string; documentId: string; documentTitle: string; pageNumber: number; date: string }[] = [];
    if (pages) {
      for (const page of pages) {
        const doc = page.documents as any;
        if (doc) {
          contextChunks.push({
            text: page.ocr_text || '',
            documentId: page.document_id,
            documentTitle: doc.file_name || 'Medical Record',
            pageNumber: page.page_number,
            date: ''
          });
        }
      }
    }

    const answerResult = await this.qaProvider.askQuestion(
      question,
      patientId,
      contextChunks,
      structuredRecords
    );

    await supabase.from('activity_logs').insert({
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

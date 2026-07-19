"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAGEngine = void 0;
const question_answering_provider_1 = require("../providers/question-answering-provider");
const service_1 = require("../supabase/service");
class RAGEngine {
    constructor() {
        this.qaProvider = new question_answering_provider_1.DemoQuestionAnsweringProvider();
    }
    /**
     * Ask My Records - Retrieval Augmented Generation
     * 1. Fetches all medical records for the specific patient (strictly filtered by patientId).
     * 2. Fetches matching chunks from document_chunks (simulated vector / text search).
     * 3. Combines structured + unstructured context.
     * 4. Queries QA Provider to build safe, citation-backed answer.
     */
    async answerPatientQuestion(patientId, question) {
        // Browser Mock DB RAG logic
        const diagnoses = service_1.mockDb.query('diagnoses').select().eq('patient_id', patientId).data || [];
        const medications = service_1.mockDb.query('medications').select().eq('patient_id', patientId).data || [];
        const labResults = service_1.mockDb.query('lab_results').select().eq('patient_id', patientId).data || [];
        const procedures = service_1.mockDb.query('procedures').select().eq('patient_id', patientId).data || [];
        const structuredRecords = [
            ...diagnoses.map(d => (Object.assign({ type: 'diagnosis' }, d))),
            ...medications.map(m => (Object.assign({ type: 'medication' }, m))),
            ...labResults.map(l => (Object.assign({ type: 'lab_result' }, l))),
            ...procedures.map(p => (Object.assign({ type: 'procedure' }, p)))
        ];
        const pages = service_1.mockDb.query('document_pages').select().data || [];
        const contextChunks = pages.map((p) => ({
            text: p.ocr_text || '',
            documentId: p.document_id,
            documentTitle: 'Medical Record',
            pageNumber: p.page_number,
            date: ''
        }));
        const answerResult = await this.qaProvider.askQuestion(question, patientId, contextChunks, structuredRecords);
        service_1.mockDb.query('activity_logs').insert({
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
exports.RAGEngine = RAGEngine;

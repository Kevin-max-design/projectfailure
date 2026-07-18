import { Document, VerificationStatus } from '@/types';
import { OCRProvider } from '../providers/ocr-provider';
import { MedicalExtractionProvider, MedicalExtraction } from '../providers/medical-extraction-provider';
import { createOCRProvider, createExtractionProvider } from '../providers/provider-factory';

export interface PipelineOptions {
  demoMode?: boolean;
}

export class DocumentProcessingPipeline {
  private ocrProvider: OCRProvider;
  private extractionProvider: MedicalExtractionProvider;

  constructor(options?: PipelineOptions) {
    this.ocrProvider = createOCRProvider();
    this.extractionProvider = createExtractionProvider();
  }

  /**
   * Process an uploaded document end-to-end:
   * 1. Update status to 'preprocessing' -> 'ocr_processing' -> 'extracting' -> 'awaiting_review'
   * 2. Perform OCR
   * 3. Perform AI Extraction
   * 4. Save Raw Extraction (Layer 2)
   * 5. Pre-populate Medical Records & Entities (Layer 3, pending verification)
   */
  async processDocument(
    documentId: string,
    fileBuffer: Buffer,
    mimeType: string,
    supabase: any
  ): Promise<MedicalExtraction> {
    try {
      // 1. Preprocessing
      await this.updateStatus(supabase, documentId, 'preprocessing');

      // 2. OCR Processing
      await this.updateStatus(supabase, documentId, 'ocr_processing');
      const ocrResult = await this.ocrProvider.extractText(fileBuffer, mimeType);

      // Save OCR pages
      for (const page of ocrResult.pages) {
        await supabase.from('document_pages').insert({
          document_id: documentId,
          page_number: page.pageNumber,
          ocr_text: page.text
        });
      }

      // 3. Extraction
      await this.updateStatus(supabase, documentId, 'extracting');
      
      // Retrieve document metadata
      const { data: docData } = await supabase
        .from('documents')
        .select('category, patient_id')
        .eq('id', documentId)
        .single();

      const patientId = docData?.patient_id;
      const category = docData?.category || 'Auto Detect';

      const extraction = await this.extractionProvider.extractMedicalData(ocrResult.rawText, category);

      // 4. Save Raw Extraction (Layer 2 - Immutable AI Output)
      await supabase.from('raw_extractions').insert({
        document_id: documentId,
        patient_id: patientId,
        raw_payload: extraction,
        extraction_method: process.env.NEXT_PUBLIC_MEDMEMORY_MODE === 'demo' ? 'demo' : 'ai_openai'
      });

      // Save to Extraction Versions
      await supabase.from('extraction_versions').insert({
        document_id: documentId,
        patient_id: patientId,
        version_number: 1,
        raw_payload: extraction,
        extraction_method: process.env.NEXT_PUBLIC_MEDMEMORY_MODE === 'demo' ? 'demo' : 'ai_openai',
        provider: process.env.NEXT_PUBLIC_MEDMEMORY_MODE === 'demo' ? 'demo' : 'openai',
        model: process.env.NEXT_PUBLIC_MEDMEMORY_MODE === 'demo' ? 'demo' : (process.env.AI_MODEL || 'gpt-4o')
      });

      // Save Document Chunks (RAG Indexing)
      const maxChunkLength = 1000;
      for (const page of ocrResult.pages) {
        const text = page.text || '';
        // Simple chunking logic: split by sentences or paragraphs up to maxChunkLength
        const chunks = this.chunkText(text, maxChunkLength);
        for (const chunkText of chunks) {
          await supabase.from('document_chunks').insert({
            patient_id: patientId,
            document_id: documentId,
            page_number: page.pageNumber,
            chunk_text: chunkText,
            metadata: {
              document_title: extraction.documentTitle.value || 'Medical Record',
              date: extraction.documentDate.value || ''
            }
          });
        }
      }

      // 5. Pre-populate Medical Records (Layer 3 - pending review)
      // Diagnoses
      if (extraction.diagnoses && extraction.diagnoses.length > 0) {
        for (const dx of extraction.diagnoses) {
          const { data: record } = await supabase
            .from('medical_records')
            .insert({
              patient_id: patientId,
              document_id: documentId,
              record_type: 'diagnosis',
              title: dx.name,
              event_date: extraction.documentDate.value || new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

          if (record) {
            await supabase.from('diagnoses').insert({
              patient_id: patientId,
              record_id: record.id,
              name: dx.name,
              onset_weeks: dx.onsetWeeks,
              is_chronic: dx.isChronic,
              notes: dx.notes,
              source_document_id: documentId,
              source_page: dx.page || 1,
              source_text: dx.sourceText,
              extraction_method: process.env.NEXT_PUBLIC_MEDMEMORY_MODE === 'demo' ? 'demo' : 'ai_openai',
              confidence_score: dx.confidence,
              verification_status: this.getInitialVerificationStatus(dx.confidence)
            });
          }
        }
      }

      // Medications
      if (extraction.medications && extraction.medications.length > 0) {
        for (const med of extraction.medications) {
          const { data: record } = await supabase
            .from('medical_records')
            .insert({
              patient_id: patientId,
              document_id: documentId,
              record_type: 'medication',
              title: med.medicineName,
              event_date: extraction.documentDate.value || new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

          if (record) {
            await supabase.from('medications').insert({
              patient_id: patientId,
              record_id: record.id,
              medicine_name: med.medicineName,
              generic_name: med.genericName,
              strength: med.strength,
              dosage: med.dosage,
              route: med.route,
              frequency: med.frequency,
              duration: med.duration,
              instructions: med.instructions,
              start_date: med.startDate,
              end_date: med.endDate,
              reason: med.reason,
              source_document_id: documentId,
              source_page: med.page || 1,
              source_text: med.sourceText,
              extraction_method: process.env.NEXT_PUBLIC_MEDMEMORY_MODE === 'demo' ? 'demo' : 'ai_openai',
              confidence_score: med.confidence,
              verification_status: this.getInitialVerificationStatus(med.confidence)
            });
          }
        }
      }

      // Lab Results
      if (extraction.labResults && extraction.labResults.length > 0) {
        for (const lab of extraction.labResults) {
          const { data: record } = await supabase
            .from('medical_records')
            .insert({
              patient_id: patientId,
              document_id: documentId,
              record_type: 'lab_result',
              title: lab.testName,
              event_date: lab.date || extraction.documentDate.value || new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

          if (record) {
            await supabase.from('lab_results').insert({
              patient_id: patientId,
              record_id: record.id,
              test_name: lab.testName,
              value: lab.value,
              unit: lab.unit,
              reference_range: lab.referenceRange,
              abnormal_flag: lab.abnormalFlag,
              test_date: lab.date || extraction.documentDate.value || new Date().toISOString().split('T')[0],
              source_document_id: documentId,
              source_page: lab.page || 1,
              source_text: lab.sourceText,
              extraction_method: process.env.NEXT_PUBLIC_MEDMEMORY_MODE === 'demo' ? 'demo' : 'ai_openai',
              confidence_score: lab.confidence,
              verification_status: this.getInitialVerificationStatus(lab.confidence)
            });
          }
        }
      }

      // Procedures
      if (extraction.procedures && extraction.procedures.length > 0) {
        for (const proc of extraction.procedures) {
          const { data: record } = await supabase
            .from('medical_records')
            .insert({
              patient_id: patientId,
              document_id: documentId,
              record_type: 'procedure',
              title: proc.name,
              event_date: proc.date || extraction.documentDate.value || new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

          if (record) {
            await supabase.from('procedures').insert({
              patient_id: patientId,
              record_id: record.id,
              name: proc.name,
              date: proc.date || extraction.documentDate.value || new Date().toISOString().split('T')[0],
              surgeon_name: proc.surgeonName,
              notes: proc.notes,
              source_document_id: documentId,
              source_page: proc.page || 1,
              source_text: proc.sourceText,
              extraction_method: process.env.NEXT_PUBLIC_MEDMEMORY_MODE === 'demo' ? 'demo' : 'ai_openai',
              confidence_score: proc.confidence,
              verification_status: this.getInitialVerificationStatus(proc.confidence)
            });
          }
        }
      }

      // 6. Complete status updates
      await this.updateStatus(supabase, documentId, 'awaiting_review');

      // Create timeline events (initially marked pending review)
      await this.createUnverifiedTimelineEvents(supabase, documentId, patientId, extraction);

      return extraction;
    } catch (error: any) {
      console.error('Error in document processing pipeline:', error);
      await this.updateStatus(supabase, documentId, 'failed', error.message || 'Unknown processing error');
      throw error;
    }
  }

  private async updateStatus(supabase: any, documentId: string, status: Document['processingStatus'], errorMessage?: string) {
    const updatePayload: Record<string, any> = {
      processing_status: status,
      updated_at: new Date().toISOString()
    };
    if (errorMessage) {
      updatePayload.error_message = errorMessage;
    }
    await supabase
      .from('documents')
      .update(updatePayload)
      .eq('id', documentId);
  }

  private getInitialVerificationStatus(confidence: number): VerificationStatus {
    return 'pending_review';
  }

  private chunkText(text: string, maxLen: number): string[] {
    const paragraphs = text.split('\n');
    const result: string[] = [];
    let currentChunk = '';

    for (const para of paragraphs) {
      if ((currentChunk + '\n' + para).length > maxLen) {
        if (currentChunk.trim()) result.push(currentChunk.trim());
        currentChunk = para;
      } else {
        currentChunk += (currentChunk ? '\n' : '') + para;
      }
    }
    if (currentChunk.trim()) {
      result.push(currentChunk.trim());
    }
    return result;
  }

  private async createUnverifiedTimelineEvents(supabase: any, documentId: string, patientId: string, extraction: MedicalExtraction) {
    const eventDate = extraction.documentDate.value || new Date().toISOString().split('T')[0];

    let eventType: 'Hospital Admission' | 'Doctor Visit' | 'Prescription' | 'Lab Test' = 'Doctor Visit';
    if (extraction.documentType === 'Discharge Summary') {
      eventType = 'Hospital Admission';
    } else if (extraction.documentType === 'Prescription') {
      eventType = 'Prescription';
    } else if (extraction.documentType === 'Lab Report') {
      eventType = 'Lab Test';
    }

    await supabase.from('medical_events').insert({
      patient_id: patientId,
      event_date: eventDate,
      event_type: eventType,
      title: extraction.documentTitle.value || `Medical Record Upload`,
      hospital_name: extraction.hospitalName.value,
      doctor_name: extraction.doctorName.value,
      summary: `Document processed. Contains ${extraction.diagnoses?.length || 0} diagnoses, ${extraction.medications?.length || 0} medications, and ${extraction.labResults?.length || 0} lab results.`,
      source_document_id: documentId,
      verification_status: 'pending_review'
    });
  }
}

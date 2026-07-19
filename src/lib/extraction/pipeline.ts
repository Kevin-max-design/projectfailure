import { Document, VerificationStatus } from '@/types';
import { OCRProvider } from '../providers/ocr-provider';
import { MedicalExtractionProvider, MedicalExtraction } from '../providers/medical-extraction-provider';
import { createOCRProvider, createExtractionProvider } from '../providers/provider-factory';
import { isDemoMode } from '../mode';
import { DocumentClassifier } from './classifier';
import { SpecializedExtractors } from './extractors';
import { DeterministicValidator } from './validator';

// Ontology hybrid intelligence imports
import { DeterministicMedicalClassifier } from '../medical/classifier/deterministic-classifier';
import { OntologyExtractors } from '../medical/extractor/ontology-extractors';
import { OntologyValidators } from '../medical/validator/ontology-validators';

export interface PipelineOptions {
  demoMode?: boolean;
}

export class DocumentProcessingPipeline {
  private ocrProvider: OCRProvider;
  private extractionProvider: MedicalExtractionProvider;
  private classifier: DocumentClassifier;
  private extractors: SpecializedExtractors;
  private validator: DeterministicValidator;
  
  // New ontology components
  private deterministicClassifier: DeterministicMedicalClassifier;
  private ontologyExtractors: OntologyExtractors;
  private ontologyValidators: OntologyValidators;

  constructor(options?: PipelineOptions) {
    this.ocrProvider = createOCRProvider();
    this.extractionProvider = createExtractionProvider();
    this.classifier = new DocumentClassifier();
    this.extractors = new SpecializedExtractors();
    this.validator = new DeterministicValidator();
    
    // New ontology components
    this.deterministicClassifier = new DeterministicMedicalClassifier();
    this.ontologyExtractors = new OntologyExtractors();
    this.ontologyValidators = new OntologyValidators();
  }

  public getExtractionMethod(): string {
    if (isDemoMode()) return 'demo';
    const provider = process.env.MEDICAL_EXTRACTION_PROVIDER || process.env.AI_PROVIDER || 'local';
    return provider === 'local' ? 'local_deterministic' : 'ai_openai';
  }

  public getProviderName(): string {
    if (isDemoMode()) return 'demo';
    return process.env.MEDICAL_EXTRACTION_PROVIDER || process.env.AI_PROVIDER || 'local';
  }

  public getModelName(): string {
    if (isDemoMode()) return 'demo';
    if (this.getProviderName() === 'local') {
      return process.env.LOCAL_LLM_MODEL || 'deterministic_rules';
    }
    return process.env.AI_MODEL || 'gpt-4o';
  }

  /**
   * Process an uploaded document end-to-end:
   * STAGE A: Faithful Document Capture
   * - EXIF correction and auto-rotation detection
   * - Image page-level rotation normalization using sharp (cloud) or local python service
   * - Raw OCR transcription page-by-page stored in document_pages
   * STAGE B: Medical Structuring
   * - Structured medical extraction mapping to expanded Zod schema
   * - Deterministic coverage metrics calculation in application code
   * - Preservation of unmapped content under unmappedDocumentedInformation
   * - Persistence of raw payload & pre-populating relational tables
   */
  async processDocument(
    documentId: string,
    fileBuffer: Buffer,
    mimeType: string,
    supabase: any,
    bypassSplit = false
  ): Promise<MedicalExtraction> {
    try {
      // Retrieve document metadata to find patientId and original filename
      const { data: docData } = await supabase
        .from('documents')
        .select('category, patient_id, file_name, storage_path')
        .eq('id', documentId)
        .single();

      const patientId = docData?.patient_id;
      const category = docData?.category || 'Auto Detect';
      const originalFilename = docData?.file_name || 'document.png';

      // STAGE A: Faithful Document Capture (OCR & Preprocessing)
      await this.updateStatus(supabase, documentId, 'preprocessing');

      let processedBuffer = fileBuffer;
      let rotationAngle = 0;
      let normalizedStoragePath: string | null = null;
      let ocrResult: any = null;

      // 1. Check for Native PDF Text Extraction Bypass
      if (mimeType === 'application/pdf') {
        try {
          const pdf = require('pdf-parse');
          const data = await pdf(fileBuffer);
          const rawText = data.text || '';
          
          if (rawText.replace(/\s/g, '').length > 50) {
            console.log('PDF contains native selectable text. Bypassing OCR...');
            const rawPages = rawText.split('\f');
            const pages = rawPages
              .map((text: string, index: number) => ({
                pageNumber: index + 1,
                text: text.trim(),
              }))
              .filter((p: any) => p.text.length > 0);
              
            ocrResult = {
              rawText,
              pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: rawText }],
              confidence: 1.0
            };
          }
        } catch (err) {
          console.warn('Native PDF text extraction failed, falling back to scanned OCR:', err);
        }
      }

      // If native PDF text did not bypass OCR, run OCR provider
      if (!ocrResult) {
        const isLocalProvider = (process.env.OCR_PROVIDER || 'local') === 'local';

        if (!isDemoMode() && mimeType.startsWith('image/') && !isLocalProvider) {
          // Cloud Vision Preprocessing using sharp
          try {
            const sharp = require('sharp');
            let image = sharp(fileBuffer);
            
            // EXIF orientation normalization
            image = image.rotate();

            // Auto rotation detection
            rotationAngle = await this.detectImageRotation(fileBuffer, mimeType);
            if (rotationAngle > 0) {
              console.log(`Auto-rotating image by ${rotationAngle} degrees...`);
              image = image.rotate(rotationAngle);
            }

            processedBuffer = await image.toBuffer();

            // Save normalized image to secure storage
            const filename = `normalized_page_1.${mimeType.split('/')[1] || 'png'}`;
            normalizedStoragePath = `patients/${patientId}/documents/${documentId}/${filename}`;
            
            await supabase.storage
              .from('medical-records')
              .upload(normalizedStoragePath, processedBuffer, {
                contentType: mimeType,
                upsert: true
              });

          } catch (err) {
            console.error('Image preprocessing failed, falling back to original:', err);
            processedBuffer = fileBuffer;
            rotationAngle = 0;
            normalizedStoragePath = null;
          }
        }

        // OCR Processing
        await this.updateStatus(supabase, documentId, 'ocr_processing');
        ocrResult = await this.ocrProvider.extractText(processedBuffer, mimeType);
      }

      // Save OCR pages with rotation metadata and normalized path (page-by-page)
      for (const page of ocrResult.pages) {
        let pageNormalizedPath: string | null = null;
        let pageOriginalPath: string | null = null;
        let pageRotation = page.rotationDegrees || 0;
        
        // Handle original image asset upload
        if (page.originalImageBase64) {
          try {
            const pageOriginalBuffer = Buffer.from(page.originalImageBase64, 'base64');
            const pageFilename = `original_page_${page.pageNumber}.png`;
            pageOriginalPath = `patients/${patientId}/documents/${documentId}/${pageFilename}`;
            
            await supabase.storage
              .from('medical-records')
              .upload(pageOriginalPath, pageOriginalBuffer, {
                contentType: 'image/png',
                upsert: true
              });
          } catch (err) {
            console.error(`Failed to upload local original page ${page.pageNumber}:`, err);
          }
        } else if (page.pageNumber === 1 && docData?.storage_path) {
          pageOriginalPath = docData.storage_path;
        }

        // Handle normalized image asset upload
        if (page.normalizedImageBase64) {
          // Local service processed & returned upright page image
          try {
            const pageNormalizedBuffer = Buffer.from(page.normalizedImageBase64, 'base64');
            const pageFilename = `normalized_page_${page.pageNumber}.png`;
            pageNormalizedPath = `patients/${patientId}/documents/${documentId}/${pageFilename}`;
            
            await supabase.storage
              .from('medical-records')
              .upload(pageNormalizedPath, pageNormalizedBuffer, {
                contentType: 'image/png',
                upsert: true
              });
          } catch (err) {
            console.error(`Failed to upload local normalized page ${page.pageNumber}:`, err);
          }
        } else if (page.pageNumber === 1 && normalizedStoragePath) {
          // Cloud Vision first-page fallback
          pageNormalizedPath = normalizedStoragePath;
          pageRotation = rotationAngle;
        }

        await supabase.from('document_pages').insert({
          document_id: documentId,
          page_number: page.pageNumber,
          ocr_text: page.text,
          normalized_storage_path: pageNormalizedPath,
          original_storage_path: pageOriginalPath,
          rotation_angle: pageRotation,
          deskew_angle: page.skewAngle || 0.0,
          width: page.width || null,
          height: page.height || null,
          layout_blocks: page.blocks || [],
          ocr_provider: (ocrResult as any).engine || 'paddleocr',
          fallback_provider: (ocrResult as any).engine === 'tesseract' ? null : 'tesseract'
        });
      }

      // Multi-document splitting detection
      if (!bypassSplit && ocrResult.detectedRegions && ocrResult.detectedRegions.length > 1) {
        // Find minimum region confidence
        const minConfidence = Math.min(...ocrResult.detectedRegions.map((r: any) => r.confidence || 1.0));
        
        if (minConfidence < 0.85) {
          // Low confidence: update status to awaiting_split_review and store detected regions in metadata
          await supabase
            .from('documents')
            .update({
              processing_status: 'awaiting_split_review',
              metadata: {
                detectedRegions: ocrResult.detectedRegions.map((r: any) => ({
                  regionId: r.regionId,
                  boundingBox: r.boundingBox,
                  confidence: r.confidence,
                  croppedImageBase64: r.croppedImageBase64
                }))
              }
            })
            .eq('id', documentId);
            
          await this.updateStatus(supabase, documentId, 'awaiting_split_review');
          
          return {
            documentType: 'OTHER_MEDICAL_DOCUMENT',
            documentTitle: { value: 'Awaiting Split Review', confidence: minConfidence, sourceText: 'Split detection with low confidence', page: 1 },
            documentDate: { value: null, confidence: 1.0, sourceText: null, page: 1 }
          } as any;
        } else {
          // High confidence: automatically split
          return await this.splitDocument(documentId, ocrResult.detectedRegions, docData, supabase);
        }
      }

      // STAGE B: Structured Medical Extraction (Classifier & Specialized Extractors & Validator)
      await this.updateStatus(supabase, documentId, 'extracting');
      
      // 1. Classification & Context Understanding using Deterministic Medical Classifier
      const classification = this.deterministicClassifier.classify(ocrResult.rawText);
      console.log(`Deterministic Ontology Classification: ${classification.documentType} (Confidence: ${classification.confidenceScore})`);
      
      let extraction: MedicalExtraction;
      
      // 2. Call specialized extractor
      const extractedData = await this.ontologyExtractors.extract(ocrResult.rawText, classification);
      
      // Merge patient/encounter details detected by classifier if not extracted
      extraction = {
        documentType: classification.documentType === 'Other' ? 'OTHER_MEDICAL_DOCUMENT' : classification.documentType,
        classificationConfidence: classification.confidenceScore,
        classificationSource: classification.confidenceScore >= 0.80 ? 'ontology' : 'llm',
        documentTitle: { 
          value: classification.documentType === 'Other' ? 'Medical Document' : classification.documentType.replace(/_/g, ' '), 
          confidence: classification.confidenceScore, 
          sourceText: classification.explanation, 
          page: 1 
        },
        documentDate: { value: null, confidence: 1.0, sourceText: null, page: 1 },
        patientNameOnDocument: classification.patientName ? { value: classification.patientName, confidence: 0.95, sourceText: classification.patientName, page: 1 } : undefined,
        hospitalName: classification.hospitalName ? { value: classification.hospitalName, confidence: 0.95, sourceText: classification.hospitalName, page: 1 } : undefined,
        ...extractedData
      } as any;

      // Fetch patient profile for validation
      let patientProfile = null;
      if (patientId) {
        const { data } = await supabase
          .from('patients')
          .select('*')
          .eq('id', patientId)
          .single();
        patientProfile = data;
      }

      // 3. Ontology Validation
      const validationResult = this.ontologyValidators.validate(extraction, classification.documentType);
      extraction = validationResult.validatedExtraction;

      // Save validation errors and classification info
      await supabase
        .from('documents')
        .update({
          document_type: classification.documentType === 'Other' ? null : classification.documentType,
          classification_confidence: classification.confidenceScore,
          classification_source: classification.confidenceScore >= 0.80 ? 'ontology' : 'llm',
          metadata: {
            validationErrors: validationResult.errors,
            classificationReasoning: classification.reason,
            matchedEvidence: classification.matchedEvidence
          }
        })
        .eq('id', documentId);

      // Deterministic Coverage Metrics & Unmapped Content Capture
      if (ocrResult.rawText && ocrResult.rawText.trim()) {
        const blocksText = [];
        if (ocrResult.pages) {
          for (const page of ocrResult.pages) {
            if (page.blocks) {
              for (const block of page.blocks) {
                if (block.text && block.text.trim().length > 0) {
                  blocksText.push(block.text.trim());
                }
              }
            }
          }
        }
        
        const textBlocks = blocksText.length > 0 ? blocksText : ocrResult.rawText
          .split('\n')
          .map((p: string) => p.trim())
          .filter((p: string) => p.length > 5);

        // Collect all sourceText and source_text strings in extraction object
        const sourceTexts = this.collectSourceTexts(extraction);
        const unmappedParagraphs = [];
        let mappedCount = 0;

        for (const paragraph of textBlocks) {
          const paraLower = paragraph.toLowerCase();
          let isMapped = false;
          
          for (const srcText of sourceTexts) {
            if (srcText.includes(paraLower) || paraLower.includes(srcText)) {
              isMapped = true;
              break;
            }
          }
          
          if (isMapped) {
            mappedCount++;
          } else {
            unmappedParagraphs.push(paragraph);
          }
        }

        // Add unmapped content to raw payload so nothing is silently lost
        if (unmappedParagraphs.length > 0) {
          extraction.unmappedDocumentedInformation = [
            ...(extraction.unmappedDocumentedInformation || []),
            ...unmappedParagraphs.map(text => ({
              text,
              sectionHeading: 'Unmapped Content',
              page: 1,
              sourceText: text,
              confidence: 0.70
            }))
          ];
        }

        // Compute coverage statistics
        extraction.coverageMetrics = {
          totalReadableTextBlocks: textBlocks.length,
          mappedStructuredBlocks: mappedCount,
          unmappedBlocks: unmappedParagraphs.length,
          unreadableBlocks: extraction.unreadableSections?.length || 0
        };
      }

      const method = this.getExtractionMethod();
      const provider = this.getProviderName();
      const model = this.getModelName();

      // 4. Save Raw Extraction (Layer 2 - Immutable AI Output)
      await supabase.from('raw_extractions').insert({
        document_id: documentId,
        patient_id: patientId,
        raw_payload: extraction,
        extraction_method: method
      });

      // Save to Extraction Versions
      await supabase.from('extraction_versions').insert({
        document_id: documentId,
        patient_id: patientId,
        version_number: 1,
        raw_payload: extraction,
        extraction_method: method,
        provider: provider,
        model: model
      });

      // Save Document Chunks (RAG Indexing)
      const maxChunkLength = 1000;
      for (const page of ocrResult.pages) {
        const text = page.text || '';
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

      // 5. Pre-populate Medical Records & Entities (Layer 3 - pending review)
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
              extraction_method: method,
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
              extraction_method: method,
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
              extraction_method: method,
              confidence_score: lab.confidence,
              verification_status: this.getInitialVerificationStatus(lab.confidence),
              raw_value: lab.rawValue || lab.value,
              raw_unit: lab.rawUnit || lab.unit,
              normalized_value: lab.normalizedValue || null,
              normalized_unit: lab.normalizedUnit || null,
              normalization_status: lab.normalizationStatus || 'raw'
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
              extraction_method: method,
              confidence_score: proc.confidence,
              verification_status: this.getInitialVerificationStatus(proc.confidence)
            });
          }
        }
      }

      // 6. Complete status updates
      const finalStatus = (validationResult.isValid && classification.documentType !== 'NEEDS_REVIEW') ? 'completed' : 'awaiting_review';
      await this.updateStatus(supabase, documentId, finalStatus);

      // Create timeline events (initially marked pending review)
      await this.createUnverifiedTimelineEvents(supabase, documentId, patientId, extraction);

      return extraction;
    } catch (error: any) {
      console.error('Error in document processing pipeline:', error);
      await this.updateStatus(supabase, documentId, 'failed', error.message || 'Unknown processing error');
      throw error;
    }
  }

  private async detectImageRotation(fileBuffer: Buffer, mimeType: string): Promise<number> {
    const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    if (!key) {
      console.warn('API key is missing. Skipping auto-orientation detection.');
      return 0;
    }

    try {
      const sharp = require('sharp');
      const lowResBuffer = await sharp(fileBuffer)
        .resize(512, 512, { fit: 'inside' })
        .toBuffer();

      const OpenAI = require('openai');
      const openai = new OpenAI({
        apiKey: key,
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      });

      const base64Image = lowResBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      const response = await openai.chat.completions.create({
        model: process.env.AI_MODEL || 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze the orientation of the text in this image. To make the text readable normally from left to right and top to bottom, by how many degrees clockwise do we need to rotate it? Output ONLY a JSON object: {"rotate": 0 | 90 | 180 | 270}. Do not include markdown formatting or backticks.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl
                }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      const rotate = parsed.rotate || 0;
      if ([0, 90, 180, 270].includes(rotate)) {
        return rotate;
      }
      return 0;
    } catch (err) {
      console.error('Failed to detect image rotation:', err);
      return 0;
    }
  }

  private collectSourceTexts(obj: any): Set<string> {
    const texts = new Set<string>();
    const recurse = (val: any) => {
      if (!val) return;
      if (typeof val === 'string') return;
      if (typeof val === 'object') {
        for (const [k, v] of Object.entries(val)) {
          if ((k === 'sourceText' || k === 'source_text') && typeof v === 'string' && v.trim()) {
            texts.add(v.trim().toLowerCase());
          } else {
            recurse(v);
          }
        }
      }
    };
    recurse(obj);
    return texts;
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
    const dt = (extraction.documentType || '').toLowerCase().replace(/_/g, ' ');
    if (dt === 'discharge summary' || dt === 'discharge_summary') {
      eventType = 'Hospital Admission';
    } else if (dt === 'prescription') {
      eventType = 'Prescription';
    } else if (dt === 'lab report' || dt === 'lab_report') {
      eventType = 'Lab Test';
    } else if (dt === 'imaging report' || dt === 'imaging_report') {
      eventType = 'Doctor Visit';
    }    await supabase.from('medical_events').insert({
      patient_id: patientId,
      event_date: eventDate,
      event_type: eventType,
      title: extraction.documentTitle.value || `Medical Record Upload`,
      hospital_name: extraction.hospitalName?.value || null,
      doctor_name: extraction.doctorName?.value || null,
      summary: `Document processed. Contains ${extraction.diagnoses?.length || 0} diagnoses, ${extraction.medications?.length || 0} medications, and ${extraction.labResults?.length || 0} lab results.`,
      source_document_id: documentId,
      verification_status: 'pending_review'
    });
  }

  public async splitDocument(
    parentId: string,
    regions: any[],
    parentDocData: any,
    supabase: any
  ): Promise<MedicalExtraction> {
    const patientId = parentDocData.patient_id;
    
    // Set parent status to completed/processed parent
    await supabase.from('documents').update({
      processing_status: 'completed',
      category: 'Split Parent'
    }).eq('id', parentId);

    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminSupabase = createAdminClient();

    for (let i = 0; i < regions.length; i++) {
      const region = regions[i];
      const childDocId = crypto.randomUUID();
      const croppedBuffer = Buffer.from(region.croppedImageBase64, 'base64');
      const sanitizedFilename = `region_${i + 1}_${parentDocData.file_name}`;
      const croppedStoragePath = `patients/${patientId}/documents/${childDocId}/cropped.png`;

      // Upload cropped image
      await adminSupabase.storage
        .from('medical-records')
        .upload(croppedStoragePath, croppedBuffer, {
          contentType: 'image/png',
          upsert: true
        });

      // Insert child document
      await supabase.from('documents').insert({
        id: childDocId,
        patient_id: patientId,
        file_name: sanitizedFilename,
        file_size: croppedBuffer.length,
        mime_type: 'image/png',
        storage_path: parentDocData.storage_path, // Keep reference to original full image
        cropped_storage_path: croppedStoragePath,
        parent_upload_id: parentId,
        region_id: region.regionId,
        bounding_box: region.boundingBox,
        confidence: region.confidence,
        category: 'Auto Detect',
        processing_status: 'queued',
        original_filename: parentDocData.file_name,
        document_index: i + 1
      });

      // Insert a processing job for the child
      await adminSupabase.from('processing_jobs').insert({
        patient_id: patientId,
        document_id: childDocId,
        status: 'queued',
        attempt_count: 0
      });

      // Trigger processing in background asynchronously in the same Node process
      setTimeout(async () => {
        try {
          const childPipeline = new DocumentProcessingPipeline();
          await childPipeline.processDocument(childDocId, croppedBuffer, 'image/png', adminSupabase, true);
          
          await adminSupabase
            .from('processing_jobs')
            .update({
              status: 'awaiting_review',
              completed_at: new Date().toISOString(),
              provider_used: process.env.AI_PROVIDER || 'openai',
              model_used: process.env.AI_MODEL || 'gpt-4o'
            })
            .eq('document_id', childDocId);
        } catch (err) {
          console.error('Child document processing failed:', err);
        }
      }, 0);
    }

    return {
      documentType: 'OTHER_MEDICAL_DOCUMENT',
      documentTitle: { value: 'Split Parent Document', confidence: 1.0, sourceText: '', page: 1 },
      documentDate: { value: null, confidence: 1.0, sourceText: null, page: 1 }
    } as any;
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { DocumentProcessingPipeline } from '@/lib/extraction/pipeline';
import { isDemoMode } from '@/lib/mode';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params;

  if (isDemoMode()) {
    return NextResponse.json({ error: 'Demo mode is active' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve patient
    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!patient) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }

    // Verify ownership of the document
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !doc || doc.patient_id !== patient.id) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    const adminSupabase = createAdminClient();

    // 1. Get next version number
    const { data: versions } = await adminSupabase
      .from('extraction_versions')
      .select('version_number')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = versions && versions.length > 0 ? (versions[0].version_number || 1) + 1 : 2;

    // 2. Reset processing job status to queued
    await adminSupabase
      .from('processing_jobs')
      .update({
        status: 'queued',
        error_code: null,
        safe_error_message: null,
        attempt_count: 1,
        started_at: new Date().toISOString(),
        completed_at: null
      })
      .eq('document_id', documentId);

    // 3. Fetch file buffer from storage
    const { data: fileData, error: downloadError } = await adminSupabase.storage
      .from('medical-records')
      .download(doc.storage_path);

    if (downloadError || !fileData) {
      console.error('Reprocess download failed:', downloadError);
      return NextResponse.json({ error: 'Storage download failed' }, { status: 500 });
    }

    const fileBuffer = Buffer.from(await fileData.arrayBuffer());

    // 4. Kick off background reprocessing
    const pipeline = new DocumentProcessingPipeline();

    const runReprocessing = async () => {
      try {
        await adminSupabase
          .from('processing_jobs')
          .update({
            status: 'preprocessing',
            started_at: new Date().toISOString()
          })
          .eq('document_id', documentId);

        // Run OCR and Medical Extraction
        await adminSupabase
          .from('processing_jobs')
          .update({
            status: 'ocr_processing'
          })
          .eq('document_id', documentId);

        const ocrResult = await adminSupabase.rpc('get_raw_ocr_or_reprocess', { p_document_id: documentId }); 
        // Fallback to extract text directly
        const finalOcr = ocrResult?.data || await pipeline['ocrProvider'].extractText(fileBuffer, doc.mime_type);

        await adminSupabase
          .from('processing_jobs')
          .update({
            status: 'extracting'
          })
          .eq('document_id', documentId);

        const extraction = await pipeline['extractionProvider'].extractMedicalData(finalOcr.rawText, doc.category);

        // Save raw payload as a new version without deleting old manual verifications
        await adminSupabase.from('extraction_versions').insert({
          document_id: documentId,
          patient_id: patient.id,
          version_number: nextVersion,
          raw_payload: extraction,
          extraction_method: pipeline.getExtractionMethod(),
          provider: pipeline.getProviderName(),
          model: pipeline.getModelName()
        });

        // Insert new extraction results that DO NOT conflict with verified entities
        // For simplicity: add any newly found entities as pending_review
        // We do not overwrite already verified or corrected entities
        // diagnoses
        if (extraction.diagnoses) {
          for (const dx of extraction.diagnoses) {
            // Check if diagnosis with this title already exists in verified state
            const { count } = await adminSupabase
              .from('diagnoses')
              .select('id', { count: 'exact', head: true })
              .eq('source_document_id', documentId)
              .eq('name', dx.name)
              .eq('verification_status', 'verified');

            if (count === 0) {
              const { data: record } = await adminSupabase
                .from('medical_records')
                .insert({
                  patient_id: patient.id,
                  document_id: documentId,
                  record_type: 'diagnosis',
                  title: dx.name,
                  event_date: extraction.documentDate.value || new Date().toISOString().split('T')[0]
                })
                .select()
                .single();

              if (record) {
                await adminSupabase.from('diagnoses').insert({
                  patient_id: patient.id,
                  record_id: record.id,
                  name: dx.name,
                  onset_weeks: dx.onsetWeeks,
                  is_chronic: dx.isChronic,
                  notes: dx.notes,
                  source_document_id: documentId,
                  source_page: dx.page || 1,
                  source_text: dx.sourceText,
                  extraction_method: pipeline.getExtractionMethod(),
                  confidence_score: dx.confidence,
                  verification_status: 'pending_review'
                });
              }
            }
          }
        }

        // medications
        if (extraction.medications) {
          for (const med of extraction.medications) {
            const { count } = await adminSupabase
              .from('medications')
              .select('id', { count: 'exact', head: true })
              .eq('source_document_id', documentId)
              .eq('medicine_name', med.medicineName)
              .eq('verification_status', 'verified');

            if (count === 0) {
              const { data: record } = await adminSupabase
                .from('medical_records')
                .insert({
                  patient_id: patient.id,
                  document_id: documentId,
                  record_type: 'medication',
                  title: med.medicineName,
                  event_date: extraction.documentDate.value || new Date().toISOString().split('T')[0]
                })
                .select()
                .single();

              if (record) {
                await adminSupabase.from('medications').insert({
                  patient_id: patient.id,
                  record_id: record.id,
                  medicine_name: med.medicineName,
                  generic_name: med.genericName,
                  strength: med.strength,
                  dosage: med.dosage,
                  route: med.route,
                  frequency: med.frequency,
                  duration: med.duration,
                  instructions: med.instructions,
                  source_document_id: documentId,
                  source_page: med.page || 1,
                  source_text: med.sourceText,
                  extraction_method: pipeline.getExtractionMethod(),
                  confidence_score: med.confidence,
                  verification_status: 'pending_review'
                });
              }
            }
          }
        }

        // Complete job status update
        await adminSupabase
          .from('processing_jobs')
          .update({
            status: 'awaiting_review',
            completed_at: new Date().toISOString()
          })
          .eq('document_id', documentId);

      } catch (err: any) {
        console.error('Reprocessing failure:', err);
        const code = err.code || 'REPROCESS_FAILURE';
        const msg = err.code === 'LOCAL_OCR_UNAVAILABLE'
          ? 'The local OCR service is offline. Please run "npm run ocr:start".'
          : (err.message || 'Reprocessing extraction run failed.');

        await adminSupabase
          .from('processing_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_code: code,
            safe_error_message: msg
          })
          .eq('document_id', documentId);
      }
    };

    runReprocessing();

    return NextResponse.json({
      success: true,
      message: 'Reprocessing triggered in background',
      nextVersion
    });

  } catch (err: any) {
    console.error('Reprocess API error:', err);
    if (err.code === 'LOCAL_OCR_UNAVAILABLE') {
      return NextResponse.json({
        code: 'LOCAL_OCR_UNAVAILABLE',
        message: 'The local OCR service is temporarily offline. Please start it using "npm run ocr:start".'
      }, { status: 503 });
    }
    return NextResponse.json({ 
      error: 'Reprocess failed', 
      message: err.message || 'Internal server error' 
    }, { status: 400 });
  }
}

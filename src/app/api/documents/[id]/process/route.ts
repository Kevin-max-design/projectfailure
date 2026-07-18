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

    // Rate limiting check: 5 extraction runs per 15 mins
    const { checkRateLimit } = await import('@/lib/rate-limit');
    const rateLimit = checkRateLimit(user.id, 'process', 5, 15 * 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too Many Requests', message: `Extraction processing rate limit exceeded. Please try again in ${rateLimit.retryAfterSeconds} seconds.` },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
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
      .eq('is_deleted', false)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (doc.patient_id !== patient.id) {
      return NextResponse.json({ error: 'Forbidden: Access denied to this document' }, { status: 403 });
    }

    const adminSupabase = createAdminClient();

    // 1. Get or create processing job
    let { data: job } = await adminSupabase
      .from('processing_jobs')
      .select('*')
      .eq('document_id', documentId)
      .single();

    if (!job) {
      const { data: newJob } = await adminSupabase
        .from('processing_jobs')
        .insert({
          patient_id: patient.id,
          document_id: documentId,
          status: 'queued',
          attempt_count: 1
        })
        .select()
        .single();
      job = newJob;
    } else {
      // Increment attempt count
      await adminSupabase
        .from('processing_jobs')
        .update({
          status: 'queued',
          attempt_count: (job.attempt_count || 0) + 1,
          started_at: new Date().toISOString(),
          completed_at: null,
          error_code: null,
          safe_error_message: null
        })
        .eq('id', job.id);
    }

    // 2. Fetch document file buffer from storage
    const { data: fileData, error: downloadError } = await adminSupabase.storage
      .from('medical-records')
      .download(doc.storage_path);

    if (downloadError || !fileData) {
      console.error('Failed to download document from storage:', downloadError);
      await adminSupabase
        .from('processing_jobs')
        .update({
          status: 'failed',
          error_code: 'STORAGE_DOWNLOAD_ERROR',
          safe_error_message: 'Failed to retrieve document from secure storage.'
        })
        .eq('document_id', documentId);

      return NextResponse.json({ error: 'Storage download failed' }, { status: 500 });
    }

    const fileBuffer = Buffer.from(await fileData.arrayBuffer());

    // 3. Run processing pipeline in the background
    const pipeline = new DocumentProcessingPipeline();

    // Start background processing
    const runProcessing = async () => {
      try {
        await adminSupabase
          .from('processing_jobs')
          .update({
            status: 'preprocessing',
            started_at: new Date().toISOString()
          })
          .eq('document_id', documentId);

        // Run OCR and Medical Extraction
        await pipeline.processDocument(documentId, fileBuffer, doc.mime_type, adminSupabase);

        // Update job completion
        await adminSupabase
          .from('processing_jobs')
          .update({
            status: 'awaiting_review',
            completed_at: new Date().toISOString(),
            provider_used: process.env.AI_PROVIDER || 'openai',
            model_used: process.env.AI_MODEL || 'gpt-4o'
          })
          .eq('document_id', documentId);

      } catch (err: any) {
        console.error('Background document processing failed:', err);
        await adminSupabase
          .from('processing_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_code: 'PIPELINE_ERROR',
            safe_error_message: err.message || 'Structured AI extraction failed.'
          })
          .eq('document_id', documentId);
      }
    };

    // Kick off the background execution
    runProcessing();

    return NextResponse.json({
      success: true,
      message: 'Processing started in background',
      jobId: job?.id
    }, { status: 202 });

  } catch (err: any) {
    console.error('Processing trigger API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

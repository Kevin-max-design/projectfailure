import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { DocumentProcessingPipeline } from '@/lib/extraction/pipeline';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const body = await request.json();
    const { action } = body;

    const adminSupabase = createAdminClient();
    const pipeline = new DocumentProcessingPipeline();

    if (action === 'split') {
      const regions = doc.metadata?.detectedRegions;
      if (!regions || regions.length === 0) {
        return NextResponse.json({ error: 'No detected regions found in document metadata' }, { status: 400 });
      }

      await pipeline.splitDocument(documentId, regions, doc, adminSupabase);

      return NextResponse.json({ success: true, message: 'Document split initiated' });
    } else if (action === 'bypass') {
      const { data: fileData, error: downloadError } = await adminSupabase.storage
        .from('medical-records')
        .download(doc.storage_path);

      if (downloadError || !fileData) {
        return NextResponse.json({ error: 'Failed to retrieve original document from storage' }, { status: 500 });
      }

      const fileBuffer = Buffer.from(await fileData.arrayBuffer());

      let { data: job } = await adminSupabase
        .from('processing_jobs')
        .select('*')
        .eq('document_id', documentId)
        .single();

      if (job) {
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

      const runProcessing = async () => {
        try {
          await adminSupabase
            .from('processing_jobs')
            .update({
              status: 'preprocessing',
              started_at: new Date().toISOString()
            })
            .eq('document_id', documentId);

          await pipeline.processDocument(documentId, fileBuffer, doc.mime_type, adminSupabase, true);

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
          console.error('Bypass background processing failed:', err);
          await adminSupabase
            .from('processing_jobs')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              error_code: err.code || 'PIPELINE_ERROR',
              safe_error_message: err.message || 'Structured AI extraction failed.'
            })
            .eq('document_id', documentId);
        }
      };

      runProcessing();

      return NextResponse.json({ success: true, message: 'Processing started without splitting' });
    } else {
      return NextResponse.json({ error: 'Invalid action. Must be split or bypass' }, { status: 400 });
    }

  } catch (err: any) {
    console.error('Split API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
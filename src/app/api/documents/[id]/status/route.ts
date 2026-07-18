import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/mode';

export async function GET(
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

    // Verify document ownership
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('patient_id, processing_status')
      .eq('id', documentId)
      .eq('is_deleted', false)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (doc.patient_id !== patient.id) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    // Get job status
    const { data: job } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('document_id', documentId)
      .single();

    return NextResponse.json({
      status: job?.status || doc.processing_status,
      attemptCount: job?.attempt_count || 1,
      errorCode: job?.error_code || null,
      errorMessage: job?.safe_error_message || null,
      provider: job?.provider_used || null,
      model: job?.model_used || null
    });

  } catch (err: any) {
    console.error('Job status API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

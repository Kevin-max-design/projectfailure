import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
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

    // Verify ownership of the document
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('storage_path, patient_id')
      .eq('id', documentId)
      .eq('is_deleted', false)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // CRITICAL: Cross-patient isolation check
    if (doc.patient_id !== patient.id) {
      return NextResponse.json({ error: 'Forbidden: Access denied to this document' }, { status: 403 });
    }

    // Create signed URL
    const adminSupabase = createAdminClient();
    const { data, error: signedUrlError } = await adminSupabase.storage
      .from('medical-records')
      .createSignedUrl(doc.storage_path, 60); // 60 seconds expiration

    if (signedUrlError || !data) {
      console.error('Signed URL generation failed:', signedUrlError);
      return NextResponse.json({ error: 'Failed to access document file' }, { status: 550 });
    }

    return NextResponse.json({
      signedUrl: data.signedUrl
    });

  } catch (err: any) {
    console.error('Signed URL route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { MedicalExtractionSchema } from '@/lib/providers/medical-extraction-provider';
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

    const { rawPayload } = await request.json();
    if (!rawPayload) {
      return NextResponse.json({ error: 'Missing rawPayload' }, { status: 400 });
    }

    // Validate payload structure
    const validated = MedicalExtractionSchema.parse(rawPayload);

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
      .select('patient_id')
      .eq('id', documentId)
      .single();

    if (docError || !doc || doc.patient_id !== patient.id) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    const adminSupabase = createAdminClient();

    // 1. Update raw_extractions table
    const { error: extractionError } = await adminSupabase
      .from('raw_extractions')
      .update({ raw_payload: validated })
      .eq('document_id', documentId);

    if (extractionError) {
      console.error('Failed to update raw_extractions:', extractionError);
      return NextResponse.json({ error: 'Failed to save extraction payload' }, { status: 500 });
    }

    // 2. Update the latest extraction_versions table record
    const { data: versions } = await adminSupabase
      .from('extraction_versions')
      .select('id')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false })
      .limit(1);

    if (versions && versions.length > 0) {
      await adminSupabase
        .from('extraction_versions')
        .update({ raw_payload: validated })
        .eq('id', versions[0].id);
    }

    return NextResponse.json({ success: true, payload: validated });

  } catch (err: any) {
    console.error('Save payload API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

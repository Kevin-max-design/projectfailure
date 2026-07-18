import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
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
      .select('*')
      .eq('id', documentId)
      .eq('is_deleted', false)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (doc.patient_id !== patient.id) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    // Fetch raw extraction if available
    const { data: extraction } = await supabase
      .from('raw_extractions')
      .select('*')
      .eq('document_id', documentId)
      .single();

    // Fetch entity counts
    const { count: dxCount } = await supabase
      .from('diagnoses')
      .select('*', { count: 'exact', head: true })
      .eq('source_document_id', documentId);

    const { count: medCount } = await supabase
      .from('medications')
      .select('*', { count: 'exact', head: true })
      .eq('source_document_id', documentId);

    const { count: labCount } = await supabase
      .from('lab_results')
      .select('*', { count: 'exact', head: true })
      .eq('source_document_id', documentId);

    const { count: procCount } = await supabase
      .from('procedures')
      .select('*', { count: 'exact', head: true })
      .eq('source_document_id', documentId);

    return NextResponse.json({
      document: doc,
      extraction: extraction?.raw_payload || null,
      stats: {
        diagnosesCount: dxCount || 0,
        medicationsCount: medCount || 0,
        labResultsCount: labCount || 0,
        proceduresCount: procCount || 0
      }
    });

  } catch (err: any) {
    console.error('Get document API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    // Resolve patient profile
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
      .select('*')
      .eq('id', documentId)
      .eq('is_deleted', false)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (doc.patient_id !== patient.id) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    const adminSupabase = createAdminClient();

    // 1. Delete physical file from Storage bucket
    if (doc.storage_path) {
      const { error: storageDelError } = await adminSupabase.storage
        .from('medical-records')
        .remove([doc.storage_path]);
      if (storageDelError) {
        console.error('Failed to delete file from storage during document deletion:', storageDelError);
      }
    }

    // 2. Clear extracted entities (cascading deletes for this document's clinical facts)
    await adminSupabase.from('diagnoses').delete().eq('source_document_id', documentId).eq('patient_id', patient.id);
    await adminSupabase.from('medications').delete().eq('source_document_id', documentId).eq('patient_id', patient.id);
    await adminSupabase.from('lab_results').delete().eq('source_document_id', documentId).eq('patient_id', patient.id);
    await adminSupabase.from('procedures').delete().eq('source_document_id', documentId).eq('patient_id', patient.id);

    // 3. Clear document assets & chunks
    await adminSupabase.from('document_chunks').delete().eq('document_id', documentId).eq('patient_id', patient.id);
    await adminSupabase.from('document_pages').delete().eq('document_id', documentId);
    await adminSupabase.from('raw_extractions').delete().eq('document_id', documentId).eq('patient_id', patient.id);
    await adminSupabase.from('processing_jobs').delete().eq('document_id', documentId).eq('patient_id', patient.id);

    // 4. Remove timeline events
    await adminSupabase.from('medical_events').delete().eq('source_document_id', documentId).eq('patient_id', patient.id);

    // 5. Update document record status
    await adminSupabase
      .from('documents')
      .update({
        is_deleted: true,
        storage_path: null, // Zero out storage path so it is no longer referenced
        processing_status: 'deleted'
      })
      .eq('id', documentId);

    // 6. Log activity
    await adminSupabase.from('activity_logs').insert({
      patient_id: patient.id,
      action: 'document_deleted',
      details: { document_id: documentId, file_name: doc.file_name }
    });

    return NextResponse.json({ success: true, message: 'Document and all associated clinical data successfully cleared.' });

  } catch (err: any) {
    console.error('Delete document API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

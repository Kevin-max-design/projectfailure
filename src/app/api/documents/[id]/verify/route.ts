import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ServerTimelineGenerator } from '@/lib/timeline/server-generator';
import { isDemoMode } from '@/lib/mode';
import { LongitudinalBrainService } from '@/lib/services/longitudinal-brain';

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

    const {
      recordId,
      entityType, // 'diagnoses', 'medications', 'lab_results', 'procedures'
      action,     // 'confirm', 'correct', 'reject', 'unreadable'
      fieldName,
      oldValue,
      newValue
    } = await request.json();

    if (!recordId || !entityType || !action) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
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
      .select('patient_id')
      .eq('id', documentId)
      .single();

    if (docError || !doc || doc.patient_id !== patient.id) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    // Determine verification status
    const verificationStatus = 
      action === 'confirm' ? 'verified' :
      action === 'reject' ? 'rejected' :
      action === 'unreadable' ? 'unreadable' : 'corrected';

    // 1. Update the actual medical entity table
    const updatePayload: Record<string, any> = {
      verification_status: verificationStatus,
      verified_by: user.id,
      verified_at: new Date().toISOString()
    };

    if (action === 'correct' && fieldName) {
      // Map entity field key (snake_case database keys)
      updatePayload[fieldName] = newValue;
    }

    const { error: updateError } = await supabase
      .from(entityType)
      .update(updatePayload)
      .eq('record_id', recordId)
      .eq('patient_id', patient.id);

    if (updateError) {
      console.error(`Error updating ${entityType}:`, updateError);
      return NextResponse.json({ error: 'Failed to update record status' }, { status: 500 });
    }

    // 2. Log verification action audit record using ServerTimelineGenerator
    await ServerTimelineGenerator.recordVerificationAction({
      patientId: patient.id,
      recordId,
      entityType,
      fieldName: fieldName || 'status',
      oldValue: oldValue || null,
      newValue: newValue || null,
      actionType: action,
      verifiedBy: user.id
    });

    // 3. Sync/Generate timeline event if verified or corrected
    if (verificationStatus === 'verified' || verificationStatus === 'corrected') {
      const recordType = 
        entityType === 'diagnoses' ? 'diagnosis' :
        entityType === 'medications' ? 'medication' :
        entityType === 'lab_results' ? 'lab_result' : 'procedure';

      // Ensure a timeline event exists for this verified item
      await ServerTimelineGenerator.syncTimelineEventForRecord(
        recordId,
        recordType,
        patient.id
      );

      // Trigger Longitudinal Profile Sync
      await LongitudinalBrainService.syncProfileFromRecords(patient.id, supabase, false);

      // Rebuild and Sync Patient Knowledge Graph
      const { MedicalGraphService } = await import('@/lib/services/medical-graph');
      await MedicalGraphService.buildGraphFromRecords(patient.id, supabase, false);
      await MedicalGraphService.syncMemory(patient.id, supabase, false);

      // For Phase 8: Continuous Learning loop, capture reviewer feedback on correction
      if (action === 'correct') {
        try {
          // Fetch OCR text
          const { data: pages } = await supabase
            .from('document_pages')
            .select('ocr_text')
            .eq('document_id', documentId)
            .order('page_number', { ascending: true });
          const originalOcr = (pages || []).map((p: any) => p.ocr_text || '').join('\n');

          // Fetch original extraction
          const { data: rawExt } = await supabase
            .from('raw_extractions')
            .select('raw_payload')
            .eq('document_id', documentId)
            .single();
          const originalPayload = rawExt?.raw_payload || {};

          // Fetch all current records for this document to represent the corrected payload
          const { data: diagnoses } = await supabase.from('diagnoses').select('*').eq('source_document_id', documentId);
          const { data: medications } = await supabase.from('medications').select('*').eq('source_document_id', documentId);
          const { data: labResults } = await supabase.from('lab_results').select('*').eq('source_document_id', documentId);
          const { data: procedures } = await supabase.from('procedures').select('*').eq('source_document_id', documentId);

          const correctedPayload = {
            diagnoses: diagnoses || [],
            medications: medications || [],
            labResults: labResults || [],
            procedures: procedures || []
          };

          await MedicalGraphService.saveCorrectionFeedback(
            patient.id,
            documentId,
            originalOcr,
            originalPayload,
            correctedPayload,
            { fieldName, oldValue, newValue, recordId, entityType },
            supabase,
            false
          );
        } catch (feedErr) {
          console.error('Failed to log continuous learning feedback:', feedErr);
        }
      }
    } else if (verificationStatus === 'rejected') {
      // Clean up unverified medical_events from timeline if rejected
      await supabase
        .from('medical_events')
        .delete()
        .eq('source_document_id', documentId)
        .eq('patient_id', patient.id)
        .eq('verification_status', 'pending_review');

      // Trigger Longitudinal Profile Sync to recalculate active problems / meds
      await LongitudinalBrainService.syncProfileFromRecords(patient.id, supabase, false);

      // Rebuild and Sync Patient Knowledge Graph
      const { MedicalGraphService } = await import('@/lib/services/medical-graph');
      await MedicalGraphService.buildGraphFromRecords(patient.id, supabase, false);
      await MedicalGraphService.syncMemory(patient.id, supabase, false);
    }

    return NextResponse.json({ success: true, verificationStatus });

  } catch (err: any) {
    console.error('Verify action API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    // 2. Get the original AI extraction (version_number = 1)
    const { data: firstVersion } = await adminSupabase
      .from('extraction_versions')
      .select('raw_payload')
      .eq('document_id', documentId)
      .eq('version_number', 1)
      .maybeSingle();
    const originalExtraction = firstVersion?.raw_payload || {};

    // 3. Get the latest version number and insert new human-corrected version
    const { data: latestVersion } = await adminSupabase
      .from('extraction_versions')
      .select('version_number')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersionNum = (latestVersion?.version_number || 1) + 1;

    await adminSupabase.from('extraction_versions').insert({
      document_id: documentId,
      patient_id: patient.id,
      version_number: nextVersionNum,
      raw_payload: validated,
      extraction_method: 'human_verification',
      provider: 'human',
      model: 'reviewer'
    });

    // 4. Retrieve raw OCR text for continuous learning training set
    const { data: pages } = await adminSupabase
      .from('document_pages')
      .select('ocr_text')
      .eq('document_id', documentId)
      .order('page_number', { ascending: true });
    const originalOcr = pages?.map((p: any) => p.ocr_text).join('\n\n') || '';

    // Helper to compute deep diff between payloads
    const diffPayloads = (original: any, corrected: any): Record<string, any> => {
      const diffs: Record<string, any> = {};
      
      const compareKeys = (obj1: any, obj2: any, prefix = '') => {
        if (!obj1 || !obj2 || typeof obj1 !== 'object' || typeof obj2 !== 'object') return;
        
        for (const key of Object.keys({ ...obj1, ...obj2 })) {
          const path = prefix ? `${prefix}.${key}` : key;
          const val1 = obj1[key];
          const val2 = obj2[key];
          
          if (JSON.stringify(val1) !== JSON.stringify(val2)) {
            if (val1 && val2 && typeof val1 === 'object' && typeof val2 === 'object' && !Array.isArray(val1)) {
              compareKeys(val1, val2, path);
            } else {
              diffs[path] = { from: val1, to: val2 };
            }
          }
        }
      };
      
      compareKeys(original, corrected);
      return diffs;
    };

    const diffs = diffPayloads(originalExtraction, validated);

    // Fetch confidence and reasoning metadata from the document record
    const { data: documentMeta } = await adminSupabase
      .from('documents')
      .select('classification_confidence, metadata')
      .eq('id', documentId)
      .single();

    // 5. Log correction into feedback_training_data for continuous learning SLM dataset
    const reasonHeader = request.headers.get('x-correction-reason') || 'User review corrections';
    await adminSupabase.from('feedback_training_data').insert({
      patient_id: patient.id,
      document_id: documentId,
      original_ocr: originalOcr,
      original_extraction: originalExtraction,
      corrected_extraction: validated,
      confidence: documentMeta?.classification_confidence || 1.0,
      reviewer_edits: diffs,
      reason_for_correction: reasonHeader,
      version: nextVersionNum
    });

    return NextResponse.json({ success: true, payload: validated, version: nextVersionNum });

  } catch (err: any) {
    console.error('Save payload API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

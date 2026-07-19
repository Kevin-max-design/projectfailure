"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const server_2 = require("@/lib/supabase/server");
const server_3 = require("@/lib/supabase/server");
const medical_extraction_provider_1 = require("@/lib/providers/medical-extraction-provider");
const mode_1 = require("@/lib/mode");
async function POST(request, { params }) {
    const { id: documentId } = await params;
    if ((0, mode_1.isDemoMode)()) {
        return server_1.NextResponse.json({ error: 'Demo mode is active' }, { status: 400 });
    }
    try {
        const supabase = await (0, server_2.createClient)();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { rawPayload } = await request.json();
        if (!rawPayload) {
            return server_1.NextResponse.json({ error: 'Missing rawPayload' }, { status: 400 });
        }
        // Validate payload structure
        const validated = medical_extraction_provider_1.MedicalExtractionSchema.parse(rawPayload);
        // Resolve patient
        const { data: patient } = await supabase
            .from('patients')
            .select('id')
            .eq('user_id', user.id)
            .single();
        if (!patient) {
            return server_1.NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
        }
        // Verify ownership of the document
        const { data: doc, error: docError } = await supabase
            .from('documents')
            .select('patient_id')
            .eq('id', documentId)
            .single();
        if (docError || !doc || doc.patient_id !== patient.id) {
            return server_1.NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
        }
        const adminSupabase = (0, server_3.createAdminClient)();
        // 1. Update raw_extractions table
        const { error: extractionError } = await adminSupabase
            .from('raw_extractions')
            .update({ raw_payload: validated })
            .eq('document_id', documentId);
        if (extractionError) {
            console.error('Failed to update raw_extractions:', extractionError);
            return server_1.NextResponse.json({ error: 'Failed to save extraction payload' }, { status: 500 });
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
        return server_1.NextResponse.json({ success: true, payload: validated });
    }
    catch (err) {
        console.error('Save payload API error:', err);
        return server_1.NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}

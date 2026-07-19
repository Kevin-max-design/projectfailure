"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const server_2 = require("@/lib/supabase/server");
const server_generator_1 = require("@/lib/timeline/server-generator");
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
        const { recordId, entityType, // 'diagnoses', 'medications', 'lab_results', 'procedures'
        action, // 'confirm', 'correct', 'reject', 'unreadable'
        fieldName, oldValue, newValue } = await request.json();
        if (!recordId || !entityType || !action) {
            return server_1.NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }
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
        // Determine verification status
        const verificationStatus = action === 'confirm' ? 'verified' :
            action === 'reject' ? 'rejected' :
                action === 'unreadable' ? 'unreadable' : 'corrected';
        // 1. Update the actual medical entity table
        const updatePayload = {
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
            return server_1.NextResponse.json({ error: 'Failed to update record status' }, { status: 500 });
        }
        // 2. Log verification action audit record using ServerTimelineGenerator
        await server_generator_1.ServerTimelineGenerator.recordVerificationAction({
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
            const recordType = entityType === 'diagnoses' ? 'diagnosis' :
                entityType === 'medications' ? 'medication' :
                    entityType === 'lab_results' ? 'lab_result' : 'procedure';
            // Ensure a timeline event exists for this verified item
            await server_generator_1.ServerTimelineGenerator.syncTimelineEventForRecord(recordId, recordType, patient.id);
        }
        else if (verificationStatus === 'rejected') {
            // Clean up unverified medical_events from timeline if rejected
            await supabase
                .from('medical_events')
                .delete()
                .eq('source_document_id', documentId)
                .eq('patient_id', patient.id)
                .eq('verification_status', 'pending_review');
        }
        return server_1.NextResponse.json({ success: true, verificationStatus });
    }
    catch (err) {
        console.error('Verify action API error:', err);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

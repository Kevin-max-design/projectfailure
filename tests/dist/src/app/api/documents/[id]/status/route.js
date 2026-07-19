"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const server_2 = require("@/lib/supabase/server");
const mode_1 = require("@/lib/mode");
async function GET(request, { params }) {
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
        // Resolve patient
        const { data: patient } = await supabase
            .from('patients')
            .select('id')
            .eq('user_id', user.id)
            .single();
        if (!patient) {
            return server_1.NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
        }
        // Verify document ownership
        const { data: doc, error: docError } = await supabase
            .from('documents')
            .select('patient_id, processing_status')
            .eq('id', documentId)
            .eq('is_deleted', false)
            .single();
        if (docError || !doc) {
            return server_1.NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }
        if (doc.patient_id !== patient.id) {
            return server_1.NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
        }
        // Get job status
        const { data: job } = await supabase
            .from('processing_jobs')
            .select('*')
            .eq('document_id', documentId)
            .single();
        return server_1.NextResponse.json({
            status: (job === null || job === void 0 ? void 0 : job.status) || doc.processing_status,
            attemptCount: (job === null || job === void 0 ? void 0 : job.attempt_count) || 1,
            errorCode: (job === null || job === void 0 ? void 0 : job.error_code) || null,
            errorMessage: (job === null || job === void 0 ? void 0 : job.safe_error_message) || null,
            provider: (job === null || job === void 0 ? void 0 : job.provider_used) || null,
            model: (job === null || job === void 0 ? void 0 : job.model_used) || null
        });
    }
    catch (err) {
        console.error('Job status API error:', err);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

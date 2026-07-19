"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const server_2 = require("@/lib/supabase/server");
const server_3 = require("@/lib/supabase/server");
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
        // Verify ownership of the document
        const { data: doc, error: docError } = await supabase
            .from('documents')
            .select('storage_path, patient_id')
            .eq('id', documentId)
            .eq('is_deleted', false)
            .single();
        if (docError || !doc) {
            return server_1.NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }
        // CRITICAL: Cross-patient isolation check
        if (doc.patient_id !== patient.id) {
            return server_1.NextResponse.json({ error: 'Forbidden: Access denied to this document' }, { status: 403 });
        }
        // Determine path based on query param: type = 'original' | 'normalized'
        const viewType = request.nextUrl.searchParams.get('type') || 'normalized';
        let filePath = doc.storage_path;
        if (viewType === 'normalized') {
            const { data: pageData } = await supabase
                .from('document_pages')
                .select('normalized_storage_path')
                .eq('document_id', documentId)
                .eq('page_number', 1)
                .maybeSingle();
            if (pageData === null || pageData === void 0 ? void 0 : pageData.normalized_storage_path) {
                filePath = pageData.normalized_storage_path;
            }
        }
        // Create signed URL
        const adminSupabase = (0, server_3.createAdminClient)();
        const { data, error: signedUrlError } = await adminSupabase.storage
            .from('medical-records')
            .createSignedUrl(filePath, 60); // 60 seconds expiration
        if (signedUrlError || !data) {
            console.error('Signed URL generation failed:', signedUrlError);
            return server_1.NextResponse.json({ error: 'Failed to access document file' }, { status: 550 });
        }
        return server_1.NextResponse.json({
            signedUrl: data.signedUrl
        });
    }
    catch (err) {
        console.error('Signed URL route error:', err);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

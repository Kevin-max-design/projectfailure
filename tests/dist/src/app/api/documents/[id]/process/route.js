"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const server_2 = require("@/lib/supabase/server");
const server_3 = require("@/lib/supabase/server");
const pipeline_1 = require("@/lib/extraction/pipeline");
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
        // Rate limiting check: 5 extraction runs per 15 mins
        const { checkRateLimit } = await Promise.resolve().then(() => __importStar(require('@/lib/rate-limit')));
        const rateLimit = checkRateLimit(user.id, 'process', 5, 15 * 60 * 1000);
        if (!rateLimit.success) {
            return server_1.NextResponse.json({ error: 'Too Many Requests', message: `Extraction processing rate limit exceeded. Please try again in ${rateLimit.retryAfterSeconds} seconds.` }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } });
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
            .select('*')
            .eq('id', documentId)
            .eq('is_deleted', false)
            .single();
        if (docError || !doc) {
            return server_1.NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }
        if (doc.patient_id !== patient.id) {
            return server_1.NextResponse.json({ error: 'Forbidden: Access denied to this document' }, { status: 403 });
        }
        const adminSupabase = (0, server_3.createAdminClient)();
        // 1. Get or create processing job
        let { data: job } = await adminSupabase
            .from('processing_jobs')
            .select('*')
            .eq('document_id', documentId)
            .single();
        if (!job) {
            const { data: newJob } = await adminSupabase
                .from('processing_jobs')
                .insert({
                patient_id: patient.id,
                document_id: documentId,
                status: 'queued',
                attempt_count: 1
            })
                .select()
                .single();
            job = newJob;
        }
        else {
            // Increment attempt count
            await adminSupabase
                .from('processing_jobs')
                .update({
                status: 'queued',
                attempt_count: (job.attempt_count || 0) + 1,
                started_at: new Date().toISOString(),
                completed_at: null,
                error_code: null,
                safe_error_message: null
            })
                .eq('id', job.id);
        }
        // 2. Fetch document file buffer from storage
        const { data: fileData, error: downloadError } = await adminSupabase.storage
            .from('medical-records')
            .download(doc.storage_path);
        if (downloadError || !fileData) {
            console.error('Failed to download document from storage:', downloadError);
            await adminSupabase
                .from('processing_jobs')
                .update({
                status: 'failed',
                error_code: 'STORAGE_DOWNLOAD_ERROR',
                safe_error_message: 'Failed to retrieve document from secure storage.'
            })
                .eq('document_id', documentId);
            return server_1.NextResponse.json({ error: 'Storage download failed' }, { status: 500 });
        }
        const fileBuffer = Buffer.from(await fileData.arrayBuffer());
        // 3. Run processing pipeline in the background
        const pipeline = new pipeline_1.DocumentProcessingPipeline();
        // Start background processing
        const runProcessing = async () => {
            try {
                await adminSupabase
                    .from('processing_jobs')
                    .update({
                    status: 'preprocessing',
                    started_at: new Date().toISOString()
                })
                    .eq('document_id', documentId);
                // Run OCR and Medical Extraction
                await pipeline.processDocument(documentId, fileBuffer, doc.mime_type, adminSupabase);
                // Update job completion
                await adminSupabase
                    .from('processing_jobs')
                    .update({
                    status: 'awaiting_review',
                    completed_at: new Date().toISOString(),
                    provider_used: process.env.AI_PROVIDER || 'openai',
                    model_used: process.env.AI_MODEL || 'gpt-4o'
                })
                    .eq('document_id', documentId);
            }
            catch (err) {
                console.error('Background document processing failed:', err);
                const code = err.code || 'PIPELINE_ERROR';
                const msg = err.code === 'LOCAL_OCR_UNAVAILABLE'
                    ? 'The local OCR service is offline. Please run "npm run ocr:start".'
                    : (err.message || 'Structured AI extraction failed.');
                await adminSupabase
                    .from('processing_jobs')
                    .update({
                    status: 'failed',
                    completed_at: new Date().toISOString(),
                    error_code: code,
                    safe_error_message: msg
                })
                    .eq('document_id', documentId);
            }
        };
        // Kick off the background execution
        runProcessing();
        return server_1.NextResponse.json({
            success: true,
            message: 'Processing started in background',
            jobId: job === null || job === void 0 ? void 0 : job.id
        }, { status: 202 });
    }
    catch (err) {
        console.error('Processing trigger API error:', err);
        if (err.code === 'LOCAL_OCR_UNAVAILABLE') {
            return server_1.NextResponse.json({
                code: 'LOCAL_OCR_UNAVAILABLE',
                message: 'The local OCR service is temporarily offline. Please start it using "npm run ocr:start".'
            }, { status: 503 });
        }
        return server_1.NextResponse.json({
            error: 'Trigger failed',
            message: err.message || 'Internal server error'
        }, { status: 400 });
    }
}

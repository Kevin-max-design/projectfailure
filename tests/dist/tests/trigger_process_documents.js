"use strict";
/**
 * Trigger document processing for the two downloaded fixtures.
 *
 * This uses Supabase admin client directly (bypassing HTTP auth)
 * to simulate what the process API route does:
 *   1. Download the file from storage
 *   2. Run the full DocumentProcessingPipeline
 *   3. Persist Stage A (OCR) and Stage B (extraction) results
 *
 * Usage:
 *   npx tsx tests/trigger_process_documents.ts
 *
 * Requires: OCR service running on port 8001 (npm run ocr:start)
 */
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
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
// Load env
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DOCUMENT_IDS = [
    '846ca393-96d1-4bfa-a327-0938f4b68783',
    // '3a2bf4f0-a8e1-45af-a1fa-4c8024f8e747', // not yet in DB; use upload flow
];
async function processDocument(documentId, adminSupabase) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Processing document: ${documentId}`);
    console.log('─'.repeat(60));
    // Get document record
    const { data: doc, error: docErr } = await adminSupabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();
    if (docErr || !doc) {
        console.error(`  ❌ Document not found: ${docErr === null || docErr === void 0 ? void 0 : docErr.message}`);
        return;
    }
    console.log(`  File: ${doc.original_filename}`);
    console.log(`  MIME: ${doc.mime_type}`);
    console.log(`  Status: ${doc.processing_status}`);
    console.log(`  Storage path: ${doc.storage_path}`);
    // Download from storage
    const { data: fileData, error: dlErr } = await adminSupabase.storage
        .from('medical-records')
        .download(doc.storage_path);
    if (dlErr || !fileData) {
        console.error(`  ❌ Storage download failed: ${dlErr === null || dlErr === void 0 ? void 0 : dlErr.message}`);
        return;
    }
    const fileBuffer = Buffer.from(await fileData.arrayBuffer());
    console.log(`  Downloaded: ${fileBuffer.length} bytes`);
    // Upsert processing job
    let { data: job } = await adminSupabase
        .from('processing_jobs')
        .select('*')
        .eq('document_id', documentId)
        .single();
    if (!job) {
        const { data: newJob } = await adminSupabase
            .from('processing_jobs')
            .insert({
            patient_id: doc.patient_id,
            document_id: documentId,
            status: 'queued',
            attempt_count: 1,
        })
            .select()
            .single();
        job = newJob;
        console.log(`  Created processing job: ${job === null || job === void 0 ? void 0 : job.id}`);
    }
    else {
        await adminSupabase
            .from('processing_jobs')
            .update({
            status: 'queued',
            attempt_count: (job.attempt_count || 0) + 1,
            started_at: new Date().toISOString(),
            completed_at: null,
            error_code: null,
            safe_error_message: null,
        })
            .eq('id', job.id);
        console.log(`  Reusing processing job: ${job.id} (attempt ${(job.attempt_count || 0) + 1})`);
    }
    // Mark as preprocessing
    await adminSupabase
        .from('processing_jobs')
        .update({ status: 'preprocessing', started_at: new Date().toISOString() })
        .eq('document_id', documentId);
    // Run the pipeline
    console.log('  Running DocumentProcessingPipeline...');
    const startMs = Date.now();
    try {
        // Dynamically import pipeline (avoids module resolution issues)
        const { DocumentProcessingPipeline } = await Promise.resolve().then(() => __importStar(require('../src/lib/extraction/pipeline')));
        const pipeline = new DocumentProcessingPipeline();
        await pipeline.processDocument(documentId, fileBuffer, doc.mime_type, adminSupabase);
        const elapsed = Date.now() - startMs;
        console.log(`  ✅ Pipeline completed in ${elapsed}ms`);
        // Update job to awaiting_review
        await adminSupabase
            .from('processing_jobs')
            .update({
            status: 'awaiting_review',
            completed_at: new Date().toISOString(),
            provider_used: process.env.AI_PROVIDER || 'local',
            model_used: process.env.AI_MODEL || 'local-extraction',
        })
            .eq('document_id', documentId);
    }
    catch (err) {
        console.error(`  ❌ Pipeline failed: ${err.message}`);
        await adminSupabase
            .from('processing_jobs')
            .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_code: err.code || 'PIPELINE_ERROR',
            safe_error_message: err.message,
        })
            .eq('document_id', documentId);
        return;
    }
    // Verify persisted output
    console.log('\n  Verifying persisted output...');
    const { data: pages } = await adminSupabase
        .from('document_pages')
        .select('page_number, ocr_text, layout_blocks, ocr_provider, rotation_angle, width, height, deskew_angle')
        .eq('document_id', documentId)
        .order('page_number');
    if (!pages || pages.length === 0) {
        console.log('  ⚠️  No document_pages rows found.');
    }
    else {
        console.log(`  document_pages rows: ${pages.length}`);
        for (const p of pages) {
            const blockCount = Array.isArray(p.layout_blocks) ? p.layout_blocks.length : 0;
            const charCount = (p.ocr_text || '').length;
            const wordCount = (p.ocr_text || '').split(/\s+/).filter(Boolean).length;
            console.log(`    Page ${p.page_number}: engine=${p.ocr_provider} blocks=${blockCount} words=${wordCount} chars=${charCount} rotation=${p.rotation_angle}° deskew=${p.deskew_angle}° dim=${p.width}x${p.height}`);
            if (p.ocr_text) {
                const preview = p.ocr_text.substring(0, 300).replace(/\n/g, ' ');
                console.log(`    Text preview: "${preview}..."`);
            }
        }
    }
    const { data: updatedDoc } = await adminSupabase
        .from('documents')
        .select('processing_status, extracted_data')
        .eq('id', documentId)
        .single();
    if (updatedDoc) {
        console.log(`  Document status: ${updatedDoc.processing_status}`);
        const data = updatedDoc.extracted_data;
        if (data) {
            const nonEmptyCategories = Object.entries(data)
                .filter(([k, v]) => {
                if (Array.isArray(v))
                    return v.length > 0;
                if (typeof v === 'object' && v !== null)
                    return Object.keys(v).length > 0;
                if (typeof v === 'string')
                    return v.length > 0;
                return v != null;
            })
                .map(([k]) => k);
            console.log(`  Non-empty extracted categories (${nonEmptyCategories.length}): ${nonEmptyCategories.join(', ')}`);
        }
        else {
            console.log('  ⚠️  No extracted_data found on document');
        }
    }
}
async function main() {
    console.log('═'.repeat(60));
    console.log('MEDMEMORY — PIPELINE TRIGGER & PERSISTENCE VERIFICATION');
    console.log('═'.repeat(60));
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
        process.exit(1);
    }
    // Check OCR service
    try {
        const health = await fetch('http://127.0.0.1:8001/health').then(r => r.json());
        console.log(`\nOCR Service: ${JSON.stringify(health)}`);
        if (health.status !== 'healthy') {
            console.error('❌ OCR service is not healthy. Run: npm run ocr:start');
            process.exit(1);
        }
    }
    catch (_a) {
        console.error('❌ OCR service is not running. Run: npm run ocr:start');
        process.exit(1);
    }
    const adminSupabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { persistSession: false },
    });
    for (const docId of DOCUMENT_IDS) {
        await processDocument(docId, adminSupabase);
    }
    console.log('\n' + '═'.repeat(60));
    console.log('ALL DONE');
    console.log('═'.repeat(60));
}
main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});

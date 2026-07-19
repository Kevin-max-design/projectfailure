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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
async function run() {
    console.log('Testing Multi-Document splitting...');
    const adminSupabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
    });
    const { data: patient } = await adminSupabase.from('patients').select('id, user_id').limit(1).single();
    if (!patient) {
        throw new Error('No patient found to run test');
    }
    const patientId = patient.id;
    const docPath = path.join(process.cwd(), 'tests/fixtures/WhatsApp_Image_2026-07-18_at_17.19.13.jpeg');
    const buffer = fs.readFileSync(docPath);
    const documentId = crypto_1.default.randomUUID();
    const storagePath = `patients/${patientId}/documents/${documentId}/WhatsApp_Image_2026-07-18_at_17.19.13.jpeg`;
    console.log('Uploading original multi-doc image...');
    await adminSupabase.storage.from('medical-records').upload(storagePath, buffer, {
        contentType: 'image/jpeg',
        upsert: true
    });
    console.log('Registering document in DB...');
    await adminSupabase.from('documents').insert({
        id: documentId,
        patient_id: patientId,
        file_name: 'WhatsApp_Image_2026-07-18_at_17.19.13.jpeg',
        file_size: buffer.length,
        mime_type: 'image/jpeg',
        storage_path: storagePath,
        category: 'Auto Detect',
        processing_status: 'queued',
        sha256_hash: 'test-hash-multi-doc-' + Date.now(),
        original_filename: 'WhatsApp_Image_2026-07-18_at_17.19.13.jpeg'
    });
    console.log('Triggering document processing...');
    const { DocumentProcessingPipeline } = require('../src/lib/extraction/pipeline');
    const pipeline = new DocumentProcessingPipeline();
    await pipeline.processDocument(documentId, buffer, 'image/jpeg', adminSupabase);
    console.log('Waiting for child documents to process (8 seconds)...');
    await new Promise(r => setTimeout(r, 8000));
    const { data: children } = await adminSupabase
        .from('documents')
        .select('id, file_name, category, processing_status, document_type, confidence')
        .eq('parent_upload_id', documentId);
    console.log('Child documents created:');
    console.log(JSON.stringify(children, null, 2));
    if (!children || children.length < 2) {
        console.error('FAIL: Less than 2 child documents detected!');
    }
    else {
        console.log('SUCCESS: Split into separate documents successfully!');
    }
}
run().catch(console.error);

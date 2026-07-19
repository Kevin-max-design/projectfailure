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
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
async function printOcrText() {
    const adminSupabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
    });
    // Query latest documents
    const { data: docs } = await adminSupabase
        .from('documents')
        .select('id, file_name')
        .order('created_at', { ascending: false })
        .limit(5);
    console.log('Latest documents:', docs);
    for (const doc of docs || []) {
        const { data: pages } = await adminSupabase
            .from('document_pages')
            .select('page_number, ocr_text')
            .eq('document_id', doc.id);
        console.log(`Document: ${doc.file_name} (${doc.id})`);
        for (const p of pages || []) {
            console.log(`--- Page ${p.page_number} OCR text: ---`);
            console.log(p.ocr_text);
        }
    }
}
printOcrText();

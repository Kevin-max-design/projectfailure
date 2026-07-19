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
const provider_factory_1 = require("@/lib/providers/provider-factory");
const mode_1 = require("@/lib/mode");
async function POST(request) {
    if ((0, mode_1.isDemoMode)()) {
        return server_1.NextResponse.json({ error: 'Demo mode is active' }, { status: 400 });
    }
    try {
        const supabase = await (0, server_2.createClient)();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // Rate limiting check: 20 queries per 15 mins
        const { checkRateLimit } = await Promise.resolve().then(() => __importStar(require('@/lib/rate-limit')));
        const rateLimit = checkRateLimit(user.id, 'ask', 20, 15 * 60 * 1000);
        if (!rateLimit.success) {
            return server_1.NextResponse.json({ error: 'Too Many Requests', message: `Query rate limit exceeded. Please try again in ${rateLimit.retryAfterSeconds} seconds.` }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } });
        }
        const { question } = await request.json();
        if (!question || !question.trim()) {
            return server_1.NextResponse.json({ error: 'Question is required' }, { status: 400 });
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
        const patientId = patient.id;
        // 1. Fetch structured medical records (Strictly patient-isolated)
        const { data: diagnoses } = await supabase
            .from('diagnoses')
            .select('name, notes, onset_weeks, is_chronic, verification_status')
            .eq('patient_id', patientId);
        const { data: medications } = await supabase
            .from('medications')
            .select('medicine_name, generic_name, strength, dosage, frequency, route, duration, verification_status')
            .eq('patient_id', patientId);
        const { data: labResults } = await supabase
            .from('lab_results')
            .select('test_name, value, unit, reference_range, abnormal_flag, test_date, verification_status')
            .eq('patient_id', patientId);
        const { data: procedures } = await supabase
            .from('procedures')
            .select('name, date, notes, verification_status')
            .eq('patient_id', patientId);
        const structuredRecords = [];
        if (diagnoses)
            structuredRecords.push(...diagnoses.map((d) => (Object.assign({ type: 'diagnosis' }, d))));
        if (medications)
            structuredRecords.push(...medications.map((m) => (Object.assign({ type: 'medication' }, m))));
        if (labResults)
            structuredRecords.push(...labResults.map((l) => (Object.assign({ type: 'lab_result' }, l))));
        if (procedures)
            structuredRecords.push(...procedures.map((p) => (Object.assign({ type: 'procedure' }, p))));
        // 2. Fetch document chunks matching key terms or overall patient documents
        // Let's do simple keyword extraction to filter chunks
        const terms = question
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter((term) => term.length > 3);
        let queryBuilder = supabase
            .from('document_chunks')
            .select('*, documents(file_name, category, created_at)')
            .eq('patient_id', patientId);
        // If keywords exist, try filtering by keyword matching for simple database search
        if (terms.length > 0) {
            const filters = terms.map((term) => `chunk_text.ilike.%${term}%`).join(',');
            // Or just load chunks and filter on server if small, or query DB
            // To ensure we get matching context, let's load all page chunks for the patient (usually < 100 pages for MVP)
            // and do keyword ranking in memory, which is 100% reliable and database-agnostic.
        }
        const { data: chunks } = await queryBuilder.limit(100);
        // Rank/score chunks based on keyword matching
        const rankedChunks = (chunks || [])
            .map((chunk) => {
            let score = 0;
            const text = chunk.chunk_text.toLowerCase();
            for (const term of terms) {
                if (text.includes(term))
                    score++;
            }
            return { chunk, score };
        })
            // Sort by relevance score, but keep some chunks even if score is 0
            .sort((a, b) => b.score - a.score)
            .slice(0, 15) // send top 15 chunks
            .map((item) => {
            const doc = item.chunk.documents;
            return {
                text: item.chunk.chunk_text,
                documentId: item.chunk.document_id,
                documentTitle: (doc === null || doc === void 0 ? void 0 : doc.file_name) || 'Medical Document',
                pageNumber: item.chunk.page_number,
                date: (doc === null || doc === void 0 ? void 0 : doc.created_at) ? doc.created_at.split('T')[0] : ''
            };
        });
        // 3. Query RAG QA Provider
        const qaProvider = (0, provider_factory_1.createQAProvider)();
        const answerResult = await qaProvider.askQuestion(question, patientId, rankedChunks, structuredRecords);
        // 4. Log RAG Query Submission to activity logs
        const adminSupabase = (0, server_3.createAdminClient)();
        await adminSupabase.from('activity_logs').insert({
            patient_id: patientId,
            action: 'rag_query_submitted',
            metadata: {
                question: question,
                citationCount: answerResult.citations.length
            }
        });
        return server_1.NextResponse.json(answerResult);
    }
    catch (err) {
        console.error('RAG query API error:', err);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

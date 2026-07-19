"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const server_2 = require("@/lib/supabase/server");
const mode_1 = require("@/lib/mode");
const medical_context_service_1 = require("@/lib/services/medical-context-service");
const doctor_brief_provider_1 = require("@/lib/providers/doctor-brief-provider");
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
        // Resolve patient
        const { data: patient } = await supabase
            .from('patients')
            .select('*')
            .eq('user_id', user.id)
            .single();
        if (!patient) {
            return server_1.NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
        }
        const body = await request.json();
        const { medical_help_session_id } = body;
        let intakeContext = {
            reason_category: 'Routine Handoff',
            problem_location: 'Not specified',
            onset: 'Unknown',
            severity: 'Mild',
            selected_symptoms: [],
            patient_description: 'Self-initiated review brief.'
        };
        if (medical_help_session_id) {
            const { data: session } = await supabase
                .from('medical_help_sessions')
                .select('*')
                .eq('id', medical_help_session_id)
                .single();
            if (session) {
                intakeContext = {
                    reason_category: session.reason_category,
                    problem_location: session.problem_location,
                    onset: session.onset,
                    severity: session.severity,
                    selected_symptoms: session.selected_symptoms || [],
                    patient_description: session.patient_description
                };
            }
        }
        // 1. Retrieve relevant history
        const history = await medical_context_service_1.RelevantMedicalHistoryService.retrieveRelevantHistory(patient.id, intakeContext, supabase, false);
        // Calculate age
        const dob = new Date(patient.date_of_birth);
        const ageDiff = Date.now() - dob.getTime();
        const ageDate = new Date(ageDiff);
        const patientAge = Math.abs(ageDate.getUTCFullYear() - 1970);
        // 2. Generate brief (AI / Fallback)
        const briefProvider = new doctor_brief_provider_1.DoctorBriefProvider();
        const briefContent = await briefProvider.generateBrief(patient.full_name, patientAge, patient.date_of_birth, intakeContext, history);
        // Extract sources
        const sources = history.records
            .filter(r => r.sourceDocumentId)
            .map(r => ({
            documentId: r.sourceDocumentId,
            pageNumber: r.sourcePage,
            snippet: r.sourceText
        }));
        // 3. Save snapshot to Database
        const { data: dbBrief, error } = await supabase
            .from('doctor_briefs')
            .insert({
            patient_id: patient.id,
            medical_help_session_id: medical_help_session_id || null,
            structured_content: briefContent,
            source_snapshot: sources,
            generation_method: process.env.AI_API_KEY || process.env.OPENAI_API_KEY ? 'ai_openai' : 'deterministic',
            provider: process.env.AI_API_KEY || process.env.OPENAI_API_KEY ? 'openai' : null,
            model: process.env.AI_API_KEY || process.env.OPENAI_API_KEY ? (process.env.AI_MODEL || 'gpt-4o') : null
        })
            .select()
            .single();
        if (error) {
            return server_1.NextResponse.json({ error: error.message }, { status: 500 });
        }
        // Update help session if provided
        if (medical_help_session_id) {
            await supabase
                .from('medical_help_sessions')
                .update({ generated_brief_id: dbBrief.id })
                .eq('id', medical_help_session_id);
        }
        // Write audit log
        await supabase.from('activity_logs').insert({
            patient_id: patient.id,
            action: 'doctor_brief_generated',
            metadata: { brief_id: dbBrief.id }
        });
        return server_1.NextResponse.json(dbBrief, { status: 201 });
    }
    catch (error) {
        console.error('Error generating doctor brief:', error);
        return server_1.NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
async function GET(request) {
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
        const { data: briefs, error } = await supabase
            .from('doctor_briefs')
            .select('*')
            .eq('patient_id', patient.id)
            .order('generated_at', { ascending: false });
        if (error) {
            return server_1.NextResponse.json({ error: error.message }, { status: 500 });
        }
        return server_1.NextResponse.json(briefs);
    }
    catch (error) {
        console.error('Error fetching doctor briefs:', error);
        return server_1.NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

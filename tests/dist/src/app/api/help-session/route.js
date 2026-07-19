"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const server_2 = require("@/lib/supabase/server");
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
        // Resolve patient
        const { data: patient } = await supabase
            .from('patients')
            .select('id')
            .eq('user_id', user.id)
            .single();
        if (!patient) {
            return server_1.NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
        }
        const body = await request.json();
        const { reason_category, problem_location, onset, severity, patient_description, selected_symptoms, language } = body;
        // Validation
        if (!reason_category || !onset || !severity) {
            return server_1.NextResponse.json({ error: 'Missing required triage fields' }, { status: 400 });
        }
        const { data: helpSession, error } = await supabase
            .from('medical_help_sessions')
            .insert({
            patient_id: patient.id,
            reason_category,
            problem_location,
            onset,
            severity,
            patient_description,
            selected_symptoms: selected_symptoms || [],
            language: language || 'en',
            raw_patient_text: patient_description
        })
            .select()
            .single();
        if (error) {
            return server_1.NextResponse.json({ error: error.message }, { status: 500 });
        }
        // Write audit log
        await supabase.from('activity_logs').insert({
            patient_id: patient.id,
            action: 'medical_help_session_created',
            metadata: { session_id: helpSession.id }
        });
        return server_1.NextResponse.json(helpSession, { status: 201 });
    }
    catch (error) {
        console.error('Error creating medical help session:', error);
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
        const { data: sessions, error } = await supabase
            .from('medical_help_sessions')
            .select('*')
            .eq('patient_id', patient.id)
            .order('created_at', { ascending: false });
        if (error) {
            return server_1.NextResponse.json({ error: error.message }, { status: 500 });
        }
        return server_1.NextResponse.json(sessions);
    }
    catch (error) {
        console.error('Error fetching medical help sessions:', error);
        return server_1.NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

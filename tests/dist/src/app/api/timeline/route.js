"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const server_2 = require("@/lib/supabase/server");
const mode_1 = require("@/lib/mode");
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
        // Fetch timeline events ordered by date descending
        const { data: events, error } = await supabase
            .from('medical_events')
            .select('*, documents(file_name)')
            .eq('patient_id', patient.id)
            .order('event_date', { ascending: false });
        if (error) {
            console.error('Failed to fetch timeline events:', error);
            return server_1.NextResponse.json({ error: 'Failed to retrieve timeline' }, { status: 500 });
        }
        // Format results to align with MedicalEvent type structure (using snake_case)
        const formattedEvents = (events || []).map(event => {
            const doc = event.documents;
            return {
                id: event.id,
                patient_id: event.patient_id,
                event_date: event.event_date,
                event_type: event.event_type,
                title: event.title,
                hospital_name: event.hospital_name,
                doctor_name: event.doctor_name,
                summary: event.summary,
                source_document_id: event.source_document_id,
                source_document_name: (doc === null || doc === void 0 ? void 0 : doc.file_name) || undefined,
                verification_status: event.verification_status
            };
        });
        return server_1.NextResponse.json(formattedEvents);
    }
    catch (err) {
        console.error('Timeline API error:', err);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const server_2 = require("@/lib/supabase/server");
const mode_1 = require("@/lib/mode");
async function GET(request, { params }) {
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
        const { id } = await params;
        const { data: brief, error } = await supabase
            .from('doctor_briefs')
            .select('*')
            .eq('id', id)
            .eq('patient_id', patient.id)
            .single();
        if (error || !brief) {
            return server_1.NextResponse.json({ error: 'Doctor Brief not found or access denied' }, { status: 404 });
        }
        return server_1.NextResponse.json(brief);
    }
    catch (error) {
        console.error('Error fetching doctor brief details:', error);
        return server_1.NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

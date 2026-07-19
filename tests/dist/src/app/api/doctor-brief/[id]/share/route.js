"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const server_2 = require("@/lib/supabase/server");
const mode_1 = require("@/lib/mode");
const crypto_1 = __importDefault(require("crypto"));
async function POST(request, { params }) {
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
        const { id: briefId } = await params;
        // Verify brief ownership
        const { data: brief } = await supabase
            .from('doctor_briefs')
            .select('id')
            .eq('id', briefId)
            .eq('patient_id', patient.id)
            .single();
        if (!brief) {
            return server_1.NextResponse.json({ error: 'Doctor Brief not found or access denied' }, { status: 404 });
        }
        const body = await request.json();
        const { durationMinutes } = body; // e.g. 15, 60, 1440
        if (!durationMinutes || typeof durationMinutes !== 'number') {
            return server_1.NextResponse.json({ error: 'Invalid duration specified' }, { status: 400 });
        }
        // Generate high-entropy token
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const tokenHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
        const { data: shareToken, error } = await supabase
            .from('medical_share_tokens')
            .insert({
            patient_id: patient.id,
            brief_id: briefId,
            token_hash: tokenHash,
            scope: 'read_brief',
            expires_at: expiresAt
        })
            .select()
            .single();
        if (error) {
            return server_1.NextResponse.json({ error: error.message }, { status: 500 });
        }
        // Audit log
        await supabase.from('activity_logs').insert({
            patient_id: patient.id,
            action: 'doctor_brief_shared',
            metadata: { brief_id: briefId, share_token_id: shareToken.id, duration_minutes: durationMinutes }
        });
        // Return plain-text token (only returned once)
        return server_1.NextResponse.json({
            token,
            expiresAt
        }, { status: 201 });
    }
    catch (error) {
        console.error('Error sharing doctor brief:', error);
        return server_1.NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
async function DELETE(request, { params }) {
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
        const { id: briefId } = await params;
        // Revoke all tokens for this brief
        const { error } = await supabase
            .from('medical_share_tokens')
            .update({ revoked_at: new Date().toISOString() })
            .eq('brief_id', briefId)
            .eq('patient_id', patient.id);
        if (error) {
            return server_1.NextResponse.json({ error: error.message }, { status: 500 });
        }
        // Audit log
        await supabase.from('activity_logs').insert({
            patient_id: patient.id,
            action: 'share_link_revoked',
            metadata: { brief_id: briefId }
        });
        return server_1.NextResponse.json({ success: true, message: 'All share links revoked successfully.' });
    }
    catch (error) {
        console.error('Error revoking doctor brief sharing:', error);
        return server_1.NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

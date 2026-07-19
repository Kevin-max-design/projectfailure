"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const server_2 = require("@/lib/supabase/server");
const crypto_1 = __importDefault(require("crypto"));
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');
        if (!token) {
            return server_1.NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }
        const tokenHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
        const supabase = (0, server_2.createAdminClient)();
        // 1. Resolve token hash
        const { data: shareToken, error: tokenErr } = await supabase
            .from('medical_share_tokens')
            .select('*')
            .eq('token_hash', tokenHash)
            .single();
        if (tokenErr || !shareToken) {
            return server_1.NextResponse.json({ error: 'Access token invalid or not found' }, { status: 404 });
        }
        // 2. Validate expiration and revocation
        const isExpired = new Date(shareToken.expires_at) < new Date();
        const isRevoked = shareToken.revoked_at !== null;
        if (isExpired || isRevoked) {
            return server_1.NextResponse.json({ error: 'Access token expired or revoked' }, { status: 403 });
        }
        // 3. Fetch brief
        const { data: brief, error: briefErr } = await supabase
            .from('doctor_briefs')
            .select('*')
            .eq('id', shareToken.brief_id)
            .single();
        if (briefErr || !brief) {
            return server_1.NextResponse.json({ error: 'Doctor Brief not found' }, { status: 404 });
        }
        // 4. Fetch patient info safely (only necessary columns)
        const { data: patient } = await supabase
            .from('patients')
            .select('full_name, date_of_birth')
            .eq('id', shareToken.patient_id)
            .single();
        // 5. Update last_accessed_at and log audit trail
        await supabase
            .from('medical_share_tokens')
            .update({ last_accessed_at: new Date().toISOString() })
            .eq('id', shareToken.id);
        await supabase.from('activity_logs').insert({
            patient_id: shareToken.patient_id,
            action: 'doctor_brief_viewed',
            metadata: { brief_id: shareToken.brief_id, token_id: shareToken.id }
        });
        return server_1.NextResponse.json({
            brief,
            patient
        });
    }
    catch (error) {
        console.error('Error in public doctor brief resolver:', error);
        return server_1.NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

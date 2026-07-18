import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const supabase = createAdminClient();

    // 1. Resolve token hash
    const { data: shareToken, error: tokenErr } = await supabase
      .from('medical_share_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .single();

    if (tokenErr || !shareToken) {
      return NextResponse.json({ error: 'Access token invalid or not found' }, { status: 404 });
    }

    // 2. Validate expiration and revocation
    const isExpired = new Date(shareToken.expires_at) < new Date();
    const isRevoked = shareToken.revoked_at !== null;

    if (isExpired || isRevoked) {
      return NextResponse.json({ error: 'Access token expired or revoked' }, { status: 403 });
    }

    // 3. Fetch brief
    const { data: brief, error: briefErr } = await supabase
      .from('doctor_briefs')
      .select('*')
      .eq('id', shareToken.brief_id)
      .single();

    if (briefErr || !brief) {
      return NextResponse.json({ error: 'Doctor Brief not found' }, { status: 404 });
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

    return NextResponse.json({
      brief,
      patient
    });
  } catch (error: any) {
    console.error('Error in public doctor brief resolver:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

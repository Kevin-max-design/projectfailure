import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/mode';

export async function POST(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json({ error: 'Demo mode is active' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve patient
    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!patient) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      reason_category,
      problem_location,
      onset,
      severity,
      patient_description,
      selected_symptoms,
      language
    } = body;

    // Validation
    if (!reason_category || !onset || !severity) {
      return NextResponse.json({ error: 'Missing required triage fields' }, { status: 400 });
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Write audit log
    await supabase.from('activity_logs').insert({
      patient_id: patient.id,
      action: 'medical_help_session_created',
      metadata: { session_id: helpSession.id }
    });

    return NextResponse.json(helpSession, { status: 201 });
  } catch (error: any) {
    console.error('Error creating medical help session:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json({ error: 'Demo mode is active' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve patient
    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!patient) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }

    const { data: sessions, error } = await supabase
      .from('medical_help_sessions')
      .select('*')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(sessions);
  } catch (error: any) {
    console.error('Error fetching medical help sessions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

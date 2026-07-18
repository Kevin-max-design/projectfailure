import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/mode';

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

    // Fetch timeline events ordered by date descending
    const { data: events, error } = await supabase
      .from('medical_events')
      .select('*, documents(file_name)')
      .eq('patient_id', patient.id)
      .order('event_date', { ascending: false });

    if (error) {
      console.error('Failed to fetch timeline events:', error);
      return NextResponse.json({ error: 'Failed to retrieve timeline' }, { status: 500 });
    }

    // Format results to align with MedicalEvent type structure (using snake_case)
    const formattedEvents = (events || []).map(event => {
      const doc = event.documents as any;
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
        source_document_name: doc?.file_name || undefined,
        verification_status: event.verification_status
      };
    });

    return NextResponse.json(formattedEvents);

  } catch (err: any) {
    console.error('Timeline API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

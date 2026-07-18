import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/mode';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const { data: brief, error } = await supabase
      .from('doctor_briefs')
      .select('*')
      .eq('id', id)
      .eq('patient_id', patient.id)
      .single();

    if (error || !brief) {
      return NextResponse.json({ error: 'Doctor Brief not found or access denied' }, { status: 404 });
    }

    return NextResponse.json(brief);
  } catch (error: any) {
    console.error('Error fetching doctor brief details:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

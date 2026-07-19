import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/mode';
import { LongitudinalBrainService } from '@/lib/services/longitudinal-brain';

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

    // 1. Run Clinical Safety Checks
    const safetyAlerts = await LongitudinalBrainService.runClinicalSafetyCheck(
      patient.id,
      supabase,
      false
    );

    // 2. Analyze Lab Trends (HbA1c & Hemoglobin)
    const hba1cTrend = await LongitudinalBrainService.analyzeLabTrends(
      patient.id,
      'hba1c',
      supabase,
      false
    );

    const hbTrend = await LongitudinalBrainService.analyzeLabTrends(
      patient.id,
      'hemoglobin',
      supabase,
      false
    );

    const wbcTrend = await LongitudinalBrainService.analyzeLabTrends(
      patient.id,
      'wbc',
      supabase,
      false
    );

    const plateletsTrend = await LongitudinalBrainService.analyzeLabTrends(
      patient.id,
      'platelet',
      supabase,
      false
    );

    return NextResponse.json({
      safetyAlerts,
      labTrends: {
        hba1c: hba1cTrend,
        hemoglobin: hbTrend,
        wbc: wbcTrend,
        platelets: plateletsTrend
      }
    });

  } catch (err: any) {
    console.error('Dashboard data API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

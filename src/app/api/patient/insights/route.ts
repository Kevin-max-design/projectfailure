import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/mode';
import { MedicalGraphService } from '@/lib/services/medical-graph';

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

    // Rebuild graph to ensure it is up to date
    await MedicalGraphService.buildGraphFromRecords(patient.id, supabase, false);

    // Fetch insights
    const insights = await MedicalGraphService.generateClinicalInsights(patient.id, supabase, false);

    // Fetch counts for dashboard stats
    const { count: nodeCount } = await supabase
      .from('graph_nodes')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', patient.id);

    const { count: edgeCount } = await supabase
      .from('graph_edges')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', patient.id);

    return NextResponse.json({
      insights,
      metrics: {
        nodes: nodeCount || 0,
        edges: edgeCount || 0
      }
    });

  } catch (err: any) {
    console.error('Clinical Insights API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

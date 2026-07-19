import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createQAProvider } from '@/lib/providers/provider-factory';
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

    // Rate limiting check: 20 queries per 15 mins
    const { checkRateLimit } = await import('@/lib/rate-limit');
    const rateLimit = checkRateLimit(user.id, 'ask', 20, 15 * 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too Many Requests', message: `Query rate limit exceeded. Please try again in ${rateLimit.retryAfterSeconds} seconds.` },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    const { question } = await request.json();

    if (!question || !question.trim()) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
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

    const patientId = patient.id;

    // 1. Fetch structured medical records (Strictly patient-isolated)
    const { data: diagnoses } = await supabase
      .from('diagnoses')
      .select('name, notes, onset_weeks, is_chronic, verification_status')
      .eq('patient_id', patientId);

    const { data: medications } = await supabase
      .from('medications')
      .select('medicine_name, generic_name, strength, dosage, frequency, route, duration, verification_status')
      .eq('patient_id', patientId);

    const { data: labResults } = await supabase
      .from('lab_results')
      .select('test_name, value, unit, reference_range, abnormal_flag, test_date, verification_status')
      .eq('patient_id', patientId);

    const { data: procedures } = await supabase
      .from('procedures')
      .select('name, date, notes, verification_status')
      .eq('patient_id', patientId);

    const structuredRecords: any[] = [];
    if (diagnoses) structuredRecords.push(...diagnoses.map((d: any) => ({ type: 'diagnosis', ...d })));
    if (medications) structuredRecords.push(...medications.map((m: any) => ({ type: 'medication', ...m })));
    if (labResults) structuredRecords.push(...labResults.map((l: any) => ({ type: 'lab_result', ...l })));
    if (procedures) structuredRecords.push(...procedures.map((p: any) => ({ type: 'procedure', ...p })));

    // 2. Fetch document chunks matching key terms or overall patient documents
    // Let's do simple keyword extraction to filter chunks
    const terms = question
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((term: string) => term.length > 3);

    let queryBuilder = supabase
      .from('document_chunks')
      .select('*, documents(file_name, category, created_at)')
      .eq('patient_id', patientId);

    // If keywords exist, try filtering by keyword matching for simple database search
    if (terms.length > 0) {
      const filters = terms.map((term: string) => `chunk_text.ilike.%${term}%`).join(',');
      // Or just load chunks and filter on server if small, or query DB
      // To ensure we get matching context, let's load all page chunks for the patient (usually < 100 pages for MVP)
      // and do keyword ranking in memory, which is 100% reliable and database-agnostic.
    }

    const { data: chunks } = await queryBuilder.limit(100);

    // Rank/score chunks based on keyword matching
    const rankedChunks = (chunks || [])
      .map((chunk: any) => {
        let score = 0;
        const text = chunk.chunk_text.toLowerCase();
        for (const term of terms) {
          if (text.includes(term)) score++;
        }
        return { chunk, score };
      })
      // Sort by relevance score, but keep some chunks even if score is 0
      .sort((a, b) => b.score - a.score)
      .slice(0, 15) // send top 15 chunks
      .map((item) => {
        const doc = item.chunk.documents as any;
        return {
          text: item.chunk.chunk_text,
          documentId: item.chunk.document_id,
          documentTitle: doc?.file_name || 'Medical Document',
          pageNumber: item.chunk.page_number,
          date: doc?.created_at ? doc.created_at.split('T')[0] : ''
        };
      });

    // 3. Query RAG QA Provider with longitudinal copilot context
    const { MedicalGraphService } = await import('@/lib/services/medical-graph');
    
    // Generate compressed patient memory summary
    const compressedMemory = await MedicalGraphService.generateCompressedMemory(patientId, supabase, false);
    
    // Compute panels, switches, and journeys
    const panels = await MedicalGraphService.computeLabPanels(patientId, supabase, false);
    const switches = await MedicalGraphService.detectMedicationSwitches(patientId, supabase, false);
    const journeys = await MedicalGraphService.analyzeDiseaseJourneys(patientId, supabase, false);

    const qaProvider = createQAProvider();
    const answerResult = await qaProvider.askQuestion(
      question,
      patientId,
      rankedChunks,
      structuredRecords,
      compressedMemory,
      { panels, switches, journeys }
    );

    // 4. Log RAG Query Submission to activity logs
    const adminSupabase = createAdminClient();
    await adminSupabase.from('activity_logs').insert({
      patient_id: patientId,
      action: 'rag_query_submitted',
      metadata: {
        question: question,
        citationCount: answerResult.citations.length
      }
    });

    return NextResponse.json(answerResult);

  } catch (err: any) {
    console.error('RAG query API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

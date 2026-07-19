// Global Mock for localStorage in Node.js test runner environment
const storageData: Record<string, string> = {};
if (typeof global.window === 'undefined') {
  (global as any).window = {
    localStorage: {
      getItem: (key: string) => storageData[key] || null,
      setItem: (key: string, value: string) => { storageData[key] = String(value); },
      removeItem: (key: string) => { delete storageData[key]; },
      clear: () => { for (const k in storageData) delete storageData[k]; }
    }
  };
  (global as any).localStorage = (global as any).window.localStorage;
}

import { mockDb, DEMO_PATIENT } from '../src/lib/supabase/service';
import { MedicalGraphService } from '../src/lib/services/medical-graph';

// Basic Assert function
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`✓ Passed: ${message}`);
}

async function runGraphTests() {
  console.log('================================================================');
  console.log('         MEDMEMORY PATIENT KNOWLEDGE GRAPH SYSTEM TESTS         ');
  console.log('================================================================\n');

  try {
    const patientId = DEMO_PATIENT.id;

    // Reset database state for tests
    localStorage.removeItem('medmemory_seeded');
    localStorage.removeItem('medmemory_patients');
    localStorage.removeItem('medmemory_diagnoses');
    localStorage.removeItem('medmemory_medications');
    localStorage.removeItem('medmemory_lab_results');
    localStorage.removeItem('medmemory_procedures');
    localStorage.removeItem('medmemory_documents');
    localStorage.removeItem('medmemory_graph_nodes');
    localStorage.removeItem('medmemory_graph_edges');
    localStorage.removeItem('medmemory_feedback_training_data');

    // Re-seed patients to have clean profile
    mockDb.query('patients').insert({
      id: patientId,
      user_id: '00000000-0000-0000-0000-000000000001',
      full_name: 'Arjun Rao',
      date_of_birth: '1980-01-01',
      known_allergies: [],
      known_chronic_conditions: [],
      current_long_term_medications: []
    });

    // Test 1: Entity Resolution (Phase 2)
    console.log('[Test 1] Entity Resolution spelling variations...');
    
    // Diagnosis Resolution
    assert(
      MedicalGraphService.canonicalizeEntity('type ii dm', 'diagnosis') === 'Type 2 Diabetes Mellitus',
      'Should resolve type ii dm to Type 2 Diabetes Mellitus'
    );
    assert(
      MedicalGraphService.canonicalizeEntity('HTN', 'diagnosis') === 'Hypertension',
      'Should resolve HTN to Hypertension'
    );
    assert(
      MedicalGraphService.canonicalizeEntity('acid reflux', 'diagnosis') === 'Gastroesophageal Reflux Disease (GERD)',
      'Should resolve acid reflux to GERD'
    );

    // Medication Resolution
    assert(
      MedicalGraphService.canonicalizeEntity('Glycomet 500mg', 'medication') === 'Metformin',
      'Should resolve Glycomet 500mg to Metformin'
    );
    assert(
      MedicalGraphService.canonicalizeEntity('aspirin 81 mg', 'medication') === 'Aspirin',
      'Should resolve aspirin 81 mg to Aspirin'
    );
    assert(
      MedicalGraphService.canonicalizeEntity('Lipitor tab', 'medication') === 'Atorvastatin',
      'Should resolve Lipitor tab to Atorvastatin'
    );

    // Test 2: Build Knowledge Graph (Phase 1)
    console.log('[Test 2] Building Knowledge Graph from verified records...');

    // Seed a document
    mockDb.query('documents').insert({
      id: 'doc-graph-1',
      patient_id: patientId,
      file_name: 'Adora Clinic Report.pdf',
      processing_status: 'completed',
      created_at: '2026-07-15T10:00:00Z'
    });

    // Seed verified records linked to document
    mockDb.query('diagnoses').insert({
      id: 'dx-graph-1',
      patient_id: patientId,
      record_id: 'rec-dx-graph-1',
      name: 'Essential Hypertension',
      is_chronic: true,
      verification_status: 'verified',
      source_document_id: 'doc-graph-1',
      confidence_score: 0.98
    });

    mockDb.query('medications').insert({
      id: 'med-graph-1',
      patient_id: patientId,
      record_id: 'rec-med-graph-1',
      medicine_name: 'Metformin Hydrochloride 500',
      duration: 'Ongoing',
      verification_status: 'verified',
      source_document_id: 'doc-graph-1',
      confidence_score: 0.95
    });

    // Rebuild graph
    await MedicalGraphService.buildGraphFromRecords(patientId, mockDb, true);

    const nodes = mockDb.query('graph_nodes').select().eq('patient_id', patientId).data || [];
    const edges = mockDb.query('graph_edges').select().eq('patient_id', patientId).data || [];

    // Verify Patient node, Encounter node, Diagnosis node, Medication node
    assert(nodes.some(n => n.entity_type === 'Patient'), 'Must create Patient node');
    assert(nodes.some(n => n.entity_type === 'Encounter'), 'Must create Encounter node');
    
    // Resolution check: Essential Hypertension resolved to Hypertension!
    const hasHypertensionNode = nodes.some(n => n.entity_type === 'Diagnosis' && n.canonical_name === 'Hypertension');
    assert(hasHypertensionNode, 'Should create resolved Hypertension diagnosis node');

    // Resolution check: Metformin Hydrochloride 500 resolved to Metformin!
    const hasMetforminNode = nodes.some(n => n.entity_type === 'Medication' && n.canonical_name === 'Metformin');
    assert(hasMetforminNode, 'Should create resolved Metformin medication node');

    // Verify Edges
    assert(edges.some(e => e.relationship_type === 'belongs_to_encounter'), 'Should create Patient -> Encounter edge');
    assert(edges.some(e => e.relationship_type === 'diagnosed_with'), 'Should create diagnosed_with edge');
    assert(edges.some(e => e.relationship_type === 'prescribed'), 'Should create prescribed edge');

    // Test 3: Medical Memory Sync (Phase 3)
    console.log('[Test 3] Syncing Medical Memory back to patient profile...');
    await MedicalGraphService.syncMemory(patientId, mockDb, true);

    const patient = mockDb.query('patients').select().eq('id', patientId).single().data;
    assert(
      patient.known_chronic_conditions.includes('Hypertension'),
      'Profile must list Hypertension in chronic conditions'
    );
    assert(
      patient.current_long_term_medications.includes('Metformin'),
      'Profile must list Metformin in long term medications'
    );

    // Test 4: Clinical Reasoning Insights (Phase 4)
    console.log('[Test 4] Clinical Reasoning insights generation...');

    // Seed lab results for HbA1c (worsening)
    mockDb.query('lab_results').insert({
      id: 'lab-graph-1',
      patient_id: patientId,
      record_id: 'rec-lab-graph-1',
      test_name: 'HbA1c',
      value: '5.9',
      unit: '%',
      test_date: '2026-01-10',
      verification_status: 'verified',
      source_document_id: 'doc-graph-1'
    });

    mockDb.query('lab_results').insert({
      id: 'lab-graph-2',
      patient_id: patientId,
      record_id: 'rec-lab-graph-2',
      test_name: 'HbA1c',
      value: '6.7',
      unit: '%',
      test_date: '2026-07-18',
      verification_status: 'verified',
      source_document_id: 'doc-graph-1'
    });

    // Seed repeated antibiotic courses
    mockDb.query('medications').insert({
      id: 'med-graph-2',
      patient_id: patientId,
      record_id: 'rec-med-graph-2',
      medicine_name: 'Amoxicillin 500mg',
      verification_status: 'verified',
      source_document_id: 'doc-graph-1'
    });

    mockDb.query('medications').insert({
      id: 'med-graph-3',
      patient_id: patientId,
      record_id: 'rec-med-graph-3',
      medicine_name: 'Azithromycin 250mg',
      verification_status: 'verified',
      source_document_id: 'doc-graph-1'
    });

    mockDb.query('medications').insert({
      id: 'med-graph-4',
      patient_id: patientId,
      record_id: 'rec-med-graph-4',
      medicine_name: 'Ciprofloxacin 500mg',
      verification_status: 'verified',
      source_document_id: 'doc-graph-1'
    });

    const insights = await MedicalGraphService.generateClinicalInsights(patientId, mockDb, true);
    
    // Check HbA1c Progression Alert
    const hasGlycemicAlert = insights.some(i => i.title.includes('Diabetes Progression') && i.severity === 'critical');
    assert(hasGlycemicAlert, 'Should generate critical progression alert for HbA1c rising from 5.9% to 6.7%');

    // Check Antibiotics Alert
    const hasAntibioticsAlert = insights.some(i => i.title.includes('Frequent Antibiotic'));
    assert(hasAntibioticsAlert, 'Should generate alert for repeated antibiotics use');

    // Verify citations
    const firstInsight = insights.find(i => i.title.includes('Diabetes Progression'));
    assert(firstInsight !== undefined, 'Insight must exist');
    assert(firstInsight!.citations.length >= 2, 'Insight must have multiple citations detailing dates and values');
    assert(firstInsight!.citations[0].snippet.includes('5.9%'), 'Citation snippet must show original value');
    assert(firstInsight!.citations[1].snippet.includes('6.7%'), 'Citation snippet must show progressed value');

    // Test 5: Continuous Learning feedback loop (Phase 8)
    console.log('[Test 5] Continuous Learning feedback loop storage...');
    const originalOcrText = 'Patient prescribed Glucophage tab 500 mg daily';
    const originalPayload = { medications: [{ medicineName: 'Glucophage tab 500 mg', confidence: 0.85 }] };
    const correctedPayload = { medications: [{ medicineName: 'Metformin 500mg', confidence: 1.0 }] };
    const reviewerEdits = { fieldName: 'medicine_name', oldValue: 'Glucophage tab 500 mg', newValue: 'Metformin 500mg' };

    await MedicalGraphService.saveCorrectionFeedback(
      patientId,
      'doc-graph-1',
      originalOcrText,
      originalPayload,
      correctedPayload,
      reviewerEdits,
      mockDb,
      true
    );

    const feedbackList = mockDb.query('feedback_training_data').select().eq('patient_id', patientId).data || [];
    assert(feedbackList.length === 1, 'Should save exactly one correction feedback entry');
    assert(feedbackList[0].original_ocr === originalOcrText, 'OCR text must match original transcription');
    assert(feedbackList[0].reviewer_edits.newValue === 'Metformin 500mg', 'Edits log must preserve correct value');

    console.log('\n=== ALL PATIENT KNOWLEDGE GRAPH & REASONING TESTS PASSED SUCCESSFULLY ===');
  } catch (error: any) {
    console.error('\n❌ Test execution failed:');
    console.error(error.stack || error.message);
    process.exit(1);
  }
}

runGraphTests();

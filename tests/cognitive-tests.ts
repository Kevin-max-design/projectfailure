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

async function runCognitiveTests() {
  console.log('================================================================');
  console.log('         MEDMEMORY COGNITIVE MEDICAL OS SYSTEM TESTS            ');
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
      known_allergies: ['Sulfa'],
      known_chronic_conditions: [],
      current_long_term_medications: []
    });

    // Test 1: Encounter Clustering (Phase 1)
    console.log('[Test 1] Encounter clustering (multi-document grouping)...');

    // Seed two documents uploaded on same admission (3-day window) at same hospital
    mockDb.query('documents').insert({
      id: 'doc-enc-1',
      patient_id: patientId,
      file_name: 'Admission Notes.pdf',
      created_at: '2026-07-10T10:00:00Z',
      metadata: { hospital_name: 'Apollo Hospital' }
    });

    mockDb.query('documents').insert({
      id: 'doc-enc-2',
      patient_id: patientId,
      file_name: 'Lab Report.pdf',
      created_at: '2026-07-11T14:30:00Z',
      metadata: { hospital_name: 'Apollo Hospital' }
    });

    await MedicalGraphService.buildGraphFromRecords(patientId, mockDb, true);

    const nodes = mockDb.query('graph_nodes').select().eq('patient_id', patientId).data || [];
    const encounterNodes = nodes.filter(n => n.entity_type === 'Encounter');

    assert(
      encounterNodes.length === 1,
      `Should cluster the two documents into exactly 1 Encounter node, found: ${encounterNodes.length}`
    );
    assert(
      encounterNodes[0].properties.documents_count === 2,
      'Encounter documents count must be exactly 2'
    );
    assert(
      encounterNodes[0].properties.hospital_name === 'Apollo Hospital',
      'Encounter hospital must resolve to Apollo Hospital'
    );

    // Test 2: Disease Journey lifecycle timelines (Phase 2)
    console.log('[Test 2] Disease Journey timeline mapping...');
    
    // Seed diagnosis progression
    mockDb.query('diagnoses').insert({
      id: 'dx-j-1',
      patient_id: patientId,
      record_id: 'rec-dx-j-1',
      name: 'Diabetes',
      is_chronic: false,
      verification_status: 'verified',
      created_at: '2026-01-10T10:00:00Z'
    });

    mockDb.query('diagnoses').insert({
      id: 'dx-j-2',
      patient_id: patientId,
      record_id: 'rec-dx-j-2',
      name: 'Type 2 Diabetes Mellitus',
      is_chronic: true,
      notes: 'Worsening control',
      verification_status: 'corrected',
      created_at: '2026-07-18T10:00:00Z'
    });

    const journeys = await MedicalGraphService.analyzeDiseaseJourneys(patientId, mockDb, true);
    
    assert(journeys['Type 2 Diabetes Mellitus'] !== undefined, 'Should map under Type 2 Diabetes Mellitus concept');
    assert(journeys['Type 2 Diabetes Mellitus'].status === 'Progressing', 'Latest status must be Progressing');
    assert(journeys['Type 2 Diabetes Mellitus'].timeline.length === 2, 'Should record 2 timeline milestones');

    // Test 3: Medication Switches (Phase 3)
    console.log('[Test 3] Medication Switches (Amlodipine to Telmisartan)...');
    
    // Seed Amlodipine (stopped/switched)
    mockDb.query('medications').insert({
      id: 'med-s-1',
      patient_id: patientId,
      record_id: 'rec-med-s-1',
      medicine_name: 'Amlodipine 5mg',
      start_date: '2026-01-10',
      verification_status: 'verified',
      created_at: '2026-01-10T10:00:00Z'
    });

    // Seed high blood pressure lab evidence
    mockDb.query('lab_results').insert({
      id: 'lab-s-1',
      patient_id: patientId,
      record_id: 'rec-lab-s-1',
      test_name: 'Blood Pressure',
      value: '155',
      test_date: '2026-07-10',
      verification_status: 'verified'
    });

    // Seed Telmisartan (substitute)
    mockDb.query('medications').insert({
      id: 'med-s-2',
      patient_id: patientId,
      record_id: 'rec-med-s-2',
      medicine_name: 'Telmisartan 40mg',
      start_date: '2026-07-12',
      verification_status: 'verified',
      created_at: '2026-07-12T10:00:00Z'
    });

    const switches = await MedicalGraphService.detectMedicationSwitches(patientId, mockDb, true);
    const replacement = switches.find(s => s.type === 'Replacement');
    
    assert(replacement !== undefined, 'Should identify replacement medication switch');
    assert(replacement.from === 'Amlodipine', 'Switch from Amlodipine');
    assert(replacement.to === 'Telmisartan', 'Switch to Telmisartan');
    assert(replacement.reason === 'Blood pressure uncontrolled', 'Correctly infer reason from BP evidence');

    // Test 4: Laboratory Panels (Phase 4)
    console.log('[Test 4] Laboratory panel metrics & persistent abnormality...');
    
    // Seed HbA1c tests
    mockDb.query('lab_results').insert({
      id: 'lab-p-1',
      patient_id: patientId,
      record_id: 'rec-lab-p-1',
      test_name: 'HbA1c',
      value: '5.8',
      unit: '%',
      test_date: '2026-01-10',
      verification_status: 'verified',
      abnormal_flag: true
    });

    mockDb.query('lab_results').insert({
      id: 'lab-p-2',
      patient_id: patientId,
      record_id: 'rec-lab-p-2',
      test_name: 'HbA1c',
      value: '6.4',
      unit: '%',
      test_date: '2026-07-18',
      verification_status: 'verified',
      abnormal_flag: true
    });

    const panels = await MedicalGraphService.computeLabPanels(patientId, mockDb, true);
    const diabetesPanel = panels['Diabetes Profile'];
    
    assert(diabetesPanel !== undefined, 'Should group under Diabetes Profile panel');
    assert(diabetesPanel['HBA1C'].latest === '6.4 %', 'Latest value must be 6.4 %');
    assert(diabetesPanel['HBA1C'].highest === '6.4 %', 'Highest value must be 6.4 %');
    assert(diabetesPanel['HBA1C'].lowest === '5.8 %', 'Lowest value must be 5.8 %');
    assert(diabetesPanel['HBA1C'].persistent_abnormality === true, 'Persistent abnormality must be true (2 abnormal tests)');

    // Test 5: Memory Compression (Phase 6)
    console.log('[Test 5] Memory Compression context formatting...');
    
    // Rebuild graph to include recent nodes
    await MedicalGraphService.buildGraphFromRecords(patientId, mockDb, true);

    const compactMemory = await MedicalGraphService.generateCompressedMemory(patientId, mockDb, true);
    
    assert(compactMemory.includes('Arjun Rao'), 'Memory must include patient name');
    assert(compactMemory.includes('Type 2 Diabetes Mellitus'), 'Memory must include chronic diagnosis');
    assert(compactMemory.includes('Sulfa'), 'Memory must include allergies');

    // Test 6: Continuous Learning versioned feedback loop (Phase 8)
    console.log('[Test 6] Continuous Learning versioned corrections feedback loop...');
    
    await MedicalGraphService.saveCorrectionFeedback(
      patientId,
      'doc-enc-1',
      'Raw text',
      { original: true },
      { corrected: true },
      { change: 'edit' },
      mockDb,
      true,
      'Dose correction by physician',
      2 // version 2
    );

    const feedback = mockDb.query('feedback_training_data').select().eq('patient_id', patientId).data || [];
    assert(feedback.length === 1, 'Should log feedback record');
    assert(feedback[0].reason_for_correction === 'Dose correction by physician', 'Should save correct reason');
    assert(feedback[0].version === 2, 'Should save version number 2');

    console.log('\n=== ALL COGNITIVE OS SYSTEM TESTS PASSED SUCCESSFULLY ===');
  } catch (error: any) {
    console.error('\n❌ Test execution failed:');
    console.error(error.stack || error.message);
    process.exit(1);
  }
}

runCognitiveTests();

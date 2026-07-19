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
import { LongitudinalBrainService } from '../src/lib/services/longitudinal-brain';

// Basic Assert function
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`✓ Passed: ${message}`);
}

async function runLongitudinalTests() {
  console.log('================================================================');
  console.log('         MEDMEMORY LONGITUDINAL MEDICAL BRAIN TESTS            ');
  console.log('================================================================\n');

  try {
    const patientId = DEMO_PATIENT.id;

    // Reset database state for tests
    localStorage.removeItem('medmemory_seeded');
    localStorage.removeItem('medmemory_patients');
    localStorage.removeItem('medmemory_diagnoses');
    localStorage.removeItem('medmemory_medications');
    localStorage.removeItem('medmemory_lab_results');
    localStorage.removeItem('medmemory_raw_extractions');

    // Re-seed patients to have clean profile
    mockDb.query('patients').insert({
      id: patientId,
      user_id: '00000000-0000-0000-0000-000000000001',
      full_name: 'Arjun Rao',
      date_of_birth: '1980-01-01',
      known_allergies: ['Penicillin'],
      known_chronic_conditions: [],
      current_long_term_medications: []
    });

    // Test 1: Chronic Conditions Synchronization
    console.log('[Test 1] Chronic condition profile synchronization...');
    mockDb.query('diagnoses').insert({
      id: 'test-dx-1',
      patient_id: patientId,
      record_id: 'rec-dx-1',
      name: 'Type 2 Diabetes Mellitus',
      is_chronic: true,
      verification_status: 'verified'
    });

    mockDb.query('diagnoses').insert({
      id: 'test-dx-2',
      patient_id: patientId,
      record_id: 'rec-dx-2',
      name: 'Acute Bronchitis',
      is_chronic: false, // Acute condition
      verification_status: 'verified'
    });

    await LongitudinalBrainService.syncProfileFromRecords(patientId, mockDb, true);

    const patientAfterDx = mockDb.query('patients').select().eq('id', patientId).single().data;
    assert(
      patientAfterDx.known_chronic_conditions.includes('Type 2 Diabetes Mellitus'),
      'Should sync verified chronic condition to patient profile'
    );
    assert(
      !patientAfterDx.known_chronic_conditions.includes('Acute Bronchitis'),
      'Should NOT sync acute condition to chronic conditions profile list'
    );

    // Test 2: Maintenance Medication Synchronization
    console.log('[Test 2] Maintenance medication profile synchronization...');
    mockDb.query('medications').insert({
      id: 'test-med-1',
      patient_id: patientId,
      record_id: 'rec-med-1',
      medicine_name: 'Metformin 500mg',
      duration: 'Ongoing daily use',
      verification_status: 'verified'
    });

    mockDb.query('medications').insert({
      id: 'test-med-2',
      patient_id: patientId,
      record_id: 'rec-med-2',
      medicine_name: 'Amoxicillin 250mg',
      duration: '5 days', // Short course
      verification_status: 'verified'
    });

    await LongitudinalBrainService.syncProfileFromRecords(patientId, mockDb, true);

    const patientAfterMed = mockDb.query('patients').select().eq('id', patientId).single().data;
    assert(
      patientAfterMed.current_long_term_medications.includes('Metformin 500mg'),
      'Should sync maintenance medication Metformin to current medications list'
    );
    assert(
      !patientAfterMed.current_long_term_medications.includes('Amoxicillin 250mg'),
      'Should NOT sync short-term Amoxicillin to long-term medications list'
    );

    // Test 3: Allergy Synchronization from raw payloads
    console.log('[Test 3] Allergy profile synchronization from raw extractions...');
    mockDb.query('raw_extractions').insert({
      id: 'test-raw-1',
      document_id: 'doc-1',
      patient_id: patientId,
      raw_payload: {
        allergies: [{ value: 'Sulfa Drugs' }, { value: 'Aspirin' }]
      },
      extraction_method: 'demo'
    });

    await LongitudinalBrainService.syncProfileFromRecords(patientId, mockDb, true);

    const patientAfterAllergies = mockDb.query('patients').select().eq('id', patientId).single().data;
    assert(
      patientAfterAllergies.known_allergies.includes('Sulfa Drugs') && patientAfterAllergies.known_allergies.includes('Aspirin'),
      'Should sync newly discovered allergies from raw extraction payload'
    );
    assert(
      patientAfterAllergies.known_allergies.includes('Penicillin'),
      'Should preserve pre-existing profile allergies'
    );

    // Test 4: Clinical Safety Checks — Duplicate Active Medications
    console.log('[Test 4] Clinical Safety Engine — duplicate active medication check...');
    // Seed duplicate active Metformin
    mockDb.query('medications').insert({
      id: 'test-med-3',
      patient_id: patientId,
      record_id: 'rec-med-3',
      medicine_name: 'Metformin 1000mg',
      duration: 'Chronic use',
      verification_status: 'verified'
    });

    const duplicateAlerts = await LongitudinalBrainService.runClinicalSafetyCheck(patientId, mockDb, true);
    const hasDuplicateAlert = duplicateAlerts.some(a => a.type === 'duplicate' && a.message.includes('Metformin'));
    assert(hasDuplicateAlert, 'Safety Engine must identify multiple active Metformin prescriptions');

    // Test 5: Clinical Safety Checks — Drug-Allergy Warning
    console.log('[Test 5] Clinical Safety Engine — drug-allergy warning check...');
    // Active medication is Aspirin, which patient has allergy to
    mockDb.query('medications').insert({
      id: 'test-med-4',
      patient_id: patientId,
      record_id: 'rec-med-4',
      medicine_name: 'Aspirin 81mg',
      duration: 'Daily',
      verification_status: 'verified'
    });

    const allergyAlerts = await LongitudinalBrainService.runClinicalSafetyCheck(patientId, mockDb, true);
    const hasAllergyConflict = allergyAlerts.some(a => a.type === 'allergy_conflict' && a.message.includes('Aspirin'));
    assert(hasAllergyConflict, 'Safety Engine must warn when prescribing Aspirin to patient allergic to Aspirin');

    // Test 6: Clinical Safety Checks — Drug-Drug Interaction Warning
    console.log('[Test 6] Clinical Safety Engine — critical drug-drug interaction check...');
    // Add Warfarin to active list (Aspirin is already active from Test 5)
    mockDb.query('medications').insert({
      id: 'test-med-5',
      patient_id: patientId,
      record_id: 'rec-med-5',
      medicine_name: 'Warfarin 5mg',
      duration: 'Ongoing',
      verification_status: 'verified'
    });

    const interactionAlerts = await LongitudinalBrainService.runClinicalSafetyCheck(patientId, mockDb, true);
    const hasInteractionAlert = interactionAlerts.some(a => a.type === 'drug_interaction' && a.message.includes('Aspirin') && a.message.includes('Warfarin'));
    assert(hasInteractionAlert, 'Safety Engine must flag critical interaction between Aspirin and Warfarin');

    // Test 7: Lab Trend Analyzer — Chronological trend report calculation
    console.log('[Test 7] Lab Trend Analyzer — chronological values & trend arrows...');
    // Seed historical HbA1c lab tests
    mockDb.query('lab_results').insert({
      id: 'lab-1',
      patient_id: patientId,
      record_id: 'rec-lab-1',
      test_name: 'HbA1c',
      value: '5.8',
      unit: '%',
      test_date: '2026-01-10',
      verification_status: 'verified'
    });

    mockDb.query('lab_results').insert({
      id: 'lab-2',
      patient_id: patientId,
      record_id: 'rec-lab-2',
      test_name: 'HbA1c',
      value: '6.2',
      unit: '%',
      test_date: '2026-03-15',
      verification_status: 'verified'
    });

    mockDb.query('lab_results').insert({
      id: 'lab-3',
      patient_id: patientId,
      record_id: 'rec-lab-3',
      test_name: 'HbA1c',
      value: '6.5',
      unit: '%',
      test_date: '2026-07-18',
      verification_status: 'verified'
    });

    const trendReport = await LongitudinalBrainService.analyzeLabTrends(patientId, 'hba1c', mockDb, true);
    assert(trendReport !== null, 'Should return a valid trend report for HbA1c');
    assert(trendReport!.points.length === 3, `Should extract exactly 3 historical points, got ${trendReport!.points.length}`);
    assert(trendReport!.points[0].date === '2026-01-10', 'First data point must be the earliest chronological test');
    assert(trendReport!.points[2].date === '2026-07-18', 'Last data point must be the latest chronological test');
    assert(trendReport!.trendDirection === 'UPWARD', `Trend direction should be UPWARD (rising value), got ${trendReport!.trendDirection}`);
    console.log(`HbA1c Trend Report: latest=${trendReport!.latestValue}%, direction=${trendReport!.trendDirection}, min=${trendReport!.minVal}%, max=${trendReport!.maxVal}%`);

    console.log('\n=== ALL LONGITUDINAL MEDICAL BRAIN TESTS PASSED SUCCESSFULLY ===');
  } catch (error: any) {
    console.error('\n❌ Test execution failed:');
    console.error(error.stack || error.message);
    process.exit(1);
  }
}

runLongitudinalTests();

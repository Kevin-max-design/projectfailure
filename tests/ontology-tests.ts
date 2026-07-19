import { DeterministicMedicalClassifier } from '../src/lib/medical/classifier/deterministic-classifier';
import { OntologyExtractors } from '../src/lib/medical/extractor/ontology-extractors';
import { OntologyValidators } from '../src/lib/medical/validator/ontology-validators';
import { getSubtypeConfig } from '../src/lib/medical/ontology/registry';

// Mock OCR Text for testing
const mockCbcText = `
Apollo Health Diagnostics
PATIENT NAME: John Doe  AGE: 34 Y  GENDER: Male
DATE: 2026-05-15
COMPLETE BLOOD COUNT (CBC) REPORT
=================================
HEMOGLOBIN (Hb)        : 14.5 g/dL     (Ref: 12.0 - 16.0)
Total WBC Count        : 6.8 10^3/uL   (Ref: 4.0 - 11.0)
Red Blood Cell (RBC)   : 4.8 10^6/uL   (Ref: 4.5 - 5.9)
Platelet Count         : 250 10^3/uL   (Ref: 150 - 450)
`;

const mockPrescriptionText = `
Dr. Ramesh Kumar, MD
Cardiology Clinic
Name: John Doe
Date: 2026-05-15
Rx
Metformin 500mg - Take 1 tab twice daily (BD) after food.
Lisinopril 10mg - Once daily (OD) in the morning.
`;

const mockCorruptedPrescriptionText = `
Dr. Ramesh Kumar, MD
Name: John Doe
Rx
Tablet ${'A'.repeat(150)} 500mg - 1 tab twice daily.
`;

const mockLipidText = `
LabOne Diagnostics
Patient Name: Jane Smith
Date: 2026-06-12
LIPID PROFILE TEST
==================
Cholesterol Total      : 220 mg/dL     (Ref: < 200)
Triglycerides          : 165 mg/dL     (Ref: < 150)
HDL Cholesterol        : 35 mg/dL      (Ref: > 40)
LDL Cholesterol        : 130 mg/dL     (Ref: < 100)
`;

const mockHbA1cText = `
Global Diabetes Center
Patient Name: Alice Johnson
DATE: 2026-06-14
HbA1c (Glycated Hemoglobin) report:
HbA1c value            : 6.8 %         (Ref: 4.0 - 5.6)
Mean Plasma Glucose    : 140 mg/dL
`;

const mockOpBillText = `
City Hospital Billing
Receipt No: R-99382
Date: 2026-06-15
OP Consultation Receipt
-----------------------
Consultation Charges   : 500.00 INR
Registration Fee       : 100.00 INR
CGST (9%)              : 54.00 INR
SGST (9%)              : 54.00 INR
Total Paid Amount      : 708.00 INR
`;

async function runTests() {
  console.log('--- STARTING ONTOLOGY HYBRID INTELLIGENCE PIPELINE TESTS ---');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      passed++;
      console.log(`[PASS] ${msg}`);
    } else {
      failed++;
      console.error(`[FAIL] ${msg}`);
    }
  };

  const classifier = new DeterministicMedicalClassifier();
  const extractors = new OntologyExtractors();
  const validators = new OntologyValidators();

  // Test 1: Deterministic CBC Classification
  console.log('\nTest 1: Classifying CBC report...');
  const cbcClassResult = classifier.classify(mockCbcText);
  assert(cbcClassResult.documentType === 'CBC', `Should classify CBC text as 'CBC', got: ${cbcClassResult.documentType}`);
  assert(cbcClassResult.confidenceScore >= 0.90, `CBC classification confidence should be high (>= 90%), got: ${cbcClassResult.confidenceScore}`);
  assert(cbcClassResult.patientName === 'John Doe', `Should extract patient name 'John Doe', got: ${cbcClassResult.patientName}`);
  assert(cbcClassResult.hospitalName === 'Apollo Health Diagnostics', `Should extract hospital name, got: ${cbcClassResult.hospitalName}`);

  // Test 2: Deterministic Prescription Classification
  console.log('\nTest 2: Classifying Prescription...');
  const rxClassResult = classifier.classify(mockPrescriptionText);
  assert(rxClassResult.documentType === 'Prescription', `Should classify prescription as 'Prescription', got: ${rxClassResult.documentType}`);
  assert(rxClassResult.confidenceScore >= 0.85, `Prescription confidence should be high (>= 85%), got: ${rxClassResult.confidenceScore}`);
  assert(rxClassResult.doctorName === 'Ramesh Kumar', `Should extract doctor name 'Ramesh Kumar', got: ${rxClassResult.doctorName}`);

  // Test 3: Deterministic CBC Extraction
  console.log('\nTest 3: Extracting CBC metrics...');
  const cbcExtraction = await extractors.extract(mockCbcText, cbcClassResult);
  assert(cbcExtraction.documentType === 'LAB_REPORT', `Should output LAB_REPORT document type`);
  const hbResult = cbcExtraction.labResults?.find(r => r.testName === 'HEMOGLOBIN');
  assert(hbResult !== undefined, 'Should extract Hemoglobin results');
  assert(hbResult?.value === '14.5', `Hemoglobin value should be 14.5, got: ${hbResult?.value}`);
  assert(hbResult?.unit === 'g/dL', `Hemoglobin unit should be g/dL, got: ${hbResult?.unit}`);

  const pltResult = cbcExtraction.labResults?.find(r => r.testName === 'PLATELETS');
  assert(pltResult !== undefined, 'Should extract Platelet count');
  assert(pltResult?.value === '250', `Platelet value should be 250, got: ${pltResult?.value}`);

  // Test 4: Deterministic Prescription Extraction
  console.log('\nTest 4: Extracting Medications...');
  const rxExtraction = await extractors.extract(mockPrescriptionText, rxClassResult);
  assert(rxExtraction.documentType === 'PRESCRIPTION', 'Should output PRESCRIPTION document type');
  assert(rxExtraction.medications?.length === 2, `Should extract 2 medications, got: ${rxExtraction.medications?.length}`);
  const metformin = rxExtraction.medications?.find(m => m.medicineName.includes('Metformin'));
  assert(metformin !== undefined, 'Should extract Metformin');
  assert(metformin?.dosage === '500mg', `Metformin dosage should be 500mg, got: ${metformin?.dosage}`);
  assert(metformin?.frequency === 'Twice Daily', `Metformin frequency should be 'Twice Daily', got: ${metformin?.frequency}`);

  // Test 5: Validation Reject Safeguard (Entire report mapping anomaly)
  console.log('\nTest 5: Validating corrupted prescription extraction...');
  const corruptedRxClass = classifier.classify(mockCorruptedPrescriptionText);
  const corruptedExtraction = await extractors.extract(mockCorruptedPrescriptionText, corruptedRxClass);
  
  const validationResult = validators.validate(corruptedExtraction as any, 'Prescription');
  assert(validationResult.isValid === false, 'Validation should fail for corrupted long medication names');
  const hasAnomalyError = validationResult.errors.some(e => e.error.includes('Anomaly detected'));
  assert(hasAnomalyError, 'Should generate an anomaly warning error for excessively long medication name');

  // Test 6: Deterministic Lipid Profile Classification & Extraction
  console.log('\nTest 6: Classifying and Extracting Lipid Profile...');
  const lipidClassResult = classifier.classify(mockLipidText);
  assert(lipidClassResult.documentType === 'Lipid Profile', `Should classify Lipid text as 'Lipid Profile', got: ${lipidClassResult.documentType}`);
  const lipidExtraction = await extractors.extract(mockLipidText, lipidClassResult);
  const totalChol = lipidExtraction.labResults?.find(r => r.testName === 'Cholesterol Total');
  assert(totalChol !== undefined && totalChol.value === '220' && totalChol.abnormalFlag === true, 'Total Cholesterol should be 220 and flagged abnormal');
  const hdlChol = lipidExtraction.labResults?.find(r => r.testName === 'HDL Cholesterol');
  assert(hdlChol !== undefined && hdlChol.value === '35' && hdlChol.abnormalFlag === true, 'HDL should be 35 and flagged abnormal (low)');
  const lipidValResult = validators.validate(lipidExtraction as any, 'Lipid Profile');
  assert(lipidValResult.isValid === true, 'Lipid Profile should pass validation checks');

  // Test 7: Deterministic HbA1c Classification, Extraction & Validation
  console.log('\nTest 7: Classifying and Extracting HbA1c...');
  const hba1cClassResult = classifier.classify(mockHbA1cText);
  assert(hba1cClassResult.documentType === 'HbA1c', `Should classify HbA1c text as 'HbA1c', got: ${hba1cClassResult.documentType}`);
  const hba1cExtraction = await extractors.extract(mockHbA1cText, hba1cClassResult);
  const hba1cVal = hba1cExtraction.labResults?.find(r => r.testName === 'HbA1c');
  assert(hba1cVal !== undefined && hba1cVal.value === '6.8' && hba1cVal.abnormalFlag === true, 'HbA1c value should be 6.8% and flagged abnormal');
  const hba1cValResult = validators.validate(hba1cExtraction as any, 'HbA1c');
  assert(hba1cValResult.isValid === true, 'HbA1c should pass validation checks');

  // Test 8: Deterministic OP Bill Classification & Extraction
  console.log('\nTest 8: Classifying and Extracting OP Bill...');
  const billClassResult = classifier.classify(mockOpBillText);
  assert(billClassResult.documentType === 'OP Bill', `Should classify OP bill as 'OP Bill', got: ${billClassResult.documentType}`);
  const billExtraction = await extractors.extract(mockOpBillText, billClassResult);
  const paidInfo = billExtraction.unmappedDocumentedInformation?.find(u => u.text.includes('Total Paid Amount'));
  assert(paidInfo !== undefined && paidInfo.text.includes('708.00'), `Should extract total paid amount of 708.00, got: ${paidInfo?.text}`);

  console.log(`\n--- TESTS COMPLETE: ${passed} passed, ${failed} failed ---`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test run crashed:', err);
  process.exit(1);
});

import { DocumentClassifier } from '../src/lib/extraction/classifier';
import { SpecializedExtractors } from '../src/lib/extraction/extractors';

const OCR_TEXT = `DEPARTMENT |
MPatient Name! Mr. AKEVIN Bill Date + 12-May-2026 | 7:31 PM!
Report Date, ; 12-May-2026 08:21 PM
ny Ref By + DR.Bhargava Reddy N) di Parameter Results a COMPLETE BLOOD COUNT a) ie Haemoglobin 15.6 gm% ; one Haemotocrit(PCV) 49,1 Vol% peo ape _, Impedan — RBC Count *5.63 Millions/cumm a : A ¥ oe iC Hi: ram ) «Mean Cell Volume (Mcv) —87.3 fl a el ee coe R = Mean Cell Haemoglobin 27.8 pg falculation (MCH) ‘ { Mean Cell' Haemoglobin - 31.8° gms% © iC Concentration (MCHC) ; i WBC Count *15.74 x1043/uL v. DIFFERENTIAL COUNT as: Neutrophils” « *78 % ; Lymphocytes : 417 (% Eosinophils i OD ae aa: i Monocytes: Wings 04 % Platelet count 379 X10%3/uL : 400. 1043 /uL nia edance/ Light Microscopy ! 4)
Suggested Clinical Correlation * If neccessary, Please GAMES By : Test results related only to the item tested,
No part of the report can be reproduced without written petiniss Verified By : 405 Approved By : 405...
-Hareesh Kumar A, MD (Path) NSUETANT Gh (OrOcksy
ratory. ‘ a Dispatched By: S Page 2 of 2`;

async function testCBCExtraction() {
  console.log("=== STARTING CBC EXTRACTION RULE TEST ===");
  
  const classifier = new DocumentClassifier();
  const classification = (classifier as any).classifyPatternBased(OCR_TEXT);
  
  console.log("\nClassification Type:", classification.documentType);
  console.log("Classification Reasoning:", classification.explanation);
  
  if (classification.documentType !== 'LAB_REPORT') {
    console.error("FAIL: Document should be classified as LAB_REPORT");
    process.exit(1);
  }
  console.log("✓ SUCCESS: Classified as LAB_REPORT");

  const extractor = new SpecializedExtractors();
  const extraction = (extractor as any).extractRulesFallback(OCR_TEXT, classification.documentType);
  
  console.log("\nExtracted Medications count:", extraction.medications?.length || 0);
  console.log("Extracted Lab Results count:", extraction.labResults?.length || 0);
  
  if (extraction.medications && extraction.medications.length > 0) {
    console.error("FAIL: Should not have extracted medications from a CBC report");
    console.error("Medications extracted:", JSON.stringify(extraction.medications, null, 2));
    process.exit(1);
  }
  console.log("✓ SUCCESS: No medications extracted");

  if (!extraction.labResults || extraction.labResults.length === 0) {
    console.error("FAIL: Should have extracted lab results");
    process.exit(1);
  }
  console.log("✓ SUCCESS: Extracted lab results:");
  for (const lab of extraction.labResults) {
    console.log(`  - ${lab.testName}: ${lab.value} ${lab.unit}`);
  }
  
  console.log("\n=== ALL TEST CHECKS PASSED ===");
}

testCBCExtraction().catch(err => {
  console.error(err);
  process.exit(1);
});

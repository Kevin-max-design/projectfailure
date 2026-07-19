"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoMedicalExtractionProvider = exports.MedicalExtractionSchema = exports.CoverageMetricsSchema = exports.UnmappedDocumentedInformationSchema = exports.ExtractedUnreadableSectionSchema = exports.ExtractedProcedureSchema = exports.ExtractedLabResultSchema = exports.ExtractedMedicationSchema = exports.ExtractedDiagnosisSchema = exports.DischargePlanSchema = exports.TreatmentSchema = exports.InvestigationSchema = exports.ExtractedImagingStudySchema = exports.ExaminationSchema = exports.VitalsSchema = exports.ClinicalInformationSchema = exports.PatientDetailsSchema = exports.EncounterDetailsSchema = exports.ExtractedValueSchema = void 0;
const zod_1 = require("zod");
// Base schema for simple text values with source tracing and confidence
exports.ExtractedValueSchema = zod_1.z.object({
    value: zod_1.z.string().nullable(),
    confidence: zod_1.z.number().optional().default(1.0),
    sourceText: zod_1.z.string().nullable(),
    page: zod_1.z.number().optional()
});
// Encounter Details
exports.EncounterDetailsSchema = zod_1.z.object({
    hospitalName: exports.ExtractedValueSchema.nullable().optional(),
    clinicName: exports.ExtractedValueSchema.nullable().optional(),
    doctorName: exports.ExtractedValueSchema.nullable().optional(),
    doctorSpecialization: exports.ExtractedValueSchema.nullable().optional(),
    admissionDate: exports.ExtractedValueSchema.nullable().optional(),
    dischargeDate: exports.ExtractedValueSchema.nullable().optional(),
    visitDate: exports.ExtractedValueSchema.nullable().optional()
});
// Patient Details
exports.PatientDetailsSchema = zod_1.z.object({
    patientNameOnDocument: exports.ExtractedValueSchema.nullable().optional(),
    age: exports.ExtractedValueSchema.nullable().optional(),
    gender: exports.ExtractedValueSchema.nullable().optional(),
    patientIdOrMrn: exports.ExtractedValueSchema.nullable().optional()
});
// Clinical Info
exports.ClinicalInformationSchema = zod_1.z.object({
    chiefComplaints: zod_1.z.array(exports.ExtractedValueSchema).default([]).optional(),
    presentingSymptoms: zod_1.z.array(exports.ExtractedValueSchema).default([]).optional(),
    historyOfPresentIllness: exports.ExtractedValueSchema.nullable().optional(),
    pastMedicalHistory: exports.ExtractedValueSchema.nullable().optional(),
    familyHistory: exports.ExtractedValueSchema.nullable().optional(),
    provisionalDiagnoses: zod_1.z.array(exports.ExtractedValueSchema).default([]).optional(),
    finalDiagnoses: zod_1.z.array(exports.ExtractedValueSchema).default([]).optional(),
    comorbidities: zod_1.z.array(exports.ExtractedValueSchema).default([]).optional()
});
// Examination & Vitals
exports.VitalsSchema = zod_1.z.object({
    bp: exports.ExtractedValueSchema.nullable().optional(),
    hr: exports.ExtractedValueSchema.nullable().optional(),
    temp: exports.ExtractedValueSchema.nullable().optional(),
    rr: exports.ExtractedValueSchema.nullable().optional(),
    spo2: exports.ExtractedValueSchema.nullable().optional()
});
exports.ExaminationSchema = zod_1.z.object({
    vitals: exports.VitalsSchema.optional(),
    generalExamination: exports.ExtractedValueSchema.nullable().optional(),
    systemicExamination: exports.ExtractedValueSchema.nullable().optional(),
    clinicalFindings: exports.ExtractedValueSchema.nullable().optional()
});
// Extracted Imaging Study
exports.ExtractedImagingStudySchema = zod_1.z.object({
    studyName: zod_1.z.string(),
    findings: zod_1.z.string().nullable().optional(),
    impression: zod_1.z.string().nullable().optional(),
    confidence: zod_1.z.number(),
    sourceText: zod_1.z.string().nullable(),
    page: zod_1.z.number().optional()
});
// Investigations
exports.InvestigationSchema = zod_1.z.object({
    testsOrdered: zod_1.z.array(exports.ExtractedValueSchema).default([]).optional(),
    imaging: zod_1.z.array(exports.ExtractedImagingStudySchema).default([]).optional(),
    investigationFindings: exports.ExtractedValueSchema.nullable().optional()
});
// Treatment
exports.TreatmentSchema = zod_1.z.object({
    surgeries: zod_1.z.array(exports.ExtractedValueSchema).default([]).optional(),
    treatmentGiven: exports.ExtractedValueSchema.nullable().optional(),
    hospitalCourse: exports.ExtractedValueSchema.nullable().optional()
});
// Plan / Discharge
exports.DischargePlanSchema = zod_1.z.object({
    dietaryAdvice: exports.ExtractedValueSchema.nullable().optional(),
    activityAdvice: exports.ExtractedValueSchema.nullable().optional(),
    warningSigns: zod_1.z.array(exports.ExtractedValueSchema).default([]).optional(),
    referrals: zod_1.z.array(exports.ExtractedValueSchema).default([]).optional(),
    nextVisit: exports.ExtractedValueSchema.nullable().optional()
});
// Extracted Diagnosis Schema (Entity model)
exports.ExtractedDiagnosisSchema = zod_1.z.object({
    name: zod_1.z.string(),
    onsetWeeks: zod_1.z.number().nullable().optional(),
    isChronic: zod_1.z.boolean().nullable().optional(),
    confidence: zod_1.z.number(),
    sourceText: zod_1.z.string().nullable(),
    page: zod_1.z.number().optional(),
    notes: zod_1.z.string().nullable().optional()
});
// Extracted Medication Schema (Entity model)
exports.ExtractedMedicationSchema = zod_1.z.object({
    medicineName: zod_1.z.string(),
    genericName: zod_1.z.string().nullable().optional(),
    strength: zod_1.z.string().nullable().optional(),
    dosage: zod_1.z.string().nullable().optional(),
    route: zod_1.z.string().nullable().optional(),
    frequency: zod_1.z.string().nullable().optional(),
    duration: zod_1.z.string().nullable().optional(),
    instructions: zod_1.z.string().nullable().optional(),
    startDate: zod_1.z.string().nullable().optional(),
    endDate: zod_1.z.string().nullable().optional(),
    reason: zod_1.z.string().nullable().optional(),
    confidence: zod_1.z.number(),
    sourceText: zod_1.z.string().nullable(),
    page: zod_1.z.number().optional()
});
// Extracted Lab Result Schema (Entity model)
exports.ExtractedLabResultSchema = zod_1.z.object({
    testName: zod_1.z.string(),
    value: zod_1.z.string(),
    unit: zod_1.z.string().nullable().optional(),
    referenceRange: zod_1.z.string().nullable().optional(),
    abnormalFlag: zod_1.z.boolean().nullable().optional(),
    date: zod_1.z.string().nullable().optional(),
    confidence: zod_1.z.number(),
    sourceText: zod_1.z.string().nullable(),
    page: zod_1.z.number().optional(),
    rawValue: zod_1.z.string().nullable().optional(),
    rawUnit: zod_1.z.string().nullable().optional(),
    normalizedValue: zod_1.z.string().nullable().optional(),
    normalizedUnit: zod_1.z.string().nullable().optional(),
    normalizationStatus: zod_1.z.string().nullable().optional()
});
// Extracted Procedure Schema (Entity model)
exports.ExtractedProcedureSchema = zod_1.z.object({
    name: zod_1.z.string(),
    date: zod_1.z.string().nullable().optional(),
    surgeonName: zod_1.z.string().nullable().optional(),
    notes: zod_1.z.string().nullable().optional(),
    confidence: zod_1.z.number(),
    sourceText: zod_1.z.string().nullable(),
    page: zod_1.z.number().optional()
});
// Extracted Unreadable Sections Schema
exports.ExtractedUnreadableSectionSchema = zod_1.z.object({
    description: zod_1.z.string(),
    page: zod_1.z.number().optional()
});
// Unmapped text catcher schema
exports.UnmappedDocumentedInformationSchema = zod_1.z.object({
    text: zod_1.z.string(),
    sectionHeading: zod_1.z.string().nullable().optional(),
    page: zod_1.z.number().optional(),
    sourceText: zod_1.z.string().nullable().optional(),
    confidence: zod_1.z.number().optional().default(1.0)
});
// Coverage metrics schema
exports.CoverageMetricsSchema = zod_1.z.object({
    totalReadableTextBlocks: zod_1.z.number(),
    mappedStructuredBlocks: zod_1.z.number(),
    unmappedBlocks: zod_1.z.number(),
    unreadableBlocks: zod_1.z.number()
});
// Main Expanded Medical Extraction Schema
exports.MedicalExtractionSchema = zod_1.z.object({
    documentType: zod_1.z.enum([
        'Auto Detect',
        'Prescription',
        'Lab Report',
        'Discharge Summary',
        'Imaging Report',
        'Medical Certificate',
        'Vaccination Record',
        'Other',
        'PRESCRIPTION',
        'LAB_REPORT',
        'DISCHARGE_SUMMARY',
        'OP_BILL_RECEIPT',
        'PHARMACY_INVOICE',
        'IMAGING_REPORT',
        'DIAGNOSTIC_ORDER',
        'PROCEDURE_REPORT',
        'MEDICAL_CERTIFICATE',
        'CLINICAL_NOTE',
        'OTHER_MEDICAL_DOCUMENT'
    ]),
    classificationConfidence: zod_1.z.number().optional().default(1.0),
    classificationSource: zod_1.z.string().optional().default('rule_engine'),
    documentTitle: exports.ExtractedValueSchema,
    documentDate: exports.ExtractedValueSchema,
    // Keep these top-level for backward-compatibility with database/pipeline code & demo-data.ts
    hospitalName: exports.ExtractedValueSchema.optional(),
    doctorName: exports.ExtractedValueSchema.optional(),
    doctorSpecialization: exports.ExtractedValueSchema.optional(),
    patientNameOnDocument: exports.ExtractedValueSchema.optional(),
    patientAgeOnDocument: exports.ExtractedValueSchema.optional(),
    // Medical sections
    patientDetails: exports.PatientDetailsSchema.optional(),
    encounterDetails: exports.EncounterDetailsSchema.optional(),
    clinicalInformation: exports.ClinicalInformationSchema.optional(),
    examination: exports.ExaminationSchema.optional(),
    investigations: exports.InvestigationSchema.optional(),
    treatment: exports.TreatmentSchema.optional(),
    dischargePlan: exports.DischargePlanSchema.optional(),
    // Array entities (for timeline and database mapping)
    diagnoses: zod_1.z.array(exports.ExtractedDiagnosisSchema).default([]).optional(),
    medications: zod_1.z.array(exports.ExtractedMedicationSchema).default([]).optional(),
    labResults: zod_1.z.array(exports.ExtractedLabResultSchema).default([]).optional(),
    procedures: zod_1.z.array(exports.ExtractedProcedureSchema).default([]).optional(),
    // Other annotations
    allergies: zod_1.z.array(exports.ExtractedValueSchema).default([]).optional(),
    notes: zod_1.z.array(exports.ExtractedValueSchema).default([]).optional(),
    certificatesOrRecommendations: zod_1.z.array(exports.ExtractedValueSchema).default([]).optional(),
    unreadableSections: zod_1.z.array(exports.ExtractedUnreadableSectionSchema).default([]).optional(),
    // Unmapped/Unstructured content catcher
    unmappedDocumentedInformation: zod_1.z.array(exports.UnmappedDocumentedInformationSchema).default([]).optional(),
    // Coverage statistics (computed deterministically)
    coverageMetrics: exports.CoverageMetricsSchema.optional()
});
class DemoMedicalExtractionProvider {
    async extractMedicalData(ocrText, category) {
        // Artificial delay to simulate AI processing
        await new Promise((resolve) => setTimeout(resolve, 1500));
        // Conforms exactly to the expanded schema
        return {
            documentType: 'DISCHARGE_SUMMARY',
            classificationConfidence: 0.98,
            classificationSource: 'demo_data',
            documentTitle: { value: 'Discharge Summary', confidence: 0.98, sourceText: 'DISCHARGE SUMMARY', page: 1 },
            documentDate: { value: '2026-05-12', confidence: 0.95, sourceText: 'Date of Discharge: 12 May 2026', page: 1 },
            hospitalName: { value: 'Apollo Hospital', confidence: 0.99, sourceText: 'APOLLO HEALTH CITY', page: 1 },
            doctorName: { value: 'Dr. Ramesh Kumar', confidence: 0.94, sourceText: 'Consultant: Dr. Ramesh Kumar', page: 1 },
            doctorSpecialization: { value: 'Gastroenterologist', confidence: 0.92, sourceText: 'Consultant Gastroenterologist', page: 1 },
            patientNameOnDocument: { value: 'Arjun Rao', confidence: 0.99, sourceText: 'Patient Name: Arjun Rao', page: 1 },
            patientAgeOnDocument: { value: '45', confidence: 0.97, sourceText: 'Age: 45 Years', page: 1 },
            patientDetails: {
                patientNameOnDocument: { value: 'Arjun Rao', confidence: 0.99, sourceText: 'Patient Name: Arjun Rao', page: 1 },
                age: { value: '45', confidence: 0.97, sourceText: 'Age: 45 Years', page: 1 },
                gender: { value: 'Male', confidence: 0.95, sourceText: 'Gender: Male', page: 1 },
                patientIdOrMrn: { value: 'MRN-90210', confidence: 0.92, sourceText: 'MRN: 90210', page: 1 }
            },
            encounterDetails: {
                hospitalName: { value: 'Apollo Hospital', confidence: 0.99, sourceText: 'APOLLO HEALTH CITY', page: 1 },
                clinicName: { value: 'Gastroenterology Outpatient', confidence: 0.90, sourceText: 'Dept of Gastroenterology', page: 1 },
                doctorName: { value: 'Dr. Ramesh Kumar', confidence: 0.94, sourceText: 'Consultant: Dr. Ramesh Kumar', page: 1 },
                doctorSpecialization: { value: 'Gastroenterologist', confidence: 0.92, sourceText: 'Consultant Gastroenterologist', page: 1 },
                admissionDate: { value: '2026-05-08', confidence: 0.96, sourceText: 'Date of Admission: 08 May 2026', page: 1 },
                dischargeDate: { value: '2026-05-12', confidence: 0.95, sourceText: 'Date of Discharge: 12 May 2026', page: 1 },
                visitDate: { value: '2026-05-08', confidence: 0.90, sourceText: 'Admitted on 08 May 2026', page: 1 }
            },
            clinicalInformation: {
                chiefComplaints: [
                    { value: 'Severe epigastric pain radiating to the back', confidence: 0.95, sourceText: 'Chief Complaint: Severe epigastric pain', page: 1 },
                    { value: 'Nausea and vomiting', confidence: 0.90, sourceText: 'associated with nausea/vomiting', page: 1 }
                ],
                presentingSymptoms: [
                    { value: 'Epigastric tenderness', confidence: 0.93, sourceText: 'Tenderness in epigastrium', page: 1 }
                ],
                historyOfPresentIllness: { value: 'Patient presented with acute onset epigastric pain after eating a heavy meal.', confidence: 0.90, sourceText: 'Pain started 4 hours post-prandially...', page: 1 },
                pastMedicalHistory: { value: 'Known diabetic on Metformin.', confidence: 0.95, sourceText: 'PMH: Type 2 Diabetes', page: 1 },
                familyHistory: { value: 'Father had history of coronary artery disease.', confidence: 0.85, sourceText: 'Family Hx: Father - CAD', page: 1 },
                provisionalDiagnoses: [
                    { value: 'Acute Pancreatitis', confidence: 0.92, sourceText: 'Impression: Acute pancreatitis', page: 1 }
                ],
                finalDiagnoses: [
                    { value: 'Acute Pancreatitis', confidence: 0.98, sourceText: 'Final Diagnosis: Acute Pancreatitis', page: 1 },
                    { value: 'Type 2 Diabetes Mellitus', confidence: 0.95, sourceText: 'Type 2 Diabetes Mellitus', page: 1 }
                ],
                comorbidities: [
                    { value: 'Hyperlipidemia', confidence: 0.88, sourceText: 'Co-morbidities: Dyslipidemia', page: 1 }
                ]
            },
            examination: {
                vitals: {
                    bp: { value: '120/80 mmHg', confidence: 0.98, sourceText: 'BP: 120/80', page: 1 },
                    hr: { value: '82 bpm', confidence: 0.98, sourceText: 'HR: 82/min', page: 1 },
                    temp: { value: '98.6 F', confidence: 0.95, sourceText: 'Temp: 98.6 F', page: 1 },
                    rr: { value: '16/min', confidence: 0.92, sourceText: 'RR: 16', page: 1 },
                    spo2: { value: '98%', confidence: 0.97, sourceText: 'SpO2: 98% on room air', page: 1 }
                },
                generalExamination: { value: 'Conscious, oriented, cooperative. Mild dehydration present.', confidence: 0.92, sourceText: 'Gen Exam: Conscious, oriented...', page: 1 },
                systemicExamination: { value: 'Per abdomen: Epigastric tenderness present, no guarding or rigidity.', confidence: 0.94, sourceText: 'PA: Tender epigastrium...', page: 1 },
                clinicalFindings: { value: 'No evidence of organ failure or respiratory distress.', confidence: 0.90, sourceText: 'No organ failure detected', page: 1 }
            },
            investigations: {
                testsOrdered: [
                    { value: 'Complete Blood Count', confidence: 0.95, sourceText: 'CBC ordered', page: 1 },
                    { value: 'Lipid Profile', confidence: 0.90, sourceText: 'Lipid profile next week', page: 2 }
                ],
                imaging: [
                    {
                        studyName: 'Contrast Enhanced CT Abdomen',
                        findings: 'Showed diffuse enlargement of pancreas with peripancreatic fat stranding and minimal fluid accumulation.',
                        impression: 'Findings consistent with acute interstitial edematous pancreatitis.',
                        confidence: 0.93,
                        sourceText: 'CECT Abdomen: Pancreas is diffusely enlarged...',
                        page: 1
                    }
                ],
                investigationFindings: { value: 'Serum amylase and lipase were highly elevated. CT scan confirmed acute pancreatitis.', confidence: 0.94, sourceText: 'Amylase/Lipase elevated. CT abdominal findings...', page: 1 }
            },
            treatment: {
                surgeries: [],
                treatmentGiven: { value: 'Intravenous fluids (Normal Saline), analgesics (Tramadol), and bowel rest.', confidence: 0.96, sourceText: 'Bowel rest, IV fluids hydration, pain control...', page: 1 },
                hospitalCourse: { value: 'Patient responded well to conservative management. Pain subsided and oral feeds were restarted on Day 3.', confidence: 0.95, sourceText: 'Pain subsided by Day 2, tolerated liquid diet on Day 3...', page: 1 }
            },
            dischargePlan: {
                dietaryAdvice: { value: 'Low fat diet, split into 5-6 small meals. Avoid alcohol and spicy food.', confidence: 0.95, sourceText: 'Dietary: Low fat, small meals, strict alcohol avoidance', page: 2 },
                activityAdvice: { value: 'Normal activity as tolerated. Avoid strenuous exercise for 2 weeks.', confidence: 0.92, sourceText: 'Normal light activity, no heavy lifting', page: 2 },
                warningSigns: [
                    { value: 'Severe abdominal pain', confidence: 0.97, sourceText: 'Return to ER if severe pain recurs', page: 2 },
                    { value: 'Persistent vomiting or fever', confidence: 0.95, sourceText: 'intolerance to oral feeds or fever', page: 2 }
                ],
                referrals: [
                    { value: 'Endocrinology clinic for diabetes follow-up', confidence: 0.90, sourceText: 'Refer to Endocrine Outpatient', page: 2 }
                ],
                nextVisit: { value: 'Follow up in Outpatient Clinic with Dr. Ramesh Kumar in 1 week.', confidence: 0.96, sourceText: 'Follow up in OPD after 7 days', page: 2 }
            },
            diagnoses: [
                {
                    name: 'Acute Pancreatitis',
                    onsetWeeks: null,
                    isChronic: false,
                    confidence: 0.98,
                    sourceText: 'Final Diagnosis: Acute Pancreatitis',
                    page: 1,
                    notes: 'Severe acute onset, resolved with conservative management'
                },
                {
                    name: 'Type 2 Diabetes Mellitus',
                    onsetWeeks: null,
                    isChronic: true,
                    confidence: 0.95,
                    sourceText: 'History of Type 2 Diabetes Mellitus',
                    page: 1,
                    notes: 'Under control with oral medications'
                }
            ],
            medications: [
                {
                    medicineName: 'Pan 40',
                    genericName: 'Pantoprazole',
                    strength: '40 mg',
                    dosage: '1 tablet',
                    route: 'Oral',
                    frequency: 'Once Daily',
                    duration: '14 days',
                    instructions: 'Before breakfast',
                    startDate: '2026-05-12',
                    confidence: 0.96,
                    sourceText: 'Tab Pan 40 mg OD before breakfast for 2 weeks',
                    page: 2
                },
                {
                    medicineName: 'Metformin',
                    genericName: 'Metformin Hydrochloride',
                    strength: '500 mg',
                    dosage: '1 tablet',
                    route: 'Oral',
                    frequency: 'Twice Daily',
                    duration: 'Ongoing',
                    instructions: 'After food',
                    startDate: '2026-05-12',
                    confidence: 0.94,
                    sourceText: 'Tab Metformin 500 mg BD after breakfast and dinner',
                    page: 2
                }
            ],
            labResults: [
                {
                    testName: 'Serum Amylase',
                    value: '450',
                    unit: 'U/L',
                    referenceRange: '30-110 U/L',
                    abnormalFlag: true,
                    date: '2026-05-10',
                    confidence: 0.97,
                    sourceText: 'Serum Amylase: 450 U/L (Ref: 30-110 U/L)',
                    page: 1
                },
                {
                    testName: 'Serum Lipase',
                    value: '820',
                    unit: 'U/L',
                    referenceRange: '10-140 U/L',
                    abnormalFlag: true,
                    date: '2026-05-10',
                    confidence: 0.98,
                    sourceText: 'Serum Lipase: 820 U/L (Ref: 10-140)',
                    page: 1
                },
                {
                    testName: 'HbA1c',
                    value: '6.8',
                    unit: '%',
                    referenceRange: '< 5.7%',
                    abnormalFlag: true,
                    date: '2026-05-10',
                    confidence: 0.95,
                    sourceText: 'HbA1c: 6.8 %',
                    page: 1
                }
            ],
            procedures: [
                {
                    name: 'Contrast Enhanced CT Abdomen',
                    date: '2026-05-10',
                    surgeonName: null,
                    notes: 'Showed diffuse enlargement of pancreas with peripancreatic fat stranding',
                    confidence: 0.93,
                    sourceText: 'CECT Abdomen: Pancreas is diffusely enlarged...',
                    page: 1
                }
            ],
            allergies: [
                { value: 'Penicillin - causes skin rash', confidence: 0.95, sourceText: 'Allergies: Penicillin (Rash)', page: 1 }
            ],
            notes: [
                { value: 'Restricted dietary fat intake strongly recommended for 3 months.', confidence: 0.90, sourceText: 'Advice: Avoid fatty foods for 12 weeks', page: 2 }
            ],
            certificatesOrRecommendations: [],
            unreadableSections: [
                {
                    description: 'Medication line 3 partially unreadable due to ink stain',
                    page: 2
                }
            ],
            unmappedDocumentedInformation: [
                {
                    text: 'Patient was advised strict alcohol abstinence.',
                    sectionHeading: 'Social History Advice',
                    page: 2,
                    sourceText: 'Social: Strictly no alcohol intake.',
                    confidence: 0.95
                }
            ],
            coverageMetrics: {
                totalReadableTextBlocks: 45,
                mappedStructuredBlocks: 40,
                unmappedBlocks: 4,
                unreadableBlocks: 1
            }
        };
    }
}
exports.DemoMedicalExtractionProvider = DemoMedicalExtractionProvider;

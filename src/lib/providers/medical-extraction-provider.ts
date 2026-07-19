import { z } from 'zod';
import { DocumentCategory } from '@/types';

// Base schema for simple text values with source tracing and confidence
export const ExtractedValueSchema = z.object({
  value: z.string().nullable(),
  confidence: z.number().optional().default(1.0),
  sourceText: z.string().nullable(),
  page: z.number().optional()
});

// Encounter Details
export const EncounterDetailsSchema = z.object({
  hospitalName: ExtractedValueSchema.nullable().optional(),
  clinicName: ExtractedValueSchema.nullable().optional(),
  doctorName: ExtractedValueSchema.nullable().optional(),
  doctorSpecialization: ExtractedValueSchema.nullable().optional(),
  admissionDate: ExtractedValueSchema.nullable().optional(),
  dischargeDate: ExtractedValueSchema.nullable().optional(),
  visitDate: ExtractedValueSchema.nullable().optional()
});

// Patient Details
export const PatientDetailsSchema = z.object({
  patientNameOnDocument: ExtractedValueSchema.nullable().optional(),
  age: ExtractedValueSchema.nullable().optional(),
  gender: ExtractedValueSchema.nullable().optional(),
  patientIdOrMrn: ExtractedValueSchema.nullable().optional()
});

// Clinical Info
export const ClinicalInformationSchema = z.object({
  chiefComplaints: z.array(ExtractedValueSchema).default([]).optional(),
  presentingSymptoms: z.array(ExtractedValueSchema).default([]).optional(),
  historyOfPresentIllness: ExtractedValueSchema.nullable().optional(),
  pastMedicalHistory: ExtractedValueSchema.nullable().optional(),
  familyHistory: ExtractedValueSchema.nullable().optional(),
  provisionalDiagnoses: z.array(ExtractedValueSchema).default([]).optional(),
  finalDiagnoses: z.array(ExtractedValueSchema).default([]).optional(),
  comorbidities: z.array(ExtractedValueSchema).default([]).optional()
});

// Examination & Vitals
export const VitalsSchema = z.object({
  bp: ExtractedValueSchema.nullable().optional(),
  hr: ExtractedValueSchema.nullable().optional(),
  temp: ExtractedValueSchema.nullable().optional(),
  rr: ExtractedValueSchema.nullable().optional(),
  spo2: ExtractedValueSchema.nullable().optional()
});

export const ExaminationSchema = z.object({
  vitals: VitalsSchema.optional(),
  generalExamination: ExtractedValueSchema.nullable().optional(),
  systemicExamination: ExtractedValueSchema.nullable().optional(),
  clinicalFindings: ExtractedValueSchema.nullable().optional()
});

// Extracted Imaging Study
export const ExtractedImagingStudySchema = z.object({
  studyName: z.string(),
  findings: z.string().nullable().optional(),
  impression: z.string().nullable().optional(),
  confidence: z.number(),
  sourceText: z.string().nullable(),
  page: z.number().optional()
});

// Investigations
export const InvestigationSchema = z.object({
  testsOrdered: z.array(ExtractedValueSchema).default([]).optional(),
  imaging: z.array(ExtractedImagingStudySchema).default([]).optional(),
  investigationFindings: ExtractedValueSchema.nullable().optional()
});

// Treatment
export const TreatmentSchema = z.object({
  surgeries: z.array(ExtractedValueSchema).default([]).optional(),
  treatmentGiven: ExtractedValueSchema.nullable().optional(),
  hospitalCourse: ExtractedValueSchema.nullable().optional()
});

// Plan / Discharge
export const DischargePlanSchema = z.object({
  dietaryAdvice: ExtractedValueSchema.nullable().optional(),
  activityAdvice: ExtractedValueSchema.nullable().optional(),
  warningSigns: z.array(ExtractedValueSchema).default([]).optional(),
  referrals: z.array(ExtractedValueSchema).default([]).optional(),
  nextVisit: ExtractedValueSchema.nullable().optional()
});

// Extracted Diagnosis Schema (Entity model)
export const ExtractedDiagnosisSchema = z.object({
  name: z.string(),
  onsetWeeks: z.number().nullable().optional(),
  isChronic: z.boolean().nullable().optional(),
  confidence: z.number(),
  sourceText: z.string().nullable(),
  page: z.number().optional(),
  notes: z.string().nullable().optional()
});

// Extracted Medication Schema (Entity model)
export const ExtractedMedicationSchema = z.object({
  medicineName: z.string(),
  genericName: z.string().nullable().optional(),
  strength: z.string().nullable().optional(),
  dosage: z.string().nullable().optional(),
  route: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  instructions: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  confidence: z.number(),
  sourceText: z.string().nullable(),
  page: z.number().optional()
});

// Extracted Lab Result Schema (Entity model)
export const ExtractedLabResultSchema = z.object({
  testName: z.string(),
  value: z.string(),
  unit: z.string().nullable().optional(),
  referenceRange: z.string().nullable().optional(),
  abnormalFlag: z.boolean().nullable().optional(),
  date: z.string().nullable().optional(),
  confidence: z.number(),
  sourceText: z.string().nullable(),
  page: z.number().optional(),
  rawValue: z.string().nullable().optional(),
  rawUnit: z.string().nullable().optional(),
  normalizedValue: z.string().nullable().optional(),
  normalizedUnit: z.string().nullable().optional(),
  normalizationStatus: z.string().nullable().optional()
});

// Extracted Procedure Schema (Entity model)
export const ExtractedProcedureSchema = z.object({
  name: z.string(),
  date: z.string().nullable().optional(),
  surgeonName: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  confidence: z.number(),
  sourceText: z.string().nullable(),
  page: z.number().optional()
});

// Extracted Unreadable Sections Schema
export const ExtractedUnreadableSectionSchema = z.object({
  description: z.string(),
  page: z.number().optional()
});

// Unmapped text catcher schema
export const UnmappedDocumentedInformationSchema = z.object({
  text: z.string(),
  sectionHeading: z.string().nullable().optional(),
  page: z.number().optional(),
  sourceText: z.string().nullable().optional(),
  confidence: z.number().optional().default(1.0)
});

// Coverage metrics schema
export const CoverageMetricsSchema = z.object({
  totalReadableTextBlocks: z.number(),
  mappedStructuredBlocks: z.number(),
  unmappedBlocks: z.number(),
  unreadableBlocks: z.number()
});

// Main Expanded Medical Extraction Schema
export const MedicalExtractionSchema = z.object({
  documentType: z.enum([
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
  classificationConfidence: z.number().optional().default(1.0),
  classificationSource: z.string().optional().default('rule_engine'),
  documentTitle: ExtractedValueSchema,
  documentDate: ExtractedValueSchema,

  // Keep these top-level for backward-compatibility with database/pipeline code & demo-data.ts
  hospitalName: ExtractedValueSchema.optional(),
  doctorName: ExtractedValueSchema.optional(),
  doctorSpecialization: ExtractedValueSchema.optional(),
  patientNameOnDocument: ExtractedValueSchema.optional(),
  patientAgeOnDocument: ExtractedValueSchema.optional(),

  // Medical sections
  patientDetails: PatientDetailsSchema.optional(),
  encounterDetails: EncounterDetailsSchema.optional(),
  clinicalInformation: ClinicalInformationSchema.optional(),
  examination: ExaminationSchema.optional(),
  investigations: InvestigationSchema.optional(),
  treatment: TreatmentSchema.optional(),
  dischargePlan: DischargePlanSchema.optional(),

  // Array entities (for timeline and database mapping)
  diagnoses: z.array(ExtractedDiagnosisSchema).default([]).optional(),
  medications: z.array(ExtractedMedicationSchema).default([]).optional(),
  labResults: z.array(ExtractedLabResultSchema).default([]).optional(),
  procedures: z.array(ExtractedProcedureSchema).default([]).optional(),

  // Other annotations
  allergies: z.array(ExtractedValueSchema).default([]).optional(),
  notes: z.array(ExtractedValueSchema).default([]).optional(),
  certificatesOrRecommendations: z.array(ExtractedValueSchema).default([]).optional(),
  unreadableSections: z.array(ExtractedUnreadableSectionSchema).default([]).optional(),

  // Unmapped/Unstructured content catcher
  unmappedDocumentedInformation: z.array(UnmappedDocumentedInformationSchema).default([]).optional(),

  // Coverage statistics (computed deterministically)
  coverageMetrics: CoverageMetricsSchema.optional()
});

export type MedicalExtraction = z.infer<typeof MedicalExtractionSchema>;

export interface MedicalExtractionProvider {
  extractMedicalData(ocrText: string, category?: DocumentCategory): Promise<MedicalExtraction>;
}

export class DemoMedicalExtractionProvider implements MedicalExtractionProvider {
  async extractMedicalData(ocrText: string, category?: DocumentCategory): Promise<MedicalExtraction> {
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

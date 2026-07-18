import { z } from 'zod';
import { DocumentCategory } from '@/types';

// Zod schemas for validation and runtime safety
export const ExtractedValueSchema = z.object({
  value: z.string().nullable(),
  confidence: z.number(),
  sourceText: z.string().nullable(),
  page: z.number().optional()
});

export const ExtractedDiagnosisSchema = z.object({
  name: z.string(),
  onsetWeeks: z.number().nullable().optional(),
  isChronic: z.boolean().nullable().optional(),
  confidence: z.number(),
  sourceText: z.string().nullable(),
  page: z.number().optional(),
  notes: z.string().nullable().optional()
});

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

export const ExtractedLabResultSchema = z.object({
  testName: z.string(),
  value: z.string(),
  unit: z.string().nullable().optional(),
  referenceRange: z.string().nullable().optional(),
  abnormalFlag: z.boolean().nullable().optional(),
  date: z.string().nullable().optional(), // YYYY-MM-DD
  confidence: z.number(),
  sourceText: z.string().nullable(),
  page: z.number().optional()
});

export const ExtractedProcedureSchema = z.object({
  name: z.string(),
  date: z.string().nullable().optional(), // YYYY-MM-DD
  surgeonName: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  confidence: z.number(),
  sourceText: z.string().nullable(),
  page: z.number().optional()
});

export const ExtractedUnreadableSectionSchema = z.object({
  description: z.string(),
  page: z.number().optional()
});

export const MedicalExtractionSchema = z.object({
  documentType: z.enum([
    'Auto Detect',
    'Prescription',
    'Lab Report',
    'Discharge Summary',
    'Imaging Report',
    'Medical Certificate',
    'Vaccination Record',
    'Other'
  ]),
  documentTitle: ExtractedValueSchema,
  documentDate: ExtractedValueSchema, // YYYY-MM-DD
  hospitalName: ExtractedValueSchema,
  doctorName: ExtractedValueSchema,
  doctorSpecialization: ExtractedValueSchema,
  patientNameOnDocument: ExtractedValueSchema,
  patientAgeOnDocument: ExtractedValueSchema,

  diagnoses: z.array(ExtractedDiagnosisSchema).default([]),
  medications: z.array(ExtractedMedicationSchema).default([]),
  labResults: z.array(ExtractedLabResultSchema).default([]),
  procedures: z.array(ExtractedProcedureSchema).default([]),
  unreadableSections: z.array(ExtractedUnreadableSectionSchema).default([])
});

export type MedicalExtraction = z.infer<typeof MedicalExtractionSchema>;

export interface MedicalExtractionProvider {
  extractMedicalData(ocrText: string, category?: DocumentCategory): Promise<MedicalExtraction>;
}

export class DemoMedicalExtractionProvider implements MedicalExtractionProvider {
  async extractMedicalData(ocrText: string, category?: DocumentCategory): Promise<MedicalExtraction> {
    // Artificial delay to simulate AI processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simple routing to different synthetic fixtures depending on keywords in ocrText or file name
    // By default, return the pancreatitis discharge summary
    return {
      documentType: 'Discharge Summary',
      documentTitle: { value: 'Discharge Summary', confidence: 0.98, sourceText: 'DISCHARGE SUMMARY', page: 1 },
      documentDate: { value: '2026-05-12', confidence: 0.95, sourceText: 'Date of Discharge: 12 May 2026', page: 1 },
      hospitalName: { value: 'Apollo Hospital', confidence: 0.99, sourceText: 'APOLLO HEALTH CITY', page: 1 },
      doctorName: { value: 'Dr. Ramesh Kumar', confidence: 0.94, sourceText: 'Consultant: Dr. Ramesh Kumar', page: 1 },
      doctorSpecialization: { value: 'Gastroenterologist', confidence: 0.92, sourceText: 'Dept of Gastroenterology', page: 1 },
      patientNameOnDocument: { value: 'Arjun Rao', confidence: 0.99, sourceText: 'Patient Name: Arjun Rao', page: 1 },
      patientAgeOnDocument: { value: '45', confidence: 0.97, sourceText: 'Age: 45 Years', page: 1 },
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
          confidence: 0.92,
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
          notes: 'Showed diffuse enlargement of pancreas with peripancreatic fat stranding',
          confidence: 0.93,
          sourceText: 'CECT Abdomen: Pancreas is diffusely enlarged...',
          page: 1
        }
      ],
      unreadableSections: [
        {
          description: 'Medication line 3 partially unreadable due to ink stain',
          page: 2
        }
      ]
    };
  }
}

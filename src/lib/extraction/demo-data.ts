import { MedicalExtraction } from '../providers/medical-extraction-provider';

export interface DemoDocumentFixture {
  id: string;
  fileName: string;
  category: string;
  date: string;
  hospitalName: string;
  doctorName: string;
  extraction: MedicalExtraction;
}

export const DEMO_PATIENT = {
  id: '00000000-0000-0000-0000-000000000001',
  fullName: 'Arjun Rao',
  dateOfBirth: '1981-05-12',
  gender: 'Male',
  bloodGroup: 'O Positive',
  phone: '+1 (555) 019-2834',
  emergencyContactName: 'Priya Rao',
  emergencyContactPhone: '+1 (555) 019-2835',
  knownAllergies: ['Penicillin', 'Sulfa Drugs'],
  knownChronicConditions: ['Type 2 Diabetes Mellitus', 'Hypertension'],
  currentLongTermMedications: ['Metformin 500mg twice daily', 'Lisinopril 10mg once daily']
};

export const DEMO_DOCUMENTS: DemoDocumentFixture[] = [
  {
    id: 'dengue-discharge-2023',
    fileName: 'Apollo_Dengue_Discharge_2023.pdf',
    category: 'Discharge Summary',
    date: '2023-07-18',
    hospitalName: 'Apollo Hospital',
    doctorName: 'Dr. Ramesh Kumar',
    extraction: {
      documentType: 'Discharge Summary',
      documentTitle: { value: 'Discharge Summary', confidence: 0.98, sourceText: 'DISCHARGE SUMMARY', page: 1 },
      documentDate: { value: '2023-07-18', confidence: 0.96, sourceText: 'Date of Discharge: 18 July 2023', page: 1 },
      hospitalName: { value: 'Apollo Hospital', confidence: 0.99, sourceText: 'APOLLO HEALTH CITY', page: 1 },
      doctorName: { value: 'Dr. Ramesh Kumar', confidence: 0.94, sourceText: 'Attending Consultant: Dr. Ramesh Kumar', page: 1 },
      doctorSpecialization: { value: 'Internal Medicine', confidence: 0.91, sourceText: 'Dept. of Internal Medicine', page: 1 },
      patientNameOnDocument: { value: 'Arjun Rao', confidence: 0.99, sourceText: 'Patient Name: Arjun Rao', page: 1 },
      patientAgeOnDocument: { value: '42', confidence: 0.97, sourceText: 'Age: 42 Years', page: 1 },
      diagnoses: [
        {
          name: 'Dengue Fever with Thrombocytopenia',
          onsetWeeks: null,
          isChronic: false,
          confidence: 0.98,
          sourceText: 'Final Diagnosis: Dengue fever with thrombocytopenia',
          page: 1,
          notes: 'Admitted with high-grade fever, body aches, and platelets of 45,000. Platelets rose to 120,000 at discharge.'
        }
      ],
      medications: [
        {
          medicineName: 'Paracetamol',
          strength: '650 mg',
          dosage: '1 tablet',
          route: 'Oral',
          frequency: 'As needed (PRN)',
          duration: '5 days',
          instructions: 'For fever/body pain, max 4 times daily',
          confidence: 0.95,
          sourceText: 'Tab Paracetamol 650mg PRN for fever',
          page: 2
        }
      ],
      labResults: [
        {
          testName: 'Platelet Count',
          value: '45000',
          unit: 'cells/mcL',
          referenceRange: '150,000 - 450,000 cells/mcL',
          abnormalFlag: true,
          date: '2023-07-15',
          confidence: 0.97,
          sourceText: 'Platelets: 45K / mcL on admission',
          page: 1
        },
        {
          testName: 'Platelet Count',
          value: '120000',
          unit: 'cells/mcL',
          referenceRange: '150,000 - 450,000 cells/mcL',
          abnormalFlag: false, // rising, not critically low
          date: '2023-07-18',
          confidence: 0.98,
          sourceText: 'Platelets: 120K / mcL on discharge',
          page: 2
        }
      ],
      procedures: [
        {
          name: 'Intravenous Fluid Therapy',
          date: '2023-07-15',
          notes: 'Hydration maintained with NS/RL fluids.',
          confidence: 0.88,
          sourceText: 'IV fluids administered to maintain hydration',
          page: 1
        }
      ],
      unreadableSections: []
    }
  },
  {
    id: 'lipid-profile-2024',
    fileName: 'CityLab_Lipid_Profile_2024.png',
    category: 'Lab Report',
    date: '2024-04-15',
    hospitalName: 'City Diagnostics Clinic',
    doctorName: 'Dr. Anita Desai',
    extraction: {
      documentType: 'Lab Report',
      documentTitle: { value: 'Lipid Profile', confidence: 0.99, sourceText: 'LIPID PROFILE (SERUM)', page: 1 },
      documentDate: { value: '2024-04-15', confidence: 0.98, sourceText: 'Date: 15-Apr-2024', page: 1 },
      hospitalName: { value: 'City Diagnostics Clinic', confidence: 0.97, sourceText: 'CITY DIAGNOSTICS CLINIC', page: 1 },
      doctorName: { value: 'Dr. Anita Desai', confidence: 0.91, sourceText: 'Ref By: Dr. Anita Desai', page: 1 },
      doctorSpecialization: { value: 'General Physician', confidence: 0.85, sourceText: 'MD (Gen Med)', page: 1 },
      patientNameOnDocument: { value: 'Arjun Rao', confidence: 0.99, sourceText: 'Patient: Arjun Rao', page: 1 },
      patientAgeOnDocument: { value: '43', confidence: 0.96, sourceText: 'Age/Gender: 43/M', page: 1 },
      diagnoses: [
        {
          name: 'Dyslipidemia',
          onsetWeeks: null,
          isChronic: true,
          confidence: 0.85,
          sourceText: 'Impression: Dyslipidemia with elevated LDL and Triglycerides',
          page: 1,
          notes: 'Dietary modifications and statin therapy advised.'
        }
      ],
      medications: [
        {
          medicineName: 'Atorvastatin',
          strength: '10 mg',
          dosage: '1 tablet',
          route: 'Oral',
          frequency: 'Once Daily (at bedtime)',
          duration: 'Ongoing',
          instructions: 'Take at night',
          confidence: 0.92,
          sourceText: 'Tab Atorvastatin 10mg HS',
          page: 1
        }
      ],
      labResults: [
        {
          testName: 'Total Cholesterol',
          value: '245',
          unit: 'mg/dL',
          referenceRange: '< 200 mg/dL',
          abnormalFlag: true,
          date: '2024-04-15',
          confidence: 0.99,
          sourceText: 'Total Cholesterol: 245 mg/dL',
          page: 1
        },
        {
          testName: 'LDL Cholesterol',
          value: '162',
          unit: 'mg/dL',
          referenceRange: '< 100 mg/dL',
          abnormalFlag: true,
          date: '2024-04-15',
          confidence: 0.99,
          sourceText: 'LDL Cholesterol: 162 mg/dL',
          page: 1
        },
        {
          testName: 'Triglycerides',
          value: '210',
          unit: 'mg/dL',
          referenceRange: '< 150 mg/dL',
          abnormalFlag: true,
          date: '2024-04-15',
          confidence: 0.99,
          sourceText: 'Triglycerides: 210 mg/dL',
          page: 1
        },
        {
          testName: 'HDL Cholesterol',
          value: '41',
          unit: 'mg/dL',
          referenceRange: '> 40 mg/dL',
          abnormalFlag: false,
          date: '2024-04-15',
          confidence: 0.99,
          sourceText: 'HDL Cholesterol: 41 mg/dL',
          page: 1
        }
      ],
      procedures: [],
      unreadableSections: []
    }
  },
  {
    id: 'diabetes-followup-2025',
    fileName: 'Diabetes_Followup_Nov_2025.jpeg',
    category: 'Prescription',
    date: '2025-11-10',
    hospitalName: 'Diabetes Care Clinic',
    doctorName: 'Dr. V. K. Mohan',
    extraction: {
      documentType: 'Prescription',
      documentTitle: { value: 'Prescription / Consultation Note', confidence: 0.95, sourceText: 'CLINICAL PRESCRIPTION', page: 1 },
      documentDate: { value: '2025-11-10', confidence: 0.97, sourceText: 'Date: 10/11/2025', page: 1 },
      hospitalName: { value: 'Diabetes Care Clinic', confidence: 0.98, sourceText: 'Mohan Diabetes Centre', page: 1 },
      doctorName: { value: 'Dr. V. K. Mohan', confidence: 0.96, sourceText: 'Dr. V. K. Mohan, Diabetologist', page: 1 },
      doctorSpecialization: { value: 'Diabetologist', confidence: 0.94, sourceText: 'MD, DM (Endo)', page: 1 },
      patientNameOnDocument: { value: 'Arjun Rao', confidence: 0.99, sourceText: 'Patient Name: Arjun Rao', page: 1 },
      patientAgeOnDocument: { value: '44', confidence: 0.95, sourceText: 'Age: 44', page: 1 },
      diagnoses: [
        {
          name: 'Type 2 Diabetes Mellitus',
          onsetWeeks: null,
          isChronic: true,
          confidence: 0.98,
          sourceText: 'Dx: T2DM (poorly controlled)',
          page: 1,
          notes: 'Fasting blood sugars elevated (145 mg/dL).'
        }
      ],
      medications: [
        {
          medicineName: 'Metformin',
          strength: '500 mg',
          dosage: '1 tablet',
          route: 'Oral',
          frequency: 'Twice Daily',
          duration: '3 months',
          instructions: 'After meals',
          confidence: 0.97,
          sourceText: 'Metformin 500mg BD after meals',
          page: 1
        },
        {
          medicineName: 'Glargine Insulin',
          strength: '100 IU/mL',
          dosage: '12 units',
          route: 'Subcutaneous injection',
          frequency: 'Once Daily (at bedtime)',
          duration: 'Ongoing',
          instructions: 'Increase from 10 units to 12 units',
          confidence: 0.94,
          sourceText: 'Inj Glargine: Increase dose to 12 units SC at bedtime (was 10)',
          page: 1
        }
      ],
      labResults: [
        {
          testName: 'Fasting Blood Sugar',
          value: '145',
          unit: 'mg/dL',
          referenceRange: '70-100 mg/dL',
          abnormalFlag: true,
          date: '2025-11-10',
          confidence: 0.98,
          sourceText: 'FBS: 145 mg/dl',
          page: 1
        }
      ],
      procedures: [],
      unreadableSections: [
        {
          description: 'Handwritten notes regarding diet instructions are unreadable.',
          page: 1
        }
      ]
    }
  },
  {
    id: 'pancreatitis-discharge-2026',
    fileName: 'Apollo_Pancreatitis_Admission_2026.pdf',
    category: 'Discharge Summary',
    date: '2026-05-12',
    hospitalName: 'Apollo Hospital',
    doctorName: 'Dr. Ramesh Kumar',
    extraction: {
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
    }
  }
];

export function getDemoExtractionForFile(fileName: string): MedicalExtraction {
  const norm = fileName.toLowerCase();
  if (norm.includes('dengue') || norm.includes('2023')) {
    return DEMO_DOCUMENTS[0].extraction;
  }
  if (norm.includes('lipid') || norm.includes('2024') || norm.includes('cholesterol')) {
    return DEMO_DOCUMENTS[1].extraction;
  }
  if (norm.includes('diabetes') || norm.includes('2025') || norm.includes('presc')) {
    return DEMO_DOCUMENTS[2].extraction;
  }
  // Default to pancreatitis
  return DEMO_DOCUMENTS[3].extraction;
}

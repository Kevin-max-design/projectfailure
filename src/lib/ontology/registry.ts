export interface OntologySubtype {
  id: string;
  displayName: string;
  category: 'CLINICAL_DOCUMENT' | 'LABORATORY' | 'IMAGING' | 'ADMINISTRATIVE' | 'PREVENTIVE' | 'GENETICS' | 'OTHER';
  clinicalTables: Array<'diagnoses' | 'medications' | 'labResults' | 'procedures'>;
}

export const MEDICAL_ONTOLOGY_REGISTRY: Record<string, OntologySubtype> = {
  // Clinical Documents
  Prescription: {
    id: 'Prescription',
    displayName: 'Prescription',
    category: 'CLINICAL_DOCUMENT',
    clinicalTables: ['medications']
  },
  'Clinical Note': {
    id: 'Clinical Note',
    displayName: 'Clinical Note',
    category: 'CLINICAL_DOCUMENT',
    clinicalTables: ['diagnoses', 'medications']
  },
  'Discharge Summary': {
    id: 'Discharge Summary',
    displayName: 'Discharge Summary',
    category: 'CLINICAL_DOCUMENT',
    clinicalTables: ['diagnoses', 'medications', 'labResults', 'procedures']
  },
  'Progress Note': {
    id: 'Progress Note',
    displayName: 'Progress Note',
    category: 'CLINICAL_DOCUMENT',
    clinicalTables: ['diagnoses']
  },
  'Procedure Note': {
    id: 'Procedure Note',
    displayName: 'Procedure Note',
    category: 'CLINICAL_DOCUMENT',
    clinicalTables: ['procedures']
  },

  // Laboratory
  CBC: {
    id: 'CBC',
    displayName: 'Complete Blood Count (CBC)',
    category: 'LABORATORY',
    clinicalTables: ['labResults']
  },
  LFT: {
    id: 'LFT',
    displayName: 'Liver Function Test (LFT)',
    category: 'LABORATORY',
    clinicalTables: ['labResults']
  },
  KFT: {
    id: 'KFT',
    displayName: 'Kidney Function Test (KFT)',
    category: 'LABORATORY',
    clinicalTables: ['labResults']
  },
  'Lipid Profile': {
    id: 'Lipid Profile',
    displayName: 'Lipid Profile',
    category: 'LABORATORY',
    clinicalTables: ['labResults']
  },
  HbA1c: {
    id: 'HbA1c',
    displayName: 'Glycated Hemoglobin (HbA1c)',
    category: 'LABORATORY',
    clinicalTables: ['labResults']
  },
  Thyroid: {
    id: 'Thyroid',
    displayName: 'Thyroid Profile',
    category: 'LABORATORY',
    clinicalTables: ['labResults']
  },
  'Urine Analysis': {
    id: 'Urine Analysis',
    displayName: 'Urine Analysis',
    category: 'LABORATORY',
    clinicalTables: ['labResults']
  },
  Microbiology: {
    id: 'Microbiology',
    displayName: 'Microbiology Report',
    category: 'LABORATORY',
    clinicalTables: ['labResults']
  },
  'Lab Report': {
    id: 'Lab Report',
    displayName: 'Laboratory Report',
    category: 'LABORATORY',
    clinicalTables: ['labResults']
  },

  // Imaging
  'X-Ray': {
    id: 'X-Ray',
    displayName: 'X-Ray',
    category: 'IMAGING',
    clinicalTables: ['procedures']
  },
  CT: {
    id: 'CT',
    displayName: 'CT Scan',
    category: 'IMAGING',
    clinicalTables: ['procedures']
  },
  MRI: {
    id: 'MRI',
    displayName: 'MRI Scan',
    category: 'IMAGING',
    clinicalTables: ['procedures']
  },
  Ultrasound: {
    id: 'Ultrasound',
    displayName: 'Ultrasound',
    category: 'IMAGING',
    clinicalTables: ['procedures']
  },
  ECG: {
    id: 'ECG',
    displayName: 'Electrocardiogram (ECG)',
    category: 'IMAGING',
    clinicalTables: ['procedures']
  },
  Echo: {
    id: 'Echo',
    displayName: 'Echocardiogram (Echo)',
    category: 'IMAGING',
    clinicalTables: ['procedures']
  },
  'Imaging Report': {
    id: 'Imaging Report',
    displayName: 'Imaging Report',
    category: 'IMAGING',
    clinicalTables: ['procedures']
  },

  // Administrative
  'OP Bill': {
    id: 'OP Bill',
    displayName: 'OP Bill / Receipt',
    category: 'ADMINISTRATIVE',
    clinicalTables: []
  },
  'Pharmacy Invoice': {
    id: 'Pharmacy Invoice',
    displayName: 'Pharmacy Invoice',
    category: 'ADMINISTRATIVE',
    clinicalTables: []
  },
  Insurance: {
    id: 'Insurance',
    displayName: 'Insurance Document',
    category: 'ADMINISTRATIVE',
    clinicalTables: []
  },
  'Medical Certificate': {
    id: 'Medical Certificate',
    displayName: 'Medical Certificate',
    category: 'ADMINISTRATIVE',
    clinicalTables: []
  },

  // Preventive
  Vaccination: {
    id: 'Vaccination',
    displayName: 'Vaccination Record',
    category: 'PREVENTIVE',
    clinicalTables: []
  },
  'Health Checkup': {
    id: 'Health Checkup',
    displayName: 'Health Checkup',
    category: 'PREVENTIVE',
    clinicalTables: ['labResults', 'diagnoses']
  },
  'Growth Chart': {
    id: 'Growth Chart',
    displayName: 'Growth Chart',
    category: 'PREVENTIVE',
    clinicalTables: []
  },

  // Genetics
  'Genetic Report': {
    id: 'Genetic Report',
    displayName: 'Genetic Report',
    category: 'GENETICS',
    clinicalTables: []
  },
  'Family History': {
    id: 'Family History',
    displayName: 'Family History',
    category: 'GENETICS',
    clinicalTables: []
  },

  // Other
  Other: {
    id: 'Other',
    displayName: 'Other Medical Document',
    category: 'OTHER',
    clinicalTables: ['diagnoses', 'medications', 'labResults', 'procedures']
  }
};

export const DEFAULT_ONTOLOGY_SUBTYPE: OntologySubtype = {
  id: 'Other',
  displayName: 'Other Medical Document',
  category: 'OTHER',
  clinicalTables: ['diagnoses', 'medications', 'labResults', 'procedures']
};

export function getSubtypeConfig(subtype?: string | null): OntologySubtype {
  if (!subtype) return DEFAULT_ONTOLOGY_SUBTYPE;
  return MEDICAL_ONTOLOGY_REGISTRY[subtype] || DEFAULT_ONTOLOGY_SUBTYPE;
}

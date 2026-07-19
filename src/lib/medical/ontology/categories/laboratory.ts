import { OntologySubtype } from '../registry';

export const laboratorySubtypes: Record<string, OntologySubtype> = {
  CBC: {
    id: 'CBC',
    displayName: 'Complete Blood Count (CBC)',
    category: 'LABORATORY',
    keywords: [
      'hemoglobin', 'haemoglobin', 'rbc', 'wbc', 'platelet', 'platelets',
      'red blood cells', 'white blood cells', 'mcv', 'mch', 'mchc', 'pcv',
      'hematocrit', 'lymphocytes', 'neutrophils', 'monocytes', 'eosinophils',
      'cumm', 'g/dl', 'fl', 'pg', '/ul'
    ],
    requiredEntities: ['hemoglobin', 'rbc', 'wbc', 'platelets'],
    confidenceRules: {
      minKeywordsToMatch: 4,
      mandatoryKeywords: ['hemoglobin|haemoglobin', 'platelet|platelets', 'wbc', 'rbc']
    },
    extractor: 'CBCExtractor',
    validator: 'CBCValidator',
    reviewComponent: 'CBCReview',
    timelineMapper: 'CBCTimelineMapper',
    knowledgeGraphMapper: 'CBCGraphMapper'
  },
  LFT: {
    id: 'LFT',
    displayName: 'Liver Function Test (LFT)',
    category: 'LABORATORY',
    keywords: [
      'bilirubin', 'sgot', 'sgpt', 'alkaline phosphatase', 'ast', 'alt',
      'albumin', 'globulin', 'total protein', 'direct bilirubin', 'indirect bilirubin',
      'liver function', 'lft'
    ],
    requiredEntities: ['totalBilirubin', 'sgot', 'sgpt'],
    confidenceRules: {
      minKeywordsToMatch: 3,
      mandatoryKeywords: ['bilirubin', 'sgot|sgpt|ast|alt']
    },
    extractor: 'LFTExtractor',
    validator: 'LFTValidator',
    reviewComponent: 'LFTReview',
    timelineMapper: 'LFTTimelineMapper',
    knowledgeGraphMapper: 'LFTGraphMapper'
  },
  KFT: {
    id: 'KFT',
    displayName: 'Kidney Function Test (KFT)',
    category: 'LABORATORY',
    keywords: [
      'creatinine', 'urea', 'blood urea nitrogen', 'bun', 'uric acid',
      'kidney function', 'renal function', 'kft', 'rft', 'electrolytes',
      'sodium', 'potassium', 'chloride'
    ],
    requiredEntities: ['creatinine', 'urea'],
    confidenceRules: {
      minKeywordsToMatch: 2,
      mandatoryKeywords: ['creatinine', 'urea|bun']
    },
    extractor: 'KFTExtractor',
    validator: 'KFTValidator',
    reviewComponent: 'KFTReview',
    timelineMapper: 'KFTTimelineMapper',
    knowledgeGraphMapper: 'KFTGraphMapper'
  },
  'Lipid Profile': {
    id: 'Lipid Profile',
    displayName: 'Lipid Profile',
    category: 'LABORATORY',
    keywords: [
      'cholesterol', 'triglycerides', 'hdl', 'ldl', 'vldl', 'total cholesterol',
      'lipid profile', 'cardiac risk ratio'
    ],
    requiredEntities: ['cholesterol', 'triglycerides', 'hdl', 'ldl'],
    confidenceRules: {
      minKeywordsToMatch: 3,
      mandatoryKeywords: ['cholesterol', 'triglycerides', 'hdl', 'ldl']
    },
    extractor: 'LipidProfileExtractor',
    validator: 'LipidProfileValidator',
    reviewComponent: 'LipidProfileReview',
    timelineMapper: 'LipidProfileTimelineMapper',
    knowledgeGraphMapper: 'LipidProfileGraphMapper'
  },
  HbA1c: {
    id: 'HbA1c',
    displayName: 'Glycated Hemoglobin (HbA1c)',
    category: 'LABORATORY',
    keywords: [
      'hba1c', 'glycated hemoglobin', 'glycohemoglobin', 'estimated average glucose',
      'eag', 'mean plasma glucose'
    ],
    requiredEntities: ['hba1c'],
    confidenceRules: {
      minKeywordsToMatch: 1,
      mandatoryKeywords: ['hba1c', 'glycated hemoglobin']
    },
    extractor: 'HbA1cExtractor',
    validator: 'HbA1cValidator',
    reviewComponent: 'HbA1cReview',
    timelineMapper: 'HbA1cTimelineMapper',
    knowledgeGraphMapper: 'HbA1cGraphMapper'
  }
};

import { OntologySubtype } from '../registry';

export const clinicalSubtypes: Record<string, OntologySubtype> = {
  Prescription: {
    id: 'Prescription',
    displayName: 'Prescription',
    category: 'CLINICAL_DOCUMENT',
    keywords: [
      'rx', 'tab', 'cap', 'mg', 'tablet', 'capsule', 'once daily', 
      'twice daily', 'bd', 'od', 'tid', 'qid', 'qd', 'take', 'daily',
      'before food', 'after food', 'ac', 'pc', 'hs'
    ],
    requiredEntities: ['medicineName', 'dosage', 'frequency'],
    confidenceRules: {
      minKeywordsToMatch: 3,
      mandatoryKeywords: ['rx', 'mg|tab|cap|tablet|capsule']
    },
    extractor: 'PrescriptionExtractor',
    validator: 'PrescriptionValidator',
    reviewComponent: 'PrescriptionReview',
    timelineMapper: 'PrescriptionTimelineMapper',
    knowledgeGraphMapper: 'PrescriptionGraphMapper'
  },
  'Discharge Summary': {
    id: 'Discharge Summary',
    displayName: 'Discharge Summary',
    category: 'CLINICAL_DOCUMENT',
    keywords: [
      'discharge summary', 'discharge card', 'admission', 'discharge',
      'date of admission', 'date of discharge', 'hospital course', 'course in hospital',
      'final diagnosis', 'provisional diagnosis', 'treatment given', 'condition on discharge'
    ],
    requiredEntities: ['hospitalName', 'patientName', 'admissionDate', 'dischargeDate', 'finalDiagnoses'],
    confidenceRules: {
      minKeywordsToMatch: 4,
      mandatoryKeywords: ['discharge', 'admission']
    },
    extractor: 'DischargeSummaryExtractor',
    validator: 'DischargeSummaryValidator',
    reviewComponent: 'DischargeSummaryReview',
    timelineMapper: 'DischargeSummaryTimelineMapper',
    knowledgeGraphMapper: 'DischargeSummaryGraphMapper'
  }
};

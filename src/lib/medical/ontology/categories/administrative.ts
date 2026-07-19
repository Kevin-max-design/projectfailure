import { OntologySubtype } from '../registry';

export const administrativeSubtypes: Record<string, OntologySubtype> = {
  'OP Bill': {
    id: 'OP Bill',
    displayName: 'OP Bill / Receipt',
    category: 'ADMINISTRATIVE',
    keywords: [
      'bill no', 'bill date', 'receipt no', 'receipt date', 'total amount',
      'consultation fee', 'registration fee', 'net amount', 'paid amount',
      'cgst', 'sgst', 'hospital charges', 'clinic charges', 'receipt', 'invoice'
    ],
    requiredEntities: ['hospitalName', 'totalAmount'],
    confidenceRules: {
      minKeywordsToMatch: 3,
      mandatoryKeywords: ['bill', 'receipt', 'charges', 'fee']
    },
    extractor: 'OPBillExtractor',
    validator: 'OPBillValidator',
    reviewComponent: 'OPBillReview',
    timelineMapper: 'OPBillTimelineMapper',
    knowledgeGraphMapper: 'OPBillGraphMapper'
  },
  'Pharmacy Invoice': {
    id: 'Pharmacy Invoice',
    displayName: 'Pharmacy Invoice',
    category: 'ADMINISTRATIVE',
    keywords: [
      'pharmacy', 'pharmacist', 'chemist', 'druggist', 'batch no', 'exp dt',
      'expiry date', 'qty', 'rate', 'disc amt', 'tablets', 'capsules',
      'bill of supply', 'tax invoice'
    ],
    requiredEntities: ['pharmacyName', 'totalAmount', 'medications'],
    confidenceRules: {
      minKeywordsToMatch: 3,
      mandatoryKeywords: ['pharmacy', 'batch', 'expiry', 'qty']
    },
    extractor: 'PharmacyInvoiceExtractor',
    validator: 'PharmacyInvoiceValidator',
    reviewComponent: 'PharmacyInvoiceReview',
    timelineMapper: 'PharmacyInvoiceTimelineMapper',
    knowledgeGraphMapper: 'PharmacyInvoiceGraphMapper'
  },
  'Medical Certificate': {
    id: 'Medical Certificate',
    displayName: 'Medical Certificate',
    category: 'ADMINISTRATIVE',
    keywords: [
      'medical certificate', 'fit to work', 'sickness certificate',
      'unfit for duty', 'sickness leave', 'under my treatment', 'suffer from',
      'recommended rest'
    ],
    requiredEntities: ['doctorName', 'patientName', 'diagnoses'],
    confidenceRules: {
      minKeywordsToMatch: 2,
      mandatoryKeywords: ['certificate', 'fit', 'sickness', 'rest']
    },
    extractor: 'MedicalCertificateExtractor',
    validator: 'MedicalCertificateValidator',
    reviewComponent: 'MedicalCertificateReview',
    timelineMapper: 'MedicalCertificateTimelineMapper',
    knowledgeGraphMapper: 'MedicalCertificateGraphMapper'
  }
};

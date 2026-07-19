import { clinicalSubtypes } from './categories/clinical';
import { laboratorySubtypes } from './categories/laboratory';
import { imagingSubtypes } from './categories/imaging';
import { administrativeSubtypes } from './categories/administrative';

export interface OntologySubtype {
  id: string;
  displayName: string;
  category: 'CLINICAL_DOCUMENT' | 'LABORATORY' | 'IMAGING' | 'ADMINISTRATIVE' | 'PREVENTIVE' | 'GENETICS' | 'OTHER';
  keywords: string[];
  requiredEntities: string[];
  confidenceRules: {
    minKeywordsToMatch: number;
    mandatoryKeywords: string[];
  };
  extractor: string;
  validator: string;
  reviewComponent: string;
  timelineMapper: string;
  knowledgeGraphMapper: string;
  clinicalTables?: Array<'diagnoses' | 'medications' | 'labResults' | 'procedures'>;
}

export const MEDICAL_ONTOLOGY_REGISTRY: Record<string, OntologySubtype> = {
  ...clinicalSubtypes,
  ...laboratorySubtypes,
  ...imagingSubtypes,
  ...administrativeSubtypes,

  // Fallback / Generic Subtype
  Other: {
    id: 'Other',
    displayName: 'Other Medical Document',
    category: 'OTHER',
    keywords: [],
    requiredEntities: [],
    confidenceRules: {
      minKeywordsToMatch: 0,
      mandatoryKeywords: []
    },
    extractor: 'GenericExtractor',
    validator: 'GenericValidator',
    reviewComponent: 'GenericReview',
    timelineMapper: 'GenericTimelineMapper',
    knowledgeGraphMapper: 'GenericGraphMapper',
    clinicalTables: ['diagnoses', 'medications', 'labResults', 'procedures']
  }
};

export const DEFAULT_ONTOLOGY_SUBTYPE: OntologySubtype = MEDICAL_ONTOLOGY_REGISTRY['Other'];

export function getSubtypeConfig(subtype?: string | null): OntologySubtype {
  if (!subtype) return DEFAULT_ONTOLOGY_SUBTYPE;
  return MEDICAL_ONTOLOGY_REGISTRY[subtype] || DEFAULT_ONTOLOGY_SUBTYPE;
}

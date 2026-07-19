import { OntologySubtype } from '../registry';

export const imagingSubtypes: Record<string, OntologySubtype> = {
  MRI: {
    id: 'MRI',
    displayName: 'MRI Scan',
    category: 'IMAGING',
    keywords: [
      'mri', 'magnetic resonance', 't1 weighted', 't2 weighted', 'flair',
      'sagittal', 'coronal', 'axial', 'contrast enhanced', 'gadolinium',
      'diffusion weighted', 'dwi', 'adc map'
    ],
    requiredEntities: ['studyName', 'findings', 'impression'],
    confidenceRules: {
      minKeywordsToMatch: 2,
      mandatoryKeywords: ['mri', 'magnetic resonance']
    },
    extractor: 'MRIExtractor',
    validator: 'MRIValidator',
    reviewComponent: 'MRIReview',
    timelineMapper: 'MRITimelineMapper',
    knowledgeGraphMapper: 'MRIGraphMapper'
  },
  CT: {
    id: 'CT',
    displayName: 'CT Scan',
    category: 'IMAGING',
    keywords: [
      'ct scan', 'computed tomography', 'cat scan', 'hounsfield units',
      'hu', 'slice thickness', 'non contrast', 'contrast enhanced',
      'axial slices', 'reconstruction'
    ],
    requiredEntities: ['studyName', 'findings', 'impression'],
    confidenceRules: {
      minKeywordsToMatch: 2,
      mandatoryKeywords: ['ct', 'computed tomography']
    },
    extractor: 'CTExtractor',
    validator: 'CTValidator',
    reviewComponent: 'CTReview',
    timelineMapper: 'CTTimelineMapper',
    knowledgeGraphMapper: 'CTGraphMapper'
  },
  'X-Ray': {
    id: 'X-Ray',
    displayName: 'X-Ray',
    category: 'IMAGING',
    keywords: [
      'x-ray', 'xray', 'radiograph', 'radiography', 'pa view', 'ap view',
      'lateral view', 'chest pa', 'visualized lung fields', 'bony thorax'
    ],
    requiredEntities: ['studyName', 'findings', 'impression'],
    confidenceRules: {
      minKeywordsToMatch: 2,
      mandatoryKeywords: ['x-ray', 'xray', 'radiograph']
    },
    extractor: 'XRayExtractor',
    validator: 'XRayValidator',
    reviewComponent: 'XRayReview',
    timelineMapper: 'XRayTimelineMapper',
    knowledgeGraphMapper: 'XRayGraphMapper'
  },
  Ultrasound: {
    id: 'Ultrasound',
    displayName: 'Ultrasound',
    category: 'IMAGING',
    keywords: [
      'ultrasound', 'usg', 'ultrasonography', 'echotexture', 'acoustic shadowing',
      'gallbladder', 'urinary bladder', 'kidneys', 'spleen', 'liver size',
      'pelvic scan', 'abdominal scan'
    ],
    requiredEntities: ['studyName', 'findings', 'impression'],
    confidenceRules: {
      minKeywordsToMatch: 2,
      mandatoryKeywords: ['ultrasound', 'usg', 'ultrasonography']
    },
    extractor: 'UltrasoundExtractor',
    validator: 'UltrasoundValidator',
    reviewComponent: 'UltrasoundReview',
    timelineMapper: 'UltrasoundTimelineMapper',
    knowledgeGraphMapper: 'UltrasoundGraphMapper'
  },
  ECG: {
    id: 'ECG',
    displayName: 'Electrocardiogram (ECG)',
    category: 'IMAGING',
    keywords: [
      'ecg', 'ekg', 'electrocardiogram', 'sinus rhythm', 'heart rate',
      'pr interval', 'qtc interval', 'qrs duration', 'axis', 'st elevation',
      'st depression', 't wave inversion', 'leads', 'qt interval'
    ],
    requiredEntities: ['studyName', 'findings', 'impression'],
    confidenceRules: {
      minKeywordsToMatch: 2,
      mandatoryKeywords: ['ecg', 'ekg', 'electrocardiogram']
    },
    extractor: 'ECGExtractor',
    validator: 'ECGValidator',
    reviewComponent: 'ECGReview',
    timelineMapper: 'ECGTimelineMapper',
    knowledgeGraphMapper: 'ECGGraphMapper'
  }
};

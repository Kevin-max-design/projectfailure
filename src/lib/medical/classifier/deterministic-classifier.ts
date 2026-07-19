import { MEDICAL_ONTOLOGY_REGISTRY, OntologySubtype, DEFAULT_ONTOLOGY_SUBTYPE } from '../ontology/registry';

export interface DeterministicClassificationResult {
  documentType: string;
  confidenceScore: number;
  explanation: string;
  matchedEvidence: string[];
  reason: string;
  patientName: string | null;
  hospitalName: string | null;
  doctorName: string | null;
}

export class DeterministicMedicalClassifier {
  private threshold = 0.80; // Threshold to bypass LLM extraction

  public classify(ocrText: string): DeterministicClassificationResult {
    const lowerText = ocrText.toLowerCase();
    let bestSubtype: OntologySubtype = DEFAULT_ONTOLOGY_SUBTYPE;
    let maxScore = 0.0;
    let bestEvidence: string[] = [];
    let bestExplanation = 'Unclassified document';

    // Loop through all registry categories (except Other)
    for (const [key, config] of Object.entries(MEDICAL_ONTOLOGY_REGISTRY)) {
      if (key === 'Other') continue;

      const matchedKeywords: string[] = [];
      
      // Match keywords using boundary or substring searches
      for (const keyword of config.keywords) {
        const escaped = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(
          keyword.length <= 4 ? `\\b${escaped}\\b` : escaped,
          'i'
        );
        if (regex.test(lowerText)) {
          matchedKeywords.push(keyword);
        }
      }

      // Compute Score:
      // 1. Mandatory keywords matching ratio (65% weight)
      let mandatoryScore = 1.0;
      const mandatoryWords = config.confidenceRules.mandatoryKeywords || [];
      if (mandatoryWords.length > 0) {
        let matchedMandatoryCount = 0;
        for (const word of mandatoryWords) {
          const variations = word.split('|');
          const isMatched = variations.some(v => {
            const escaped = v.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            return new RegExp(escaped, 'i').test(lowerText);
          });
          if (isMatched) {
            matchedMandatoryCount++;
          }
        }
        mandatoryScore = matchedMandatoryCount / mandatoryWords.length;
      }

      // 2. Keyword density ratio (35% weight)
      // Cap density score at matching 5 keywords, or 40% of optional keywords
      const minToMatch = config.confidenceRules.minKeywordsToMatch || 2;
      const targetKeywordsCount = Math.max(minToMatch, Math.min(5, config.keywords.length * 0.4));
      const matchedRatio = matchedKeywords.length / targetKeywordsCount;
      const densityScore = Math.min(1.0, matchedRatio);

      // Final aggregated score
      const finalScore = (mandatoryScore * 0.65) + (densityScore * 0.35);



      if (finalScore > maxScore && matchedKeywords.length >= minToMatch) {
        maxScore = finalScore;
        bestSubtype = config;
        bestEvidence = matchedKeywords;
        bestExplanation = `Matches ${matchedKeywords.length} keywords for ${config.displayName} with mandatory ratio of ${(mandatoryScore * 100).toFixed(0)}%.`;
      }
    }

    // Extraction of patient and hospital metadata
    const trimmedOcr = ocrText.trim();
    let patientName: string | null = null;
    const nameMatch = trimmedOcr.match(/(?:patient name|patient|name)\s*:\s*([^\n\r,;:\t]+)/i);
    if (nameMatch && nameMatch[1]) {
      let candidate = nameMatch[1].trim();
      candidate = candidate.split(/\s{2,}|\b(age|gender|sex|dob|date|phone)\b/i)[0].trim();
      patientName = candidate.replace(/^mr\.|^ms\.|^mrs\./i, '').trim();
    }

    let hospitalName: string | null = null;
    const hospMatch = trimmedOcr.match(/(?:hospital|clinic|center|medical center|diagnostics|labs?|laboratory)\s*:\s*([^\n\r,]+)/i) || 
                      trimmedOcr.match(/^([^\n\r]+(?:hospitals?|clinics?|medical center|diagnostics|labs?|laboratory|imaging|radiology))/im);
    if (hospMatch && hospMatch[1]) {
      hospitalName = hospMatch[1].trim();
    }

    let doctorName: string | null = null;
    const docMatch = trimmedOcr.match(/(?:doctor|dr\.|physician|consultant)\s*:\s*([^\n\r,;:\t]+)/i) ||
                     trimmedOcr.match(/(?:dr\.\s+)([a-zA-Z\s]+)/i);
    if (docMatch && docMatch[1]) {
      doctorName = docMatch[1].split(/\s{2,}|\b(age|gender|sex|dob|date|phone)\b/i)[0].trim();
    }

    const confidence = Number(maxScore.toFixed(3));
    const isAboveThreshold = confidence >= this.threshold;

    return {
      documentType: isAboveThreshold ? bestSubtype.id : 'Other',
      confidenceScore: confidence,
      matchedEvidence: bestEvidence,
      explanation: bestExplanation,
      reason: isAboveThreshold 
        ? `Deterministic match confirmed ${bestSubtype.displayName} (${(confidence * 100).toFixed(0)}% confidence).`
        : `Uncertain classification (confidence: ${(confidence * 100).toFixed(0)}% below threshold of ${(this.threshold * 100).toFixed(0)}%). Falling back to generic parsing.`,
      patientName,
      hospitalName,
      doctorName
    };
  }
}

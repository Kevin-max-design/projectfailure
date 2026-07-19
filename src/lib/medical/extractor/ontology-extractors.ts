import OpenAI from 'openai';
import { MedicalExtraction } from '../../providers/medical-extraction-provider';
import { DeterministicClassificationResult } from '../classifier/deterministic-classifier';

export class OntologyExtractors {
  private openai: OpenAI | null = null;
  private model: string;

  constructor() {
    const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      });
    }
    this.model = process.env.AI_MODEL || 'gpt-4o';
  }

  /**
   * Main entrypoint for registry-driven extraction.
   * Maps subtypes to deterministic extractors or handles LLM fallback.
   */
  public async extract(
    ocrText: string,
    classification: DeterministicClassificationResult
  ): Promise<Partial<MedicalExtraction>> {
    const docType = classification.documentType;

    // 1. Skip LLM and run Deterministic Extractor if confidence is high
    if (classification.confidenceScore >= 0.80 && docType !== 'Other') {
      console.log(`Ontology Extractor: Running deterministic extractor for ${docType}...`);
      try {
        switch (docType) {
          case 'CBC':
            return this.extractCBCDeterministically(ocrText);
          case 'Prescription':
          case 'PRESCRIPTION':
            return this.extractPrescriptionDeterministically(ocrText);
          case 'LFT':
            return this.extractLFTDeterministically(ocrText);
          case 'KFT':
            return this.extractKFTDeterministically(ocrText);
          case 'Lipid Profile':
            return this.extractLipidProfileDeterministically(ocrText);
          case 'HbA1c':
            return this.extractHbA1cDeterministically(ocrText);
          case 'OP Bill':
            return this.extractOPBillDeterministically(ocrText);
          case 'Pharmacy Invoice':
            return this.extractPharmacyInvoiceDeterministically(ocrText);
          default:
            console.log(`No custom deterministic extractor for ${docType}, utilizing rule-based generic extractor.`);
        }
      } catch (err) {
        console.warn(`Deterministic extractor for ${docType} failed, falling back to LLM.`, err);
      }
    }

    // 2. LLM Fallback (for low confidence or unmapped subtypes)
    console.log(`Ontology Extractor: Invoking LLM fallback for ${docType}...`);
    return this.extractViaLLMFallback(ocrText, classification);
  }

  /**
   * Deterministic CBC Extractor (Regex and Token Line Parser)
   */
  private extractCBCDeterministically(ocrText: string): Partial<MedicalExtraction> {
    const lines = ocrText.split('\n');
    const labResults: any[] = [];

    const biomarkers = [
      { key: 'hemoglobin', patterns: [/hemoglobin/i, /haemoglobin/i, /\bhb\b/i], defaultUnit: 'g/dL', refRange: '12.0 - 16.0' },
      { key: 'wbc', patterns: [/\bwbc\b/i, /white blood cell/i, /leukocyte/i], defaultUnit: '10^3/uL', refRange: '4.0 - 11.0' },
      { key: 'rbc', patterns: [/\brbc\b/i, /red blood cell/i, /erythrocyte/i], defaultUnit: '10^6/uL', refRange: '4.5 - 5.9' },
      { key: 'platelets', patterns: [/platelet/i, /plt/i], defaultUnit: '10^3/uL', refRange: '150 - 450' }
    ];

    for (const marker of biomarkers) {
      for (const line of lines) {
        const matchesPattern = marker.patterns.some(p => p.test(line));
        if (matchesPattern) {
          // Extract numeric value (e.g. 15.6, 120000, 15,000)
          const numMatch = line.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\.\d+)/);
          if (numMatch) {
            const val = numMatch[1].replace(/,/g, '');
            const floatVal = parseFloat(val);

            // Deduce unit if present, else use default
            let unit = marker.defaultUnit;
            if (line.toLowerCase().includes('g/dl')) unit = 'g/dL';
            else if (line.toLowerCase().includes('10^3') || line.toLowerCase().includes('x10^3') || line.toLowerCase().includes('10-3')) unit = '10^3/uL';
            else if (line.toLowerCase().includes('10^6') || line.toLowerCase().includes('millions')) unit = '10^6/uL';

            // Determine abnormal flag
            let abnormalFlag = false;
            if (marker.key === 'hemoglobin' && floatVal < 12.0) abnormalFlag = true;
            else if (marker.key === 'wbc' && (floatVal < 4.0 || floatVal > 11.0)) abnormalFlag = true;
            else if (marker.key === 'platelets' && (floatVal < 150.0 || floatVal > 450.0)) abnormalFlag = true;

            labResults.push({
              testName: marker.key.toUpperCase(),
              value: val,
              unit,
              referenceRange: marker.refRange,
              abnormalFlag,
              date: new Date().toISOString().split('T')[0],
              confidence: 0.98,
              sourceText: line.trim()
            });
            break; // Move to next biomarker
          }
        }
      }
    }

    return {
      documentType: 'LAB_REPORT',
      labResults
    };
  }

  /**
   * Deterministic LFT Extractor
   */
  private extractLFTDeterministically(ocrText: string): Partial<MedicalExtraction> {
    const lines = ocrText.split('\n');
    const labResults: any[] = [];

    const biomarkers = [
      { key: 'Bilirubin Total', patterns: [/bilirubin total/i, /total bilirubin/i], defaultUnit: 'mg/dL', refRange: '0.2 - 1.2' },
      { key: 'SGOT (AST)', patterns: [/sgot/i, /ast/i, /aspartate aminotransferase/i], defaultUnit: 'U/L', refRange: '5 - 40' },
      { key: 'SGPT (ALT)', patterns: [/sgpt/i, /alt/i, /alanine aminotransferase/i], defaultUnit: 'U/L', refRange: '7 - 56' }
    ];

    for (const marker of biomarkers) {
      for (const line of lines) {
        if (marker.patterns.some(p => p.test(line))) {
          const numMatch = line.match(/(\d+(?:\.\d+)?)/);
          if (numMatch) {
            const val = numMatch[1];
            const floatVal = parseFloat(val);
            let abnormalFlag = false;

            if (marker.key.includes('Bilirubin') && floatVal > 1.2) abnormalFlag = true;
            else if (marker.key.includes('SGOT') && floatVal > 40) abnormalFlag = true;
            else if (marker.key.includes('SGPT') && floatVal > 56) abnormalFlag = true;

            labResults.push({
              testName: marker.key,
              value: val,
              unit: marker.defaultUnit,
              referenceRange: marker.refRange,
              abnormalFlag,
              date: new Date().toISOString().split('T')[0],
              confidence: 0.98,
              sourceText: line.trim()
            });
            break;
          }
        }
      }
    }

    return {
      documentType: 'LAB_REPORT',
      labResults
    };
  }

  /**
   * Deterministic KFT Extractor
   */
  private extractKFTDeterministically(ocrText: string): Partial<MedicalExtraction> {
    const lines = ocrText.split('\n');
    const labResults: any[] = [];

    const biomarkers = [
      { key: 'Creatinine', patterns: [/creatinine/i, /creat/i], defaultUnit: 'mg/dL', refRange: '0.6 - 1.2' },
      { key: 'Urea', patterns: [/\burea\b/i, /blood urea/i], defaultUnit: 'mg/dL', refRange: '15 - 45' }
    ];

    for (const marker of biomarkers) {
      for (const line of lines) {
        if (marker.patterns.some(p => p.test(line))) {
          const numMatch = line.match(/(\d+(?:\.\d+)?)/);
          if (numMatch) {
            const val = numMatch[1];
            const floatVal = parseFloat(val);
            let abnormalFlag = false;

            if (marker.key === 'Creatinine' && floatVal > 1.2) abnormalFlag = true;
            else if (marker.key === 'Urea' && floatVal > 45) abnormalFlag = true;

            labResults.push({
              testName: marker.key,
              value: val,
              unit: marker.defaultUnit,
              referenceRange: marker.refRange,
              abnormalFlag,
              date: new Date().toISOString().split('T')[0],
              confidence: 0.98,
              sourceText: line.trim()
            });
            break;
          }
        }
      }
    }

    return {
      documentType: 'LAB_REPORT',
      labResults
    };
  }

  /**
   * Deterministic Prescription Extractor (Regex Line Scraper)
   */
  private extractPrescriptionDeterministically(ocrText: string): Partial<MedicalExtraction> {
    const lines = ocrText.split('\n');
    const medications: any[] = [];

    // Simple rule: scan lines containing tablet/capsule/mg dosage forms
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      const hasMedKey = ['tab', 'cap', 'mg', 'tablet', 'capsule', 'syrup', 'ointment'].some(k => lowerLine.includes(k));
      const hasNumbers = /\d/.test(line);

      if (hasMedKey && hasNumbers) {
        // Extract dosage/strength e.g. 500mg, 10mg
        const strengthMatch = line.match(/(\d+\s*(?:mg|ml|mcg|g|ug|tablet|capsule|tab|cap)\b)/i);
        const dosage = strengthMatch ? strengthMatch[1].trim() : '1 tablet';

        // Find drug name: match letters before the first number or dash
        const namePart = line.split(/\b\d| - /)[0].trim();
        // Clean namePart from non-alphabetic starting chars (like Rx or list bullets)
        const drugName = namePart.replace(/^rx\b/i, '').replace(/^[^\w\s]+/, '').trim();

        let frequency = 'Once Daily';

        // Deduce frequency
        if (lowerLine.includes('twice') || lowerLine.includes(' bd ') || lowerLine.includes('twice daily')) frequency = 'Twice Daily';
        else if (lowerLine.includes('thrice') || lowerLine.includes(' tid ') || lowerLine.includes('three times')) frequency = 'Three Times Daily';
        else if (lowerLine.includes('once') || lowerLine.includes(' od ') || lowerLine.includes('once daily')) frequency = 'Once Daily';

        if (drugName.length >= 3) {
          medications.push({
            medicineName: drugName,
            dosage,
            frequency,
            instructions: line.trim(),
            confidence: 0.95,
            sourceText: line.trim()
          });
        }
      }
    }

    return {
      documentType: 'PRESCRIPTION',
      medications
    };
  }

  /**
   * Deterministic Lipid Profile Extractor
   */
  private extractLipidProfileDeterministically(ocrText: string): Partial<MedicalExtraction> {
    const lines = ocrText.split('\n');
    const labResults: any[] = [];

    const biomarkers = [
      { key: 'Cholesterol Total', patterns: [/total cholesterol/i, /cholesterol total/i, /\bcholesterol\b/i], defaultUnit: 'mg/dL', refRange: '< 200', maxNormal: 200 },
      { key: 'Triglycerides', patterns: [/triglycerides/i, /trig/i, /tg/i], defaultUnit: 'mg/dL', refRange: '< 150', maxNormal: 150 },
      { key: 'HDL Cholesterol', patterns: [/hdl/i, /high density lipoprotein/i], defaultUnit: 'mg/dL', refRange: '> 40', minNormal: 40 },
      { key: 'LDL Cholesterol', patterns: [/ldl/i, /low density lipoprotein/i], defaultUnit: 'mg/dL', refRange: '< 100', maxNormal: 100 }
    ];

    for (const marker of biomarkers) {
      for (const line of lines) {
        if (marker.patterns.some(p => p.test(line))) {
          const numMatch = line.match(/(\d+(?:\.\d+)?)/);
          if (numMatch) {
            const val = numMatch[1];
            const floatVal = parseFloat(val);
            let abnormalFlag = false;

            if (marker.maxNormal && floatVal > marker.maxNormal) abnormalFlag = true;
            if (marker.minNormal && floatVal < marker.minNormal) abnormalFlag = true;

            labResults.push({
              testName: marker.key,
              value: val,
              unit: marker.defaultUnit,
              referenceRange: marker.refRange,
              abnormalFlag,
              date: new Date().toISOString().split('T')[0],
              confidence: 0.98,
              sourceText: line.trim()
            });
            break;
          }
        }
      }
    }

    return {
      documentType: 'LAB_REPORT',
      labResults
    };
  }

  /**
   * Deterministic HbA1c Extractor
   */
  private extractHbA1cDeterministically(ocrText: string): Partial<MedicalExtraction> {
    const lines = ocrText.split('\n');
    const labResults: any[] = [];

    for (const line of lines) {
      if (/hba1c|glycated/i.test(line)) {
        // Remove 'hba1c' and '1c' to avoid matching the digit '1' in the name
        const cleanLine = line.replace(/hba1c/i, '').replace(/1c/i, '');
        const numMatch = cleanLine.match(/(\d+(?:\.\d+)?)/);
        if (numMatch) {
          const val = numMatch[1];
          const floatVal = parseFloat(val);
          const abnormalFlag = floatVal >= 5.7;

          labResults.push({
            testName: 'HbA1c',
            value: val,
            unit: '%',
            referenceRange: '4.0 - 5.6',
            abnormalFlag,
            date: new Date().toISOString().split('T')[0],
            confidence: 0.98,
            sourceText: line.trim()
          });
          break;
        }
      }
    }

    return {
      documentType: 'LAB_REPORT',
      labResults
    };
  }

  /**
   * Deterministic OP Bill Extractor
   */
  private extractOPBillDeterministically(ocrText: string): Partial<MedicalExtraction> {
    const lines = ocrText.split('\n');
    let totalAmt = '0.00';
    let gstAmt: string | null = null;

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('total') || lower.includes('paid') || lower.includes('net amount')) {
        const numMatch = line.match(/(\d+(?:\.\d+)?)/);
        if (numMatch) {
          totalAmt = numMatch[1];
        }
      }
      if (lower.includes('gst') || lower.includes('tax')) {
        const numMatch = line.match(/(\d+(?:\.\d+)?)/);
        if (numMatch) {
          gstAmt = numMatch[1];
        }
      }
    }

    // Store in unmapped items so billing info is saved
    const unmapped = [
      {
        text: `Total Paid Amount: ${totalAmt}`,
        sectionHeading: 'Outpatient Billing Details',
        confidence: 0.95,
        sourceText: `Total amount matched from OCR`
      }
    ];

    if (gstAmt) {
      unmapped.push({
        text: `GST: ${gstAmt}`,
        sectionHeading: 'Outpatient Billing Details',
        confidence: 0.95,
        sourceText: `GST amount matched from OCR`
      });
    }

    return {
      documentType: 'OP_BILL_RECEIPT',
      unmappedDocumentedInformation: unmapped as any
    };
  }

  /**
   * Deterministic Pharmacy Invoice Extractor
   */
  private extractPharmacyInvoiceDeterministically(ocrText: string): Partial<MedicalExtraction> {
    const lines = ocrText.split('\n');
    const medications: any[] = [];

    // Pharmacy invoices usually have rows with qty, batch, exp dt, drug name, price
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      const hasQty = /\bqty\b/i.test(line) || lowerLine.includes(' quantity ') || lowerLine.includes(' x ');
      const hasBatch = /batch|exp/i.test(line);

      // Extract medication lines with names and qty/batch
      if (hasBatch || (hasQty && /\d/.test(line))) {
        const words = line.trim().split(/\s+/);
        let drugName = '';
        let batch = '';
        let expiry = '';

        for (const word of words) {
          if (/^[a-zA-Z]{4,}$/.test(word) && !['batch', 'expiry', 'quantity', 'tablet', 'capsule', 'price'].includes(word.toLowerCase())) {
            drugName += (drugName ? ' ' : '') + word;
          }
        }

        // Try to match batch (alphanumeric like B.No, Batch No, e.g. AB1234)
        const batchMatch = line.match(/(?:batch|b\.?no|lot)\s*:?\s*([a-zA-Z0-9]+)/i);
        if (batchMatch) {
          batch = batchMatch[1];
        }

        // Try to match expiry date (e.g. 12/27, 09/2026)
        const expMatch = line.match(/(?:exp|expiry|exp\.?dt)\s*:?\s*(\d{2}\/\d{2,4})/i);
        if (expMatch) {
          expiry = expMatch[1];
        }

        if (drugName.length >= 3) {
          medications.push({
            medicineName: drugName,
            strength: null,
            quantity: '1',
            batch: batch || 'N/A',
            expiry: expiry || 'N/A',
            confidence: 0.95,
            sourceText: line.trim()
          });
        }
      }
    }

    return {
      documentType: 'PHARMACY_INVOICE',
      medications
    };
  }

  /**
   * Context-Aware LLM Fallback
   */
  private async extractViaLLMFallback(
    ocrText: string,
    classification: DeterministicClassificationResult
  ): Promise<Partial<MedicalExtraction>> {
    if (!this.openai) {
      throw new Error('AI API Client is not configured. Please define AI_API_KEY in .env.local to enable LLM processing fallback.');
    }

    const contextPrompt = `You are a medical record extraction engine.
The document has been pre-analyzed with the following classification context:
- Document Type Candidate: ${classification.documentType}
- Confidence rating: ${(classification.confidenceScore * 100).toFixed(0)}%
- Matched Evidence Tokens: ${classification.matchedEvidence.join(', ')}

Your task is to parse this document and extract its structured clinical properties. Output ONLY valid JSON matching this schema:
{
  "documentType": "${classification.documentType === 'Other' ? 'OTHER_MEDICAL_DOCUMENT' : classification.documentType}",
  "patientNameOnDocument": "extracted patient name or null",
  "diagnoses": [
    { "name": "diagnosis name", "confidence": 0.90, "sourceText": "evidence snippet" }
  ],
  "medications": [
    { "medicineName": "medicine name", "dosage": "dose", "frequency": "frequency", "confidence": 0.90, "sourceText": "evidence snippet" }
  ],
  "labResults": [
    { "testName": "test name", "value": "value", "unit": "unit", "referenceRange": "reference range", "abnormalFlag": boolean, "confidence": 0.90, "sourceText": "evidence" }
  ]
}

Raw OCR Text:
"""
${ocrText}
"""`;

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are a highly precise medical extraction API. You output ONLY valid JSON matching the schema. Never wrap in markdown backticks.'
        },
        {
          role: 'user',
          content: contextPrompt
        }
      ],
      response_format: { type: 'json_object' }
    });

    const text = response.choices[0]?.message?.content || '{}';
    return JSON.parse(text);
  }
}

import OpenAI from 'openai';
import { DocumentCategory } from '@/types';

export interface ClassificationResult {
  documentType: 'LAB_REPORT' | 'PHARMACY_INVOICE' | 'PRESCRIPTION' | 'DISCHARGE_SUMMARY' | 'OP_BILL_RECEIPT' | 'OTHER_MEDICAL_DOCUMENT' | 'NEEDS_REVIEW';
  explanation: string;
  confidenceScore: number;
  patientName: string | null;
  hospitalName: string | null;
  doctorName: string | null;
  department: string | null;
  sections: Array<{ name: string; type: 'results' | 'billing' | 'prescription' | 'diagnosis' | 'discharge' | 'appointment' | 'procedure' | 'identity' | 'other' }>;
}

export class DocumentClassifier {
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

  public async classifyDocument(ocrText: string, userCategory?: string): Promise<ClassificationResult> {
    // If the user manually chose a category, respect it but still perform analysis
    if (userCategory && userCategory !== 'Auto Detect') {
      const mapped = this.mapCategoryToDocType(userCategory);
      return {
        documentType: mapped,
        explanation: `User manually selected category: ${userCategory}`,
        confidenceScore: 1.0,
        patientName: null,
        hospitalName: null,
        doctorName: null,
        department: null,
        sections: []
      };
    }

    if (this.openai) {
      try {
        const prompt = `Analyze the following raw OCR text of a medical document to classify it like an experienced Hospital Medical Records Officer.
Do NOT classify based on simple keyword matches. You must understand the overall semantic meaning, layout, and structure.

For example:
- A billing receipt listing "CBC Test ₹300" is a billing/invoice document (OP_BILL_RECEIPT), NOT a laboratory report (LAB_REPORT) because it does not contain test results/values.
- A pharmacy invoice listing medicine names is a billing document (PHARMACY_INVOICE), NOT a prescription (PRESCRIPTION).
- An outpatient bill containing consultation fees is OP_BILL_RECEIPT, not a clinical note or discharge summary.

Output ONLY valid JSON matching this schema:
{
  "documentType": "LAB_REPORT" | "PHARMACY_INVOICE" | "PRESCRIPTION" | "DISCHARGE_SUMMARY" | "OP_BILL_RECEIPT" | "OTHER_MEDICAL_DOCUMENT" | "NEEDS_REVIEW",
  "explanation": "Brief explanation of why this document type was chosen, citing layout patterns (e.g. presence of tables, billing totals, prescription headers, test result values)",
  "confidenceScore": number (0.0 to 1.0),
  "patientName": "Extracted patient name or null",
  "hospitalName": "Extracted hospital/clinic name or null",
  "doctorName": "Extracted doctor name or null",
  "department": "Extracted clinic/hospital department or null",
  "sections": [
    {
      "name": "section header or description",
      "type": "results" | "billing" | "prescription" | "diagnosis" | "discharge" | "appointment" | "procedure" | "identity" | "other"
    }
  ]
}

If your confidence in the document classification is less than 0.70, or the document structure is ambiguous, set "documentType" to "NEEDS_REVIEW" and set the confidence to your actual low score.

OCR text to analyze:
\"\"\"
${ocrText}
\"\"\"`;

        const response = await this.openai.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a precise medical records classifier. Output ONLY valid JSON matching the schema. Never include markdown formatting like ```json.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          response_format: { type: 'json_object' }
        });

        const text = response.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(text);
        
        // If LLM confidence is low, override type to NEEDS_REVIEW
        if (parsed.confidenceScore < 0.70) {
          parsed.documentType = 'NEEDS_REVIEW';
        }

        return parsed as ClassificationResult;
      } catch (err) {
        console.warn('OpenAI classification failed. Falling back to pattern-based reasoning classifier.', err);
      }
    }

    return this.classifyPatternBased(ocrText);
  }

  private classifyPatternBased(ocrText: string): ClassificationResult {
    const lowerText = ocrText.toLowerCase();
    
    // Look for indicators of document types:
    // 1. Billing indicators
    const hasBillingHeaders = lowerText.includes('invoice') || lowerText.includes('tax invoice') || lowerText.includes('bill of supply') || lowerText.includes('billno') || lowerText.includes('bill no');
    const hasTotals = lowerText.includes('total') || lowerText.includes('cgst') || lowerText.includes('sgst') || lowerText.includes('amount') || lowerText.includes('rupees');
    const hasMedicines = lowerText.includes('tablet') || lowerText.includes('capsule') || lowerText.includes('tab.') || lowerText.includes('cap.') || lowerText.includes('exp dt') || lowerText.includes('batch no');
    
    const hasHospitalOrOp = lowerText.includes('consultant') || lowerText.includes('op bill') || lowerText.includes('op receipt') || lowerText.includes('consultation fee') || lowerText.includes('registration fee');
    
    const hasLabResultRanges = lowerText.includes('reference range') || lowerText.includes('reference interval') || lowerText.includes('observed value') || lowerText.includes('biological reference') || lowerText.includes('normal range');
    const hasLabUnits = lowerText.includes('g/dl') || lowerText.includes('mg/dl') || lowerText.includes('/cumm') || lowerText.includes('fl') || lowerText.includes('pg') || lowerText.includes('vol%') || lowerText.includes('gm%');

    // Check for common lab parameter names to classify correctly even without reference range label
    const hasLabKeywords = /\b(haemoglobin|hemoglobin|leukocytes|erythrocytes|platelets|wbc|rbc|cbc|lymphocytes|eosinophils|neutrophils|monocytes|basophils|hematocrit|pcv|mcv|mch|mchc|bilirubin|creatinine|urea|sgot|sgpt|cholesterol|triglycerides|hba1c|thyroid|tsh|t3|t4)\b/i.test(ocrText);
    const isLabReport = hasLabKeywords || (hasLabResultRanges && hasLabUnits);

    // Regex match Rx/prescription keywords using whole-word boundaries to avoid false positives (e.g. concentration)
    const hasPrescriptionRx = /\brx\b/i.test(ocrText) || /\b(take\s+1\s+tab|once\s+daily|twice\s+daily)\b/i.test(ocrText) || /\b(bd|od|tid|qid|qd)\b/i.test(ocrText);

    const hasDischargeAdmission = lowerText.includes('discharge summary') || lowerText.includes('discharge card') || (lowerText.includes('date of admission') && lowerText.includes('date of discharge'));

    let documentType: ClassificationResult['documentType'] = 'OTHER_MEDICAL_DOCUMENT';
    let explanation = 'Default rule-based classification';
    let confidenceScore = 0.50;

    // 1. Discharge Summary
    if (hasDischargeAdmission) {
      documentType = 'DISCHARGE_SUMMARY';
      explanation = 'Detected admission and discharge dates along with discharge header';
      confidenceScore = 0.95;
    }
    // 2. Pharmacy Invoice
    else if (hasBillingHeaders && hasTotals && hasMedicines) {
      documentType = 'PHARMACY_INVOICE';
      explanation = 'Detected billing headers, monetary totals, and pharmaceutical indicators (batch, expiry, tablets)';
      confidenceScore = 0.95;
    }
    // 3. OP Bill / Receipt
    else if (hasBillingHeaders && hasTotals && (hasHospitalOrOp || lowerText.includes('hospital') || lowerText.includes('clinic'))) {
      documentType = 'OP_BILL_RECEIPT';
      explanation = 'Detected billing invoice headers, totals, and outpatient service keywords or hospital branding';
      confidenceScore = 0.90;
    }
    // 4. Prescription
    else if (hasPrescriptionRx && !hasBillingHeaders && !hasTotals) {
      documentType = 'PRESCRIPTION';
      explanation = 'Detected prescription directive (Rx) and dosage frequencies without billing transactions';
      confidenceScore = 0.90;
    }
    // 5. Lab Report
    else if (isLabReport && !hasTotals) {
      documentType = 'LAB_REPORT';
      explanation = 'Detected diagnostic test reference ranges, parameters, or laboratory units of measurement without financial transactions';
      confidenceScore = 0.95;
    }
    
    // Extract basic fields via regex
    let patientName: string | null = null;
    const nameMatch = ocrText.match(/(?:patient name|name)\s*:\s*([^\n]+)/i);
    if (nameMatch && nameMatch[1]) {
      patientName = nameMatch[1].trim();
    }

    let hospitalName: string | null = null;
    const hospMatch = ocrText.match(/(?:hospital|clinic|center)\s*:\s*([^\n]+)/i) || ocrText.match(/^([^\n]+hospitals?|[^\n]+clinic)/i);
    if (hospMatch && hospMatch[1]) {
      hospitalName = hospMatch[1].trim();
    }

    if (confidenceScore < 0.70) {
      documentType = 'NEEDS_REVIEW';
    }

    return {
      documentType,
      explanation,
      confidenceScore,
      patientName,
      hospitalName,
      doctorName: null,
      department: null,
      sections: []
    };
  }

  private mapCategoryToDocType(category: string): ClassificationResult['documentType'] {
    switch (category) {
      case 'Prescription': return 'PRESCRIPTION';
      case 'Lab Report': return 'LAB_REPORT';
      case 'Discharge Summary': return 'DISCHARGE_SUMMARY';
      case 'OP Bill / Receipt': return 'OP_BILL_RECEIPT';
      case 'Pharmacy Invoice': return 'PHARMACY_INVOICE';
      default: return 'OTHER_MEDICAL_DOCUMENT';
    }
  }
}

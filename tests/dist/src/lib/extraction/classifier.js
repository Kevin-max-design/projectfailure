"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentClassifier = void 0;
const openai_1 = __importDefault(require("openai"));
class DocumentClassifier {
    constructor() {
        this.openai = null;
        const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
        if (apiKey) {
            this.openai = new openai_1.default({
                apiKey,
                baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
            });
        }
        this.model = process.env.AI_MODEL || 'gpt-4o';
    }
    async classifyDocument(ocrText, userCategory) {
        var _a, _b;
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
                const text = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '{}';
                const parsed = JSON.parse(text);
                // If LLM confidence is low, override type to NEEDS_REVIEW
                if (parsed.confidenceScore < 0.70) {
                    parsed.documentType = 'NEEDS_REVIEW';
                }
                return parsed;
            }
            catch (err) {
                console.warn('OpenAI classification failed. Falling back to pattern-based reasoning classifier.', err);
            }
        }
        return this.classifyPatternBased(ocrText);
    }
    classifyPatternBased(ocrText) {
        const lowerText = ocrText.toLowerCase();
        // Check layout and sections naturally
        const hasBillingHeaders = lowerText.includes('invoice') || lowerText.includes('tax invoice') || lowerText.includes('bill of supply') || lowerText.includes('billno') || lowerText.includes('bill no');
        const hasTotals = lowerText.includes('total') || lowerText.includes('cgst') || lowerText.includes('sgst') || lowerText.includes('amount') || lowerText.includes('rupees');
        const hasMedicines = lowerText.includes('tablet') || lowerText.includes('capsule') || lowerText.includes('tab.') || lowerText.includes('cap.') || lowerText.includes('exp dt') || lowerText.includes('batch no');
        const hasHospitalOrOp = lowerText.includes('consultant') || lowerText.includes('op bill') || lowerText.includes('op receipt') || lowerText.includes('consultation fee') || lowerText.includes('registration fee');
        const hasLabResultRanges = lowerText.includes('reference range') || lowerText.includes('reference interval') || lowerText.includes('observed value') || lowerText.includes('biological reference') || lowerText.includes('normal range');
        const hasLabUnits = lowerText.includes('g/dl') || lowerText.includes('mg/dl') || lowerText.includes('/cumm') || lowerText.includes('fl') || lowerText.includes('pg');
        const hasPrescriptionRx = lowerText.includes('rx') || lowerText.includes('take 1 tab') || lowerText.includes('once daily') || lowerText.includes('twice daily') || lowerText.includes('bd ') || lowerText.includes('od ') || lowerText.includes('tid ');
        const hasDischargeAdmission = lowerText.includes('discharge summary') || lowerText.includes('discharge card') || (lowerText.includes('date of admission') && lowerText.includes('date of discharge'));
        let documentType = 'OTHER_MEDICAL_DOCUMENT';
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
        else if (hasLabResultRanges && hasLabUnits && !hasTotals) {
            documentType = 'LAB_REPORT';
            explanation = 'Detected diagnostic test reference ranges and laboratory units of measurement without financial transactions';
            confidenceScore = 0.95;
        }
        // Extract basic fields via regex
        let patientName = null;
        const nameMatch = ocrText.match(/(?:patient name|name)\s*:\s*([^\n]+)/i);
        if (nameMatch && nameMatch[1]) {
            patientName = nameMatch[1].trim();
        }
        let hospitalName = null;
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
    mapCategoryToDocType(category) {
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
exports.DocumentClassifier = DocumentClassifier;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecializedExtractors = void 0;
const openai_1 = __importDefault(require("openai"));
const zod_1 = require("zod");
class SpecializedExtractors {
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
    async extract(ocrText, docType) {
        if (this.openai) {
            try {
                switch (docType) {
                    case 'LAB_REPORT':
                        return await this.extractLabReport(ocrText);
                    case 'PHARMACY_INVOICE':
                        return await this.extractPharmacyInvoice(ocrText);
                    case 'PRESCRIPTION':
                        return await this.extractPrescription(ocrText);
                    case 'DISCHARGE_SUMMARY':
                        return await this.extractDischargeSummary(ocrText);
                    case 'OP_BILL_RECEIPT':
                        return await this.extractOpBill(ocrText);
                    default:
                        return await this.extractGeneric(ocrText);
                }
            }
            catch (err) {
                console.warn(`LLM extraction failed for ${docType}, falling back to rules.`, err);
            }
        }
        return this.extractRulesFallback(ocrText, docType);
    }
    async callLLM(prompt, schema) {
        var _a, _b;
        if (!this.openai)
            throw new Error('OpenAI client not initialized');
        const response = await this.openai.chat.completions.create({
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: 'You are a precise medical data extractor. Extract data according to the schema provided. Output ONLY valid JSON matching the schema. Never include markdown codeblocks.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            response_format: { type: 'json_object' }
        });
        const text = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '{}';
        return JSON.parse(text);
    }
    async extractLabReport(ocrText) {
        const schema = zod_1.z.object({
            labResults: zod_1.z.array(zod_1.z.object({
                testName: zod_1.z.string(),
                value: zod_1.z.string(),
                unit: zod_1.z.string().nullable(),
                referenceRange: zod_1.z.string().nullable(),
                abnormalFlag: zod_1.z.boolean().nullable(),
                date: zod_1.z.string().nullable(),
                confidence: zod_1.z.number(),
                sourceText: zod_1.z.string()
            }))
        });
        const prompt = `You are a medical laboratory records officer. Extract all tests, results, units, reference ranges, and abnormal flags from the following OCR text.
Do NOT guess or assume values. Only extract what is clearly written in the document.

OCR Text:
"""
${ocrText}
"""`;
        const data = await this.callLLM(prompt, schema);
        return {
            documentType: 'LAB_REPORT',
            labResults: data.labResults || []
        };
    }
    async extractPharmacyInvoice(ocrText) {
        const schema = zod_1.z.object({
            medications: zod_1.z.array(zod_1.z.object({
                medicineName: zod_1.z.string(),
                strength: zod_1.z.string().nullable(),
                quantity: zod_1.z.string().nullable(),
                batch: zod_1.z.string().nullable(),
                expiry: zod_1.z.string().nullable(),
                confidence: zod_1.z.number(),
                sourceText: zod_1.z.string()
            })),
            invoiceTotals: zod_1.z.object({
                gstAmount: zod_1.z.string().nullable(),
                totalAmount: zod_1.z.string().nullable()
            }).optional()
        });
        const prompt = `You are a pharmacy billing auditor. Extract all medications, strength, quantity, batch number, expiry date, GST details, and invoice totals from the following OCR text.
Extract medicine items as medications. Return them in the medications array.

OCR Text:
"""
${ocrText}
"""`;
        const data = await this.callLLM(prompt, schema);
        // Store invoice totals in unmappedDocumentedInformation so they are kept
        const unmapped = [];
        if (data.invoiceTotals) {
            if (data.invoiceTotals.gstAmount) {
                unmapped.push({
                    text: `GST Amount: ${data.invoiceTotals.gstAmount}`,
                    sectionHeading: 'Pharmacy Billing Totals',
                    confidence: 0.95
                });
            }
            if (data.invoiceTotals.totalAmount) {
                unmapped.push({
                    text: `Total Paid Amount: ${data.invoiceTotals.totalAmount}`,
                    sectionHeading: 'Pharmacy Billing Totals',
                    confidence: 0.95
                });
            }
        }
        return {
            documentType: 'PHARMACY_INVOICE',
            medications: data.medications || [],
            unmappedDocumentedInformation: unmapped
        };
    }
    async extractPrescription(ocrText) {
        const schema = zod_1.z.object({
            medications: zod_1.z.array(zod_1.z.object({
                medicineName: zod_1.z.string(),
                genericName: zod_1.z.string().nullable(),
                strength: zod_1.z.string().nullable(),
                dosage: zod_1.z.string().nullable(),
                frequency: zod_1.z.string().nullable(),
                duration: zod_1.z.string().nullable(),
                instructions: zod_1.z.string().nullable(),
                confidence: zod_1.z.number(),
                sourceText: zod_1.z.string()
            }))
        });
        const prompt = `You are a clinical pharmacologist. Extract all prescribed medications, generic names, strength, dosage (e.g. 1 tab), frequency (e.g. once daily), duration (e.g. 5 days), and clinical instructions (e.g. after food) from the following OCR text.

OCR Text:
"""
${ocrText}
"""`;
        const data = await this.callLLM(prompt, schema);
        return {
            documentType: 'PRESCRIPTION',
            medications: data.medications || []
        };
    }
    async extractDischargeSummary(ocrText) {
        var _a, _b, _c, _d, _e;
        const schema = zod_1.z.object({
            diagnoses: zod_1.z.array(zod_1.z.object({
                name: zod_1.z.string(),
                isChronic: zod_1.z.boolean().nullable(),
                confidence: zod_1.z.number(),
                sourceText: zod_1.z.string()
            })),
            encounterDetails: zod_1.z.object({
                admissionDate: zod_1.z.string().nullable(),
                dischargeDate: zod_1.z.string().nullable(),
                hospitalName: zod_1.z.string().nullable()
            }),
            clinicalInformation: zod_1.z.object({
                historyOfPresentIllness: zod_1.z.string().nullable()
            }),
            treatment: zod_1.z.object({
                treatmentGiven: zod_1.z.string().nullable()
            })
        });
        const prompt = `You are a hospital medical discharge supervisor. Extract diagnoses, HPI (history of present illness), admission date, discharge date, hospital name, and treatment given from this discharge summary text.

OCR Text:
"""
${ocrText}
"""`;
        const data = await this.callLLM(prompt, schema);
        // Format to match EncounterDetailsSchema etc.
        const encDetails = {};
        if ((_a = data.encounterDetails) === null || _a === void 0 ? void 0 : _a.admissionDate) {
            encDetails.admissionDate = { value: data.encounterDetails.admissionDate, confidence: 0.95, sourceText: data.encounterDetails.admissionDate, page: 1 };
        }
        if ((_b = data.encounterDetails) === null || _b === void 0 ? void 0 : _b.dischargeDate) {
            encDetails.dischargeDate = { value: data.encounterDetails.dischargeDate, confidence: 0.95, sourceText: data.encounterDetails.dischargeDate, page: 1 };
        }
        if ((_c = data.encounterDetails) === null || _c === void 0 ? void 0 : _c.hospitalName) {
            encDetails.hospitalName = { value: data.encounterDetails.hospitalName, confidence: 0.95, sourceText: data.encounterDetails.hospitalName, page: 1 };
        }
        const clinicalInfo = {};
        if ((_d = data.clinicalInformation) === null || _d === void 0 ? void 0 : _d.historyOfPresentIllness) {
            clinicalInfo.historyOfPresentIllness = { value: data.clinicalInformation.historyOfPresentIllness, confidence: 0.95, sourceText: data.clinicalInformation.historyOfPresentIllness, page: 1 };
        }
        const treat = {};
        if ((_e = data.treatment) === null || _e === void 0 ? void 0 : _e.treatmentGiven) {
            treat.treatmentGiven = { value: data.treatment.treatmentGiven, confidence: 0.95, sourceText: data.treatment.treatmentGiven, page: 1 };
        }
        return {
            documentType: 'DISCHARGE_SUMMARY',
            diagnoses: data.diagnoses || [],
            encounterDetails: encDetails,
            clinicalInformation: clinicalInfo,
            treatment: treat
        };
    }
    async extractOpBill(ocrText) {
        var _a, _b;
        const schema = zod_1.z.object({
            encounterDetails: zod_1.z.object({
                hospitalName: zod_1.z.string().nullable(),
                doctorName: zod_1.z.string().nullable(),
                clinicName: zod_1.z.string().nullable()
            }),
            billedServices: zod_1.z.array(zod_1.z.object({
                serviceName: zod_1.z.string(),
                charge: zod_1.z.string(),
                confidence: zod_1.z.number(),
                sourceText: zod_1.z.string()
            }))
        });
        const prompt = `You are an outpatient hospital billing officer. Extract the hospital/clinic name, doctor name, and all outpatient consultation fees, service items, and charges from the following OCR text.

OCR Text:
"""
${ocrText}
"""`;
        const data = await this.callLLM(prompt, schema);
        const encDetails = {};
        if ((_a = data.encounterDetails) === null || _a === void 0 ? void 0 : _a.hospitalName) {
            encDetails.hospitalName = { value: data.encounterDetails.hospitalName, confidence: 0.95, sourceText: data.encounterDetails.hospitalName, page: 1 };
        }
        if ((_b = data.encounterDetails) === null || _b === void 0 ? void 0 : _b.doctorName) {
            encDetails.doctorName = { value: data.encounterDetails.doctorName, confidence: 0.95, sourceText: data.encounterDetails.doctorName, page: 1 };
        }
        // Convert billed services to unmappedDocumentedInformation
        const unmapped = (data.billedServices || []).map((srv) => ({
            text: `${srv.serviceName}: ₹${srv.charge}`,
            sectionHeading: 'Outpatient Services & Charges',
            page: 1,
            sourceText: srv.sourceText,
            confidence: srv.confidence
        }));
        return {
            documentType: 'OP_BILL_RECEIPT',
            encounterDetails: encDetails,
            unmappedDocumentedInformation: unmapped
        };
    }
    async extractGeneric(ocrText) {
        // Return empty fields
        return {
            documentType: 'OTHER_MEDICAL_DOCUMENT'
        };
    }
    extractRulesFallback(ocrText, docType) {
        const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const lowerText = ocrText.toLowerCase();
        // 1. Lab Report rules
        if (docType === 'LAB_REPORT') {
            const results = [];
            // Look for lines containing numbers/units
            const labRegex = /([a-zA-Z\s\(\)\-\/]+)\s+([\d\.]+)\s*([a-zA-Z\d\^%\/\*]+)?\s*(?:\bref\b|\bnormal\b|[\d\.\s\-–to]+)?/gi;
            let match;
            let limit = 0;
            while ((match = labRegex.exec(ocrText)) !== null && limit < 15) {
                const name = match[1].trim();
                const value = match[2];
                const unit = match[3] || '';
                // Exclude common header items
                if (['page', 'bill', 'mobile', 'tel', 'phone', 'sl', 'no', 'rs', 'gst'].some(k => name.toLowerCase().includes(k)))
                    continue;
                if (name.length > 5 && name.length < 40) {
                    results.push({
                        testName: name,
                        value,
                        unit,
                        referenceRange: 'N/A',
                        abnormalFlag: false,
                        confidence: 0.80,
                        sourceText: match[0],
                        page: 1
                    });
                    limit++;
                }
            }
            return { documentType: 'LAB_REPORT', labResults: results };
        }
        // 2. Pharmacy Invoice rules
        if (docType === 'PHARMACY_INVOICE') {
            const meds = [];
            // Look for capsule / tablet keywords
            const medRegex = /([a-zA-Z0-9\s\-]+(?:\btablet\b|\bcapsule\b|\btab\b|\bcap\b|\bmg\b|\bml\b)[a-zA-Z0-9\s\-]*)/gi;
            let match;
            let limit = 0;
            while ((match = medRegex.exec(ocrText)) !== null && limit < 10) {
                const name = match[1].trim();
                if (name.length > 5 && name.length < 50) {
                    meds.push({
                        medicineName: name,
                        strength: null,
                        quantity: '1',
                        batch: 'N/A',
                        expiry: 'N/A',
                        confidence: 0.80,
                        sourceText: match[0]
                    });
                    limit++;
                }
            }
            return { documentType: 'PHARMACY_INVOICE', medications: meds };
        }
        // 3. Prescription rules
        if (docType === 'PRESCRIPTION') {
            const meds = [];
            const lines = ocrText.split('\n');
            let limit = 0;
            for (const line of lines) {
                if ((line.toLowerCase().includes('tab') || line.toLowerCase().includes('cap') || line.toLowerCase().includes('once') || line.toLowerCase().includes('daily')) && limit < 10) {
                    meds.push({
                        medicineName: line.trim(),
                        genericName: null,
                        strength: null,
                        dosage: '1 tab',
                        frequency: 'Once daily',
                        duration: '5 days',
                        instructions: 'After food',
                        confidence: 0.80,
                        sourceText: line
                    });
                    limit++;
                }
            }
            return { documentType: 'PRESCRIPTION', medications: meds };
        }
        // 4. Discharge Summary rules
        if (docType === 'DISCHARGE_SUMMARY') {
            let admissionDate = null;
            let dischargeDate = null;
            const dates = ocrText.match(/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/g) || [];
            if (dates.length >= 2) {
                admissionDate = dates[0];
                dischargeDate = dates[1];
            }
            return {
                documentType: 'DISCHARGE_SUMMARY',
                encounterDetails: {
                    admissionDate: { value: admissionDate || null, confidence: 0.80, sourceText: admissionDate || null, page: 1 },
                    dischargeDate: { value: dischargeDate || null, confidence: 0.80, sourceText: dischargeDate || null, page: 1 }
                }
            };
        }
        // 5. OP Bill / Receipt rules
        if (docType === 'OP_BILL_RECEIPT') {
            return {
                documentType: 'OP_BILL_RECEIPT',
                unmappedDocumentedInformation: [
                    {
                        text: 'Billed Services & Consultation charges',
                        sectionHeading: 'Outpatient Services',
                        confidence: 0.80
                    }
                ]
            };
        }
        return { documentType: 'OTHER_MEDICAL_DOCUMENT' };
    }
}
exports.SpecializedExtractors = SpecializedExtractors;

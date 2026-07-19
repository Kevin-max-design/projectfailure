"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalExtractionProvider = void 0;
const medical_extraction_provider_1 = require("./medical-extraction-provider");
const openai_1 = __importDefault(require("openai"));
class LocalExtractionProvider {
    constructor() {
        this.localLlmBaseUrl = process.env.LOCAL_LLM_BASE_URL || 'http://127.0.0.1:11434';
        this.localLlmModel = process.env.LOCAL_LLM_MODEL || '';
    }
    async extractMedicalData(ocrText, category) {
        var _a, _b;
        let llmSuccess = false;
        let extractionResult = null;
        // 1. Try local LLM (Ollama) if base URL and model are configured/available
        if (this.localLlmModel) {
            try {
                console.log(`Checking local LLM at ${this.localLlmBaseUrl} with model ${this.localLlmModel}...`);
                // Simple health check to local LLM server
                const healthRes = await fetch(`${this.localLlmBaseUrl}/api/tags`, { signal: AbortSignal.timeout(1500) });
                if (healthRes.ok) {
                    const client = new openai_1.default({
                        apiKey: 'local-ollama',
                        baseURL: `${this.localLlmBaseUrl}/v1`
                    });
                    const prompt = `You are a medical document structuring engine. Your task is STAGE B: convert the provided faithful raw transcription of a medical document (Stage A capture) into structured medical sections.
You are NOT diagnosing the patient. Extract only information explicitly visible or clearly stated in the supplied document text.
Never fill missing information using medical knowledge or assumptions. If a field is not present in the text, assign null.
Preserve the exact original wording in the sourceText fields.
Do not convert absence of information into negative findings.
Extract everything into a JSON format matching the medical extraction schema. Return ONLY valid JSON, do not wrap in markdown block backticks.

Document raw text content (Stage A Capture):
"""
${ocrText}
"""`;
                    const response = await client.chat.completions.create({
                        model: this.localLlmModel,
                        messages: [
                            {
                                role: 'system',
                                content: 'You are a highly precise medical extraction API. You output ONLY valid JSON matching the schema.'
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
                    extractionResult = medical_extraction_provider_1.MedicalExtractionSchema.parse(parsed);
                    llmSuccess = true;
                    console.log("Local LLM structuring completed successfully.");
                }
            }
            catch (err) {
                console.warn("Local LLM extraction failed or server offline. Falling back to deterministic rules parser.", err);
            }
        }
        if (llmSuccess && extractionResult) {
            return extractionResult;
        }
        // 2. Deterministic Extraction Fallback (Rules and Regex Parser)
        console.log("Executing deterministic regex-based fallback extraction...");
        return this.parseDeterministically(ocrText, category);
    }
    parseDeterministically(ocrText, category) {
        var _a, _b, _c, _d;
        const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const paragraphs = ocrText.split('\n').map(p => p.trim()).filter(p => p.length > 5);
        // Initial empty template matching MedicalExtractionSchema
        const result = {
            documentType: 'OTHER_MEDICAL_DOCUMENT',
            classificationConfidence: 1.0,
            classificationSource: 'rule_engine',
            documentTitle: { value: 'Medical Document', confidence: 0.90, sourceText: 'Medical Document', page: 1 },
            documentDate: { value: null, confidence: 1.0, sourceText: null, page: 1 },
            hospitalName: { value: null, confidence: 1.0, sourceText: null, page: 1 },
            doctorName: { value: null, confidence: 1.0, sourceText: null, page: 1 },
            doctorSpecialization: { value: null, confidence: 1.0, sourceText: null, page: 1 },
            patientNameOnDocument: { value: null, confidence: 1.0, sourceText: null, page: 1 },
            patientAgeOnDocument: { value: null, confidence: 1.0, sourceText: null, page: 1 },
            patientDetails: {
                patientNameOnDocument: { value: null, confidence: 1.0, sourceText: null, page: 1 },
                age: { value: null, confidence: 1.0, sourceText: null, page: 1 },
                gender: { value: null, confidence: 1.0, sourceText: null, page: 1 },
                patientIdOrMrn: { value: null, confidence: 1.0, sourceText: null, page: 1 }
            },
            encounterDetails: {
                hospitalName: { value: null, confidence: 1.0, sourceText: null, page: 1 },
                clinicName: { value: null, confidence: 1.0, sourceText: null, page: 1 },
                doctorName: { value: null, confidence: 1.0, sourceText: null, page: 1 },
                doctorSpecialization: { value: null, confidence: 1.0, sourceText: null, page: 1 },
                admissionDate: { value: null, confidence: 1.0, sourceText: null, page: 1 },
                dischargeDate: { value: null, confidence: 1.0, sourceText: null, page: 1 },
                visitDate: { value: null, confidence: 1.0, sourceText: null, page: 1 }
            },
            clinicalInformation: {
                chiefComplaints: [],
                presentingSymptoms: [],
                historyOfPresentIllness: { value: null, confidence: 1.0, sourceText: null, page: 1 },
                pastMedicalHistory: { value: null, confidence: 1.0, sourceText: null, page: 1 },
                familyHistory: { value: null, confidence: 1.0, sourceText: null, page: 1 },
                provisionalDiagnoses: [],
                finalDiagnoses: [],
                comorbidities: []
            },
            examination: {
                vitals: {
                    bp: { value: null, confidence: 1.0, sourceText: null, page: 1 },
                    hr: { value: null, confidence: 1.0, sourceText: null, page: 1 },
                    temp: { value: null, confidence: 1.0, sourceText: null, page: 1 },
                    rr: { value: null, confidence: 1.0, sourceText: null, page: 1 },
                    spo2: { value: null, confidence: 1.0, sourceText: null, page: 1 }
                },
                generalExamination: { value: null, confidence: 1.0, sourceText: null, page: 1 },
                systemicExamination: { value: null, confidence: 1.0, sourceText: null, page: 1 },
                clinicalFindings: { value: null, confidence: 1.0, sourceText: null, page: 1 }
            },
            investigations: {
                testsOrdered: [],
                imaging: [],
                investigationFindings: { value: null, confidence: 1.0, sourceText: null, page: 1 }
            },
            treatment: {
                surgeries: [],
                treatmentGiven: { value: null, confidence: 1.0, sourceText: null, page: 1 },
                hospitalCourse: { value: null, confidence: 1.0, sourceText: null, page: 1 }
            },
            dischargePlan: {
                dietaryAdvice: { value: null, confidence: 1.0, sourceText: null, page: 1 },
                activityAdvice: { value: null, confidence: 1.0, sourceText: null, page: 1 },
                warningSigns: [],
                referrals: [],
                nextVisit: { value: null, confidence: 1.0, sourceText: null, page: 1 }
            },
            diagnoses: [],
            medications: [],
            labResults: [],
            procedures: [],
            allergies: [],
            notes: [],
            certificatesOrRecommendations: [],
            unreadableSections: [],
            unmappedDocumentedInformation: []
        };
        // Auto-detect Document Category based on layout, table structures, and text patterns
        const lowerText = ocrText.toLowerCase();
        let docType = 'OTHER_MEDICAL_DOCUMENT';
        let classConf = 0.50;
        const classSrc = 'rule_engine';
        // 1. Detect Billing/Financial Structures (Invoices, Receipts, Bills)
        const hasBillingKeywords = lowerText.includes('bill no') ||
            lowerText.includes('bill date') ||
            lowerText.includes('bill amt') ||
            lowerText.includes('amount (rs)') ||
            lowerText.includes('amount (rs') ||
            lowerText.includes('amount (in words)') ||
            lowerText.includes('tax invoice') ||
            lowerText.includes('bill of supply') ||
            lowerText.includes('receipt') ||
            lowerText.includes('invoice') ||
            lowerText.includes('cgst') ||
            lowerText.includes('sgst') ||
            lowerText.includes('rate') ||
            lowerText.includes('qty') ||
            lowerText.includes('disc amt') ||
            lowerText.includes('payment mode') ||
            lowerText.includes('rs.') ||
            lowerText.includes('rupees only') ||
            lowerText.includes('billno');
        const hasPharmacyKeywords = lowerText.includes('pharmacy') ||
            lowerText.includes('pharmacist') ||
            lowerText.includes('batch no') ||
            lowerText.includes('exp dt') ||
            lowerText.includes('exp.dt') ||
            lowerText.includes('tablet') ||
            lowerText.includes('capsule') ||
            lowerText.includes('chemist') ||
            lowerText.includes('druggist') ||
            lowerText.includes('tab.') ||
            lowerText.includes('cap.');
        const hasHospitalOrOpKeywords = lowerText.includes('consultant') ||
            lowerText.includes('op bill') ||
            lowerText.includes('op receipt') ||
            lowerText.includes('hospital charges') ||
            lowerText.includes('service name') ||
            lowerText.includes('consultation fee') ||
            lowerText.includes('registration fee') ||
            lowerText.includes('udayananda') ||
            lowerText.includes('patient name');
        // 2. Detect Clinical Result Patterns (Lab reports with values/units/ranges)
        const hasLabResultMarkers = lowerText.includes('reference range') ||
            lowerText.includes('reference interval') ||
            lowerText.includes('observed value') ||
            lowerText.includes('biological reference') ||
            lowerText.includes('normal range') ||
            lowerText.includes('flag') ||
            lowerText.includes('result value') ||
            lowerText.includes('g/dl') ||
            lowerText.includes('mg/dl') ||
            lowerText.includes('u/l') ||
            lowerText.includes('/cumm') ||
            lowerText.includes('/ul') ||
            lowerText.includes('fl') ||
            lowerText.includes('pg');
        // 3. Classification Logic
        if (hasBillingKeywords) {
            if (hasPharmacyKeywords) {
                docType = 'PHARMACY_INVOICE';
                classConf = 0.95;
            }
            else if (hasHospitalOrOpKeywords || lowerText.includes('hospital') || lowerText.includes('clinic')) {
                docType = 'OP_BILL_RECEIPT';
                classConf = 0.95;
            }
            else {
                docType = 'OP_BILL_RECEIPT';
                classConf = 0.80;
            }
        }
        else if (hasLabResultMarkers && !lowerText.includes('medication') && !lowerText.includes('tab ')) {
            docType = 'LAB_REPORT';
            classConf = 0.95;
        }
        else if (lowerText.includes('prescription') || lowerText.includes('rx') || lowerText.includes('take 1 tab') || lowerText.includes('once daily')) {
            docType = 'PRESCRIPTION';
            classConf = 0.90;
        }
        else if (lowerText.includes('discharge summary') || lowerText.includes('discharge card') || lowerText.includes('date of admission') || lowerText.includes('date of discharge')) {
            docType = 'DISCHARGE_SUMMARY';
            classConf = 0.95;
        }
        else if (lowerText.includes('medical certificate') || lowerText.includes('fit to work') || lowerText.includes('sickness certificate')) {
            docType = 'MEDICAL_CERTIFICATE';
            classConf = 0.95;
        }
        else if (lowerText.includes('scan') || lowerText.includes('imaging') || lowerText.includes('x-ray') || lowerText.includes('mri') || lowerText.includes('ct scan') || lowerText.includes('ultrasound')) {
            docType = 'IMAGING_REPORT';
            classConf = 0.95;
        }
        else if (lowerText.includes('vaccination') || lowerText.includes('immunization') || lowerText.includes('vaccine')) {
            docType = 'VACCINATION_RECORD';
            classConf = 0.90;
        }
        // Override with user-selected category if provided
        if (category && category !== 'Auto Detect') {
            const catUpper = category.toUpperCase().replace(/\s+/g, '_');
            const supported = ['PRESCRIPTION', 'LAB_REPORT', 'DISCHARGE_SUMMARY', 'OP_BILL_RECEIPT', 'PHARMACY_INVOICE', 'IMAGING_REPORT', 'DIAGNOSTIC_ORDER', 'PROCEDURE_REPORT', 'MEDICAL_CERTIFICATE', 'CLINICAL_NOTE', 'OTHER_MEDICAL_DOCUMENT'];
            if (supported.includes(catUpper)) {
                docType = catUpper;
            }
            else if (category === 'Prescription')
                docType = 'PRESCRIPTION';
            else if (category === 'Lab Report')
                docType = 'LAB_REPORT';
            else if (category === 'Discharge Summary')
                docType = 'DISCHARGE_SUMMARY';
            else if (category === 'Imaging Report')
                docType = 'IMAGING_REPORT';
            else if (category === 'Medical Certificate')
                docType = 'MEDICAL_CERTIFICATE';
            result.classificationConfidence = 1.0;
            result.classificationSource = 'user_selection';
        }
        else {
            result.classificationConfidence = classConf;
            result.classificationSource = classSrc;
        }
        result.documentType = docType;
        const titleVal = docType.charAt(0) + docType.slice(1).toLowerCase().replace(/_/g, ' ');
        result.documentTitle = { value: (category && category !== 'Auto Detect') ? category : titleVal, confidence: result.classificationConfidence, sourceText: docType, page: 1 };
        // Set fallback title if needed
        for (const line of lines) {
            if (line.toLowerCase().startsWith('report title:') || line.toLowerCase().startsWith('title:')) {
                const parts = line.split(':');
                if (parts[1]) {
                    result.documentTitle = { value: parts[1].trim(), confidence: 0.98, sourceText: line, page: 1 };
                    break;
                }
            }
        }
        // 1. Regex for Date Detection (matches YYYY-MM-DD, DD/MM/YYYY, etc.)
        const dateRegex = /\b(\d{1,4})[-/.](\d{1,2}|[a-zA-Z]{3,9})[-/.](\d{1,4})\b/g;
        const datesFound = [];
        const datesRaw = [];
        let match;
        while ((match = dateRegex.exec(ocrText)) !== null) {
            datesFound.push(match[0]);
            datesRaw.push(match[0]);
        }
        if (datesFound.length > 0) {
            result.documentDate = { value: datesFound[0], confidence: 0.95, sourceText: datesFound[0], page: 1 };
        }
        // 2. Patient Profile Rules
        for (const line of lines) {
            const lineLower = line.toLowerCase();
            // Patient Name
            if (lineLower.startsWith('patient name:') || lineLower.startsWith('name:')) {
                const val = (_a = line.split(':')[1]) === null || _a === void 0 ? void 0 : _a.trim();
                if (val) {
                    const v = { value: val, confidence: 0.95, sourceText: line, page: 1 };
                    result.patientNameOnDocument = v;
                    result.patientDetails.patientNameOnDocument = v;
                }
            }
            // Patient Age
            if (lineLower.includes('age:') || lineLower.startsWith('age ')) {
                const parts = line.split(/age:/i);
                const val = ((_b = parts[1]) === null || _b === void 0 ? void 0 : _b.trim()) || line.replace(/age/i, '').trim();
                const firstNum = val.match(/\d+/);
                if (firstNum) {
                    const v = { value: firstNum[0], confidence: 0.90, sourceText: line, page: 1 };
                    result.patientAgeOnDocument = v;
                    result.patientDetails.age = v;
                }
            }
            // Gender
            if (lineLower.includes('gender:') || lineLower.includes('sex:')) {
                const val = (_c = line.split(/gender:|sex:/i)[1]) === null || _c === void 0 ? void 0 : _c.trim();
                if (val) {
                    const genderVal = val.toLowerCase().startsWith('m') ? 'Male' : val.toLowerCase().startsWith('f') ? 'Female' : val;
                    result.patientDetails.gender = { value: genderVal, confidence: 0.90, sourceText: line, page: 1 };
                }
            }
            // Patient ID or MRN
            if (lineLower.includes('mrn:') || lineLower.includes('patient id:') || lineLower.includes('mrn number:')) {
                const val = (_d = line.split(/mrn:|patient id:/i)[1]) === null || _d === void 0 ? void 0 : _d.trim();
                if (val) {
                    result.patientDetails.patientIdOrMrn = { value: val, confidence: 0.95, sourceText: line, page: 1 };
                }
            }
        }
        // 3. Encounter & Hospital Rules
        for (const line of lines) {
            const lineLower = line.toLowerCase();
            // Hospital / Clinic
            if (lineLower.includes('hospital') || lineLower.includes('clinic') || lineLower.includes('medical center') || lineLower.includes('health city')) {
                // Skip lines containing dates or other entities unless they are clearly hospital name headers
                if (!lineLower.includes('date:') && line.length < 50) {
                    const v = { value: line, confidence: 0.85, sourceText: line, page: 1 };
                    result.hospitalName = v;
                    result.encounterDetails.hospitalName = v;
                }
            }
            // Doctor Name — extract only the name portion, stopping at comma/newline/digits/keyword boundary
            if (lineLower.includes('dr.') || lineLower.includes('doctor:') || lineLower.includes('consultant:') || lineLower.includes('ref by')) {
                // First try labeled patterns: "Ref By: Dr. Name" or "Doctor: Name"
                // Allowing plus (+) and equal (=) signs in separator group, and optional space after dr.
                const labeledMatch = line.match(/(?:ref(?:erred)?\s*by|doctor|consultant)\s*[:\-+=\s]*\s*(?:dr\.?\s*)?(\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})\b/i);
                if (labeledMatch && labeledMatch[1] && labeledMatch[1].trim().length > 2) {
                    const docVal = `Dr. ${labeledMatch[1].trim().replace(/^dr\.?\s+/i, '')}`;
                    const v = { value: docVal, confidence: 0.90, sourceText: line.substring(0, 120), page: 1 };
                    result.doctorName = v;
                    result.encounterDetails.doctorName = v;
                }
                else {
                    // Fallback: capture up to 4 words after Dr./doctor keyword, allowing 0 spaces after dr.
                    const drMatch = line.match(/\bdr\.?\s*([A-Z][a-zA-Z]+(?:\s+[A-Z]?\.?[a-zA-Z]+){0,3})/i);
                    if (drMatch && drMatch[1] && drMatch[1].trim().length > 2) {
                        const docVal = `Dr. ${drMatch[1].trim()}`;
                        const v = { value: docVal, confidence: 0.85, sourceText: line.substring(0, 120), page: 1 };
                        result.doctorName = v;
                        result.encounterDetails.doctorName = v;
                    }
                }
            }
        }
        // 4. Vitals Detection
        for (const line of lines) {
            const lineLower = line.toLowerCase();
            // BP: e.g. 120/80 mmHg
            if (lineLower.includes('bp:') || lineLower.includes('blood pressure')) {
                const bpMatch = line.match(/\b\d{2,3}\/\d{2,3}\b/);
                if (bpMatch) {
                    result.examination.vitals.bp = { value: `${bpMatch[0]} mmHg`, confidence: 0.95, sourceText: line, page: 1 };
                }
            }
            // HR: pulse
            if (lineLower.includes('hr:') || lineLower.includes('pulse') || lineLower.includes('heart rate')) {
                const hrMatch = line.match(/\b\d{2,3}\b/);
                if (hrMatch) {
                    result.examination.vitals.hr = { value: `${hrMatch[0]} bpm`, confidence: 0.90, sourceText: line, page: 1 };
                }
            }
            // Temp
            if (lineLower.includes('temp') || lineLower.includes('temperature')) {
                const tempMatch = line.match(/\b\d{2,3}(?:\.\d+)?\b/);
                if (tempMatch) {
                    const unit = lineLower.includes('c') ? 'C' : 'F';
                    result.examination.vitals.temp = { value: `${tempMatch[0]} °${unit}`, confidence: 0.90, sourceText: line, page: 1 };
                }
            }
            // RR
            if (lineLower.includes('rr:') || lineLower.includes('respiratory rate')) {
                const rrMatch = line.match(/\b\d{1,2}\b/);
                if (rrMatch) {
                    result.examination.vitals.rr = { value: `${rrMatch[0]} /min`, confidence: 0.90, sourceText: line, page: 1 };
                }
            }
            // SpO2
            if (lineLower.includes('spo2') || lineLower.includes('oxygen saturation')) {
                const spo2Match = line.match(/\b\d{2,3}\b/);
                if (spo2Match) {
                    result.examination.vitals.spo2 = { value: `${spo2Match[0]}%`, confidence: 0.95, sourceText: line, page: 1 };
                }
            }
        }
        // 5. Diagnoses extraction via rules
        const matchedDiagnosisPhrases = ['diagnosis:', 'diagnoses:', 'impression:', 'final diagnosis:'];
        for (const line of lines) {
            const lineLower = line.toLowerCase();
            for (const phrase of matchedDiagnosisPhrases) {
                if (lineLower.startsWith(phrase)) {
                    const diag = line.substring(phrase.length).trim();
                    if (diag && diag.length > 2) {
                        result.diagnoses.push({
                            name: diag,
                            confidence: 0.85,
                            sourceText: line,
                            page: 1
                        });
                        // Populate clinical info diagnoses
                        result.clinicalInformation.finalDiagnoses.push({
                            value: diag,
                            confidence: 0.85,
                            sourceText: line,
                            page: 1
                        });
                    }
                }
            }
        }
        // 6. Medications extraction via rules
        // Match line structures like "Tab. Metformin 500mg" or "Pan 40" or common dosage instructions
        const medKeywords = ['tab', 'capsule', 'syp', 'inj', 'ointment', 'mg', 'mcg', 'ml'];
        const activeMedications = [];
        for (const line of lines) {
            // Clean medication/Rx prefixes from the line
            const cleanLine = line.replace(/^(?:medication|medications|rx|treatment|rx:)\s*[:\-]?\s*/i, '').trim();
            const cleanLineLower = cleanLine.toLowerCase();
            let isMedicationLine = false;
            // Match keywords in words
            const words = cleanLineLower.split(/\s+/);
            for (const keyword of medKeywords) {
                if (words.includes(keyword) || words.some(w => w.startsWith(keyword))) {
                    isMedicationLine = true;
                    break;
                }
            }
            // Additional structural match: contains numbers + medication indicators
            if (isMedicationLine && cleanLine.length < 100) {
                const strengthMatch = cleanLine.match(/\b\d+\s*(?:mg|mcg|ml|g)\b/i);
                const strength = strengthMatch ? strengthMatch[0] : null;
                // Split name (everything before the strength or first number)
                let name = cleanLine;
                if (strength) {
                    name = cleanLine.split(new RegExp(strength, 'i'))[0].trim();
                }
                else {
                    // If no strength, take first 3-4 words
                    name = cleanLine.split(/\s+/).slice(0, 3).join(' ');
                }
                name = name.replace(/^(?:tab|capsule|syp|inj|tablet|tab\.|cap|cap\.)\s+/i, '').trim();
                if (name.length > 2) {
                    activeMedications.push({
                        medicineName: name,
                        strength: strength,
                        confidence: 0.80,
                        sourceText: line,
                        page: 1
                    });
                }
            }
        }
        result.medications = activeMedications;
        // 7. Lab Results extraction via rules
        // Match structure like: Haemoglobin 15.6 gm%
        const literalUnits = [
            'gm%', 'gms%', 'g/dl', 'g/dL', 'mg/dl', 'mg/dL', 'u/l', 'U/L', 'iu/l', 'IU/L',
            'fl', 'pg', '/cumm', '/ul', '/uL', 'vol%', 'millions/cumm', 'Millions/cumm', 'MILLIONS/CUMM', '%'
        ];
        // Support corrupted OCR variations like x10%3/uL, x10^3/uL, ma/dl, mo/di, W/L
        const patternUnits = [
            'x10[\\^%]?\\d*/uL', 'x10[\\^%]?\\d*/ul',
            '10\\^[\\^%]?\\d*/uL', '10\\^[\\^%]?\\d*/ul',
            'm[a-z0-9]/d[a-z0-9]', '[uUwW]/[lL]'
        ];
        const escapedLiterals = literalUnits.map(u => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        // Multiplier patterns first: prevents x10^3/uL being parsed as bare /uL (P0 magnitude drop fix)
        const allUnitPatterns = [...patternUnits, ...escapedLiterals].join('|');
        const activeLabs = [];
        const seenLabNames = new Set();
        // We want to match: [Test Name] [optional noise/symbols] [Numeric Value] [Unit]
        // We use lookahead (?![a-zA-Z0-9]) instead of \b so that units ending in % are matched correctly
        const globalLabRegex = new RegExp(`([^\\n\\|;\\(\\)]+?)\\s*[|\\*\\-\\–\\—\\s]*(\\d+(?:[.,]\\d+)?)\\s*[.\\-\\s]*(${allUnitPatterns})(?![a-zA-Z0-9])`, 'gi');
        const isCleanUnit = (unitStr) => {
            const clean = unitStr.trim();
            const standardLiterals = [
                'gm%', 'gms%', 'g/dl', 'g/dL', 'mg/dl', 'mg/dL', 'u/l', 'U/L', 'iu/l', 'IU/L',
                'fl', 'pg', '/cumm', '/ul', '/uL', 'vol%', 'millions/cumm', '%'
            ];
            if (standardLiterals.includes(clean))
                return true;
            const cleanMultiplierRegex = /^(?:x|10\^)?10\^\d+\/(?:uL|ul|cumm)$/i;
            if (cleanMultiplierRegex.test(clean))
                return true;
            return false;
        };
        let labMatch;
        while ((labMatch = globalLabRegex.exec(ocrText)) !== null) {
            let testName = labMatch[1].trim();
            const value = labMatch[2].replace(',', '.');
            // Clean up test name
            testName = testName.replace(/^[*\-–—+\s:\/\(\)]+/, '').trim();
            testName = testName.replace(/[:\-\s*+\/\(\)]+$/, '').trim();
            // If the name is too long, it might have captured preceding text on the same line.
            if (testName.length > 60) {
                const words = testName.split(/\s+/);
                testName = words.slice(-4).join(' ').trim();
            }
            // Find the matched unit in this match
            let matchedUnit = labMatch[3] || 'gm%';
            const normalizedName = testName.toLowerCase().replace(/\s+/g, ' ');
            if (testName.length >= 3 && !seenLabNames.has(normalizedName)) {
                seenLabNames.add(normalizedName);
                const clean = isCleanUnit(matchedUnit);
                const normVal = clean ? value : null;
                const normUnit = clean ? matchedUnit : null;
                const normStatus = clean ? 'normalized' : 'needs_review';
                activeLabs.push({
                    testName: testName,
                    value: value,
                    unit: matchedUnit,
                    referenceRange: null,
                    confidence: 0.85,
                    sourceText: labMatch[0].substring(0, 200),
                    page: 1,
                    rawValue: value,
                    rawUnit: matchedUnit,
                    normalizedValue: normVal,
                    normalizedUnit: normUnit,
                    normalizationStatus: normStatus
                });
            }
        }
        result.labResults = activeLabs;
        // Collect all sourceText values currently mapped
        const sourceTexts = new Set();
        const recurse = (val) => {
            if (!val)
                return;
            if (typeof val === 'string')
                return;
            if (typeof val === 'object') {
                for (const [k, v] of Object.entries(val)) {
                    if ((k === 'sourceText' || k === 'source_text') && typeof v === 'string' && v.trim()) {
                        sourceTexts.add(v.trim().toLowerCase());
                    }
                    else {
                        recurse(v);
                    }
                }
            }
        };
        recurse(result);
        // 8. Capture everything else under unmappedDocumentedInformation
        const unmappedParagraphs = [];
        for (const paragraph of paragraphs) {
            const paraLower = paragraph.toLowerCase();
            let isMapped = false;
            for (const srcText of sourceTexts) {
                if (srcText.includes(paraLower) || paraLower.includes(srcText)) {
                    isMapped = true;
                    break;
                }
            }
            if (!isMapped) {
                unmappedParagraphs.push(paragraph);
            }
        }
        result.unmappedDocumentedInformation = unmappedParagraphs.map((text, idx) => ({
            text: text,
            sectionHeading: 'Unmapped Content',
            page: 1,
            sourceText: text,
            confidence: 0.70 // Lower confidence for unmapped text
        }));
        // Compute coverage statistics
        result.coverageMetrics = {
            totalReadableTextBlocks: paragraphs.length,
            mappedStructuredBlocks: paragraphs.length - unmappedParagraphs.length,
            unmappedBlocks: unmappedParagraphs.length,
            unreadableBlocks: 0
        };
        return medical_extraction_provider_1.MedicalExtractionSchema.parse(result);
    }
}
exports.LocalExtractionProvider = LocalExtractionProvider;

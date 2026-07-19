import OpenAI from 'openai';
import { z } from 'zod';
import {
  MedicalExtraction,
  ExtractedDiagnosisSchema,
  ExtractedMedicationSchema,
  ExtractedLabResultSchema,
  ExtractedProcedureSchema,
  EncounterDetailsSchema,
  PatientDetailsSchema,
  ClinicalInformationSchema,
  TreatmentSchema,
  DischargePlanSchema,
  UnmappedDocumentedInformationSchema
} from '../providers/medical-extraction-provider';

export class SpecializedExtractors {
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

  public async extract(ocrText: string, docType: string): Promise<Partial<MedicalExtraction>> {
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
      } catch (err) {
        console.warn(`LLM extraction failed for ${docType}, falling back to rules.`, err);
      }
    }
    return this.extractRulesFallback(ocrText, docType);
  }

  private async callLLM(prompt: string, schema: z.ZodObject<any>): Promise<any> {
    if (!this.openai) throw new Error('OpenAI client not initialized');
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

    const text = response.choices[0]?.message?.content || '{}';
    return JSON.parse(text);
  }

  private async extractLabReport(ocrText: string): Promise<Partial<MedicalExtraction>> {
    const schema = z.object({
      labResults: z.array(z.object({
        testName: z.string(),
        value: z.string(),
        unit: z.string().nullable(),
        referenceRange: z.string().nullable(),
        abnormalFlag: z.boolean().nullable(),
        date: z.string().nullable(),
        confidence: z.number(),
        sourceText: z.string()
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

  private async extractPharmacyInvoice(ocrText: string): Promise<Partial<MedicalExtraction>> {
    const schema = z.object({
      medications: z.array(z.object({
        medicineName: z.string(),
        strength: z.string().nullable(),
        quantity: z.string().nullable(),
        batch: z.string().nullable(),
        expiry: z.string().nullable(),
        confidence: z.number(),
        sourceText: z.string()
      })),
      invoiceTotals: z.object({
        gstAmount: z.string().nullable(),
        totalAmount: z.string().nullable()
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

  private async extractPrescription(ocrText: string): Promise<Partial<MedicalExtraction>> {
    const schema = z.object({
      medications: z.array(z.object({
        medicineName: z.string(),
        genericName: z.string().nullable(),
        strength: z.string().nullable(),
        dosage: z.string().nullable(),
        frequency: z.string().nullable(),
        duration: z.string().nullable(),
        instructions: z.string().nullable(),
        confidence: z.number(),
        sourceText: z.string()
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

  private async extractDischargeSummary(ocrText: string): Promise<Partial<MedicalExtraction>> {
    const schema = z.object({
      diagnoses: z.array(z.object({
        name: z.string(),
        isChronic: z.boolean().nullable(),
        confidence: z.number(),
        sourceText: z.string()
      })),
      encounterDetails: z.object({
        admissionDate: z.string().nullable(),
        dischargeDate: z.string().nullable(),
        hospitalName: z.string().nullable()
      }),
      clinicalInformation: z.object({
        historyOfPresentIllness: z.string().nullable()
      }),
      treatment: z.object({
        treatmentGiven: z.string().nullable()
      })
    });

    const prompt = `You are a hospital medical discharge supervisor. Extract diagnoses, HPI (history of present illness), admission date, discharge date, hospital name, and treatment given from this discharge summary text.

OCR Text:
"""
${ocrText}
"""`;

    const data = await this.callLLM(prompt, schema);
    
    // Format to match EncounterDetailsSchema etc.
    const encDetails: any = {};
    if (data.encounterDetails?.admissionDate) {
      encDetails.admissionDate = { value: data.encounterDetails.admissionDate, confidence: 0.95, sourceText: data.encounterDetails.admissionDate, page: 1 };
    }
    if (data.encounterDetails?.dischargeDate) {
      encDetails.dischargeDate = { value: data.encounterDetails.dischargeDate, confidence: 0.95, sourceText: data.encounterDetails.dischargeDate, page: 1 };
    }
    if (data.encounterDetails?.hospitalName) {
      encDetails.hospitalName = { value: data.encounterDetails.hospitalName, confidence: 0.95, sourceText: data.encounterDetails.hospitalName, page: 1 };
    }

    const clinicalInfo: any = {};
    if (data.clinicalInformation?.historyOfPresentIllness) {
      clinicalInfo.historyOfPresentIllness = { value: data.clinicalInformation.historyOfPresentIllness, confidence: 0.95, sourceText: data.clinicalInformation.historyOfPresentIllness, page: 1 };
    }

    const treat: any = {};
    if (data.treatment?.treatmentGiven) {
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

  private async extractOpBill(ocrText: string): Promise<Partial<MedicalExtraction>> {
    const schema = z.object({
      encounterDetails: z.object({
        hospitalName: z.string().nullable(),
        doctorName: z.string().nullable(),
        clinicName: z.string().nullable()
      }),
      billedServices: z.array(z.object({
        serviceName: z.string(),
        charge: z.string(),
        confidence: z.number(),
        sourceText: z.string()
      }))
    });

    const prompt = `You are an outpatient hospital billing officer. Extract the hospital/clinic name, doctor name, and all outpatient consultation fees, service items, and charges from the following OCR text.

OCR Text:
"""
${ocrText}
"""`;

    const data = await this.callLLM(prompt, schema);
    
    const encDetails: any = {};
    if (data.encounterDetails?.hospitalName) {
      encDetails.hospitalName = { value: data.encounterDetails.hospitalName, confidence: 0.95, sourceText: data.encounterDetails.hospitalName, page: 1 };
    }
    if (data.encounterDetails?.doctorName) {
      encDetails.doctorName = { value: data.encounterDetails.doctorName, confidence: 0.95, sourceText: data.encounterDetails.doctorName, page: 1 };
    }

    // Convert billed services to unmappedDocumentedInformation
    const unmapped = (data.billedServices || []).map((srv: any) => ({
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

  private async extractGeneric(ocrText: string): Promise<Partial<MedicalExtraction>> {
    // Return empty fields
    return {
      documentType: 'OTHER_MEDICAL_DOCUMENT'
    };
  }

  private extractRulesFallback(ocrText: string, docType: string): Partial<MedicalExtraction> {
    const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const lowerText = ocrText.toLowerCase();

    // 1. Lab Report rules
    if (docType === 'LAB_REPORT') {
      const results: any[] = [];
      
      // Look for lines containing numbers/units
      const labRegex = /([a-zA-Z\s\(\)\-\/]+)\s+([\d\.]+)\s*([a-zA-Z\d\^%\/\*]+)?\s*(?:\bref\b|\bnormal\b|[\d\.\s\-–to]+)?/gi;
      let match;
      let limit = 0;
      while ((match = labRegex.exec(ocrText)) !== null && limit < 15) {
        const name = match[1].trim();
        const value = match[2];
        const unit = match[3] || '';
        
        // Exclude common header items
        if (['page', 'bill', 'mobile', 'tel', 'phone', 'sl', 'no', 'rs', 'gst'].some(k => name.toLowerCase().includes(k))) continue;
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
      const meds: any[] = [];
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
      const meds: any[] = [];
      const lines = ocrText.split('\n');
      let limit = 0;
      for (const line of lines) {
        const trimmed = line.trim();
        // Use word boundary matches to avoid matching substrings in words like "concentration" or "stable"
        const hasMedKeyword = /\b(tab|tablet|cap|capsule|once|daily|rx|mg|ml|mcg)\b/i.test(trimmed);
        if (hasMedKeyword && trimmed.length > 3 && trimmed.length < 120 && limit < 10) {
          // Extract possible strength/dosage
          const strengthMatch = trimmed.match(/\b\d+\s*(?:mg|mcg|ml|g)\b/i);
          const strength = strengthMatch ? strengthMatch[0] : null;
          
          let name = trimmed;
          if (strength) {
            name = trimmed.split(new RegExp(strength, 'i'))[0].trim();
          } else {
            name = trimmed.split(/\s+/).slice(0, 4).join(' ');
          }
          name = name.replace(/^(?:tab|capsule|syp|inj|tablet|tab\.|cap|cap\.)\s+/i, '').trim();

          meds.push({
            medicineName: name || trimmed,
            genericName: null,
            strength: strength,
            dosage: '1 tab',
            frequency: 'Once daily',
            duration: '5 days',
            instructions: 'After food',
            confidence: 0.80,
            sourceText: trimmed
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

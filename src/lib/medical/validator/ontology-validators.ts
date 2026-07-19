import { MedicalExtraction } from '../../providers/medical-extraction-provider';
import { getSubtypeConfig } from '../ontology/registry';

export interface ValidationError {
  field: string;
  error: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  validatedExtraction: MedicalExtraction;
}

export class OntologyValidators {
  
  public validate(extraction: MedicalExtraction, subtype: string): ValidationResult {
    const errors: ValidationError[] = [];
    const validated = { ...extraction };
    const config = getSubtypeConfig(subtype);

    // 1. Mandatory ontology fields validation
    const required = config.requiredEntities || [];
    
    if (subtype === 'CBC') {
      const results = validated.labResults || [];
      const hasHb = results.some(r => /haemoglobin|hemoglobin|hb/i.test(r.testName));
      const hasWbc = results.some(r => /wbc|white blood/i.test(r.testName));
      const hasRbc = results.some(r => /rbc|red blood/i.test(r.testName));
      const hasPlt = results.some(r => /platelet/i.test(r.testName));

      if (!hasHb) errors.push({ field: 'labResults.hemoglobin', error: 'Missing mandatory CBC marker: Hemoglobin', severity: 'error' });
      if (!hasWbc) errors.push({ field: 'labResults.wbc', error: 'Missing mandatory CBC marker: WBC count', severity: 'error' });
      if (!hasPlt) errors.push({ field: 'labResults.platelets', error: 'Missing mandatory CBC marker: Platelet count', severity: 'error' });
    }

    else if (subtype === 'Prescription' || subtype === 'PRESCRIPTION') {
      const meds = validated.medications || [];
      if (meds.length === 0) {
        errors.push({ field: 'medications', error: 'Prescription must contain at least one medication entry', severity: 'error' });
      }

      for (const med of meds) {
        if (!med.medicineName || med.medicineName.trim().length < 3) {
          errors.push({ field: `medications.${med.medicineName || 'item'}`, error: 'Invalid medicine name', severity: 'error' });
        }
        // Protect against entire document text block mapped as a medication name
        if (med.medicineName && med.medicineName.length > 100) {
          errors.push({ 
            field: `medications.${med.medicineName.substring(0, 20)}`, 
            error: 'Anomaly detected: Medication name is excessively long, likely containing corrupted OCR text block.', 
            severity: 'error' 
          });
          // Clear invalid medication name to prevent corrupt persistence
          med.medicineName = 'Invalid Medicine';
        }
      }
    }

    else if (subtype === 'Discharge Summary') {
      if (!validated.patientNameOnDocument?.value && !validated.patientDetails?.patientNameOnDocument?.value) {
        errors.push({ field: 'patientName', error: 'Discharge Summary must state the patient name', severity: 'warning' });
      }
      if (!validated.encounterDetails?.admissionDate?.value || !validated.encounterDetails?.dischargeDate?.value) {
        errors.push({ field: 'dates', error: 'Discharge Summary is missing admission or discharge dates', severity: 'warning' });
      }
    }

    else if (subtype === 'Lipid Profile') {
      const results = validated.labResults || [];
      const hasChol = results.some(r => /cholesterol/i.test(r.testName));
      const hasTrig = results.some(r => /triglycerides|trig/i.test(r.testName));
      if (!hasChol) errors.push({ field: 'labResults.cholesterol', error: 'Missing mandatory Lipid Profile marker: Cholesterol', severity: 'error' });
      if (!hasTrig) errors.push({ field: 'labResults.triglycerides', error: 'Missing mandatory Lipid Profile marker: Triglycerides', severity: 'error' });
    }

    else if (subtype === 'HbA1c') {
      const results = validated.labResults || [];
      const hba1cResult = results.find(r => /hba1c/i.test(r.testName));
      if (!hba1cResult) {
        errors.push({ field: 'labResults.hba1c', error: 'Missing mandatory HbA1c result', severity: 'error' });
      } else {
        const val = parseFloat(hba1cResult.value);
        if (isNaN(val) || val < 2.0 || val > 25.0) {
          errors.push({ field: 'labResults.hba1c.value', error: `Unreasonable HbA1c value: ${hba1cResult.value}%`, severity: 'error' });
        }
      }
    }

    // 2. Generic Age and Date validations
    const ageVal = validated.patientDetails?.age?.value || validated.patientAgeOnDocument?.value;
    if (ageVal) {
      const numericAge = parseInt(ageVal.replace(/\D/g, ''), 10);
      if (!isNaN(numericAge) && (numericAge < 0 || numericAge > 120)) {
        errors.push({
          field: 'age',
          error: `Unreasonable patient age: ${numericAge}`,
          severity: 'warning'
        });
      }
    }

    const docDateVal = validated.documentDate?.value;
    if (docDateVal) {
      const parsedDate = Date.parse(docDateVal);
      if (isNaN(parsedDate)) {
        errors.push({ field: 'documentDate', error: `Invalid date format: "${docDateVal}"`, severity: 'error' });
      } else {
        const d = new Date(parsedDate);
        if (d > new Date()) {
          errors.push({ field: 'documentDate', error: `Future date detected: "${docDateVal}"`, severity: 'error' });
        }
      }
    }

    // If there are any high severity errors, it is invalid
    const isValid = !errors.some(e => e.severity === 'error');

    return {
      isValid,
      errors,
      validatedExtraction: validated
    };
  }
}

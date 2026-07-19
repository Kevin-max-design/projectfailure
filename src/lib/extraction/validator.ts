import { MedicalExtraction } from '../providers/medical-extraction-provider';

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

export class DeterministicValidator {
  public validate(extraction: MedicalExtraction, patientProfile: any): ValidationResult {
    const errors: ValidationError[] = [];
    const validated = { ...extraction };

    // 1. Patient Name Consistency Check
    const docName = extraction.patientDetails?.patientNameOnDocument?.value || extraction.patientNameOnDocument?.value;
    const profileName = patientProfile?.full_name;
    if (docName && profileName) {
      const cleanName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const dClean = cleanName(docName);
      const pClean = cleanName(profileName);
      if (dClean && pClean && !dClean.includes(pClean) && !pClean.includes(dClean)) {
        errors.push({
          field: 'patientName',
          error: `Patient name mismatch: Document name "${docName}" does not match profile name "${profileName}"`,
          severity: 'warning'
        });
      }
    }

    // 2. Date Validation & Parsing
    const docDateVal = extraction.documentDate?.value;
    if (docDateVal) {
      const parsedDate = Date.parse(docDateVal);
      if (isNaN(parsedDate)) {
        errors.push({
          field: 'documentDate',
          error: `Invalid date format: "${docDateVal}"`,
          severity: 'error'
        });
      } else {
        const d = new Date(parsedDate);
        const now = new Date();
        if (d > now) {
          errors.push({
            field: 'documentDate',
            error: `Future date detected: "${docDateVal}"`,
            severity: 'error'
          });
        }
      }
    }

    // 3. Age Validation
    const ageVal = extraction.patientDetails?.age?.value || extraction.patientAgeOnDocument?.value;
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

    // 4. Reference Range and Value Validation for Labs (No silent repair or simplification)
    if (validated.labResults && validated.labResults.length > 0) {
      validated.labResults = validated.labResults.map((lab: any) => {
        const rawValue = lab.value;
        const rawUnit = lab.unit || '';
        
        let normalizedValue: string | null = rawValue;
        let normalizedUnit: string | null = rawUnit;
        let normalizationStatus = 'normalized';

        const cleanUnit = rawUnit.toLowerCase().replace(/\s/g, '');
        const testName = (lab.testName || '').toLowerCase().trim();

        // Specific test checks (WBC, RBC, Platelets)
        if (['wbc', 'white blood cells', 'wbc count', 'rbc', 'red blood cells', 'rbc count', 'platelets', 'platelet count'].includes(testName)) {
          // If unit contains corrupted chars or percentage characters like '%', it is corrupted/uncertain
          const isCorrupted = cleanUnit.includes('%') || cleanUnit.includes('*') || /[^a-z0-9\/\^]/i.test(cleanUnit);
          
          // Check for unsafe normalization: if unit is just "/ul" or "/cumm" without multipliers for a decimal value like 15.74
          const isDecimal = /^\d+\.\d+$/.test(rawValue.trim());
          const hasNoMultiplier = (cleanUnit === '/ul' || cleanUnit === '/cumm' || cleanUnit === 'ul' || cleanUnit === 'cumm');

          if (isCorrupted || (isDecimal && hasNoMultiplier)) {
            normalizedValue = null;
            normalizedUnit = null;
            normalizationStatus = 'needs_review';
            errors.push({
              field: `labResults.${lab.testName || 'test'}`,
              error: `Uncertain/corrupted medical unit detected for ${lab.testName}: "${rawUnit}"`,
              severity: 'warning'
            });
          } else {
            // Safe, deterministic conversion/normalization
            if (cleanUnit.includes('10^3') || cleanUnit.includes('x10^3') || cleanUnit.includes('10-3') || cleanUnit.includes('10*3')) {
              normalizedUnit = '10^3/uL';
            } else if (cleanUnit.includes('10^6') || cleanUnit.includes('x10^6') || cleanUnit.includes('10-6') || cleanUnit.includes('10*6')) {
              normalizedUnit = '10^6/uL';
            } else if (cleanUnit.includes('millions')) {
              normalizedUnit = '10^6/uL';
            }
          }
        }

        // Numeric Sanity check
        const numVal = parseFloat(rawValue.replace(/[^\d\.]/g, ''));
        if (isNaN(numVal)) {
          errors.push({
            field: `labResults.${lab.testName || 'test'}`,
            error: `Non-numeric result value for lab test ${lab.testName}: "${rawValue}"`,
            severity: 'warning'
          });
        }

        return {
          ...lab,
          rawValue,
          rawUnit,
          normalizedValue,
          normalizedUnit,
          normalizationStatus,
          unit: normalizedUnit // Fallback for backward compatibility
        };
      });
    }

    // 5. Medication Dosage format validation
    if (validated.medications && validated.medications.length > 0) {
      validated.medications.forEach((med: any) => {
        const dosage = med.dosage || '';
        if (dosage && !/\d/.test(dosage) && !['once', 'twice', 'daily', 'tab', 'cap', 'mg', 'ml'].some(k => dosage.toLowerCase().includes(k))) {
          errors.push({
            field: `medications.${med.medicineName}`,
            error: `Ambiguous medication dosage format: "${dosage}"`,
            severity: 'warning'
          });
        }
      });
    }

    // 6. Required Fields validation
    if (!validated.documentType || validated.documentType === 'Auto Detect') {
      errors.push({
        field: 'documentType',
        error: 'Document type is required and could not be automatically detected.',
        severity: 'error'
      });
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

import { mockDb } from '../supabase/service';

export interface ClinicalSafetyAlert {
  type: 'duplicate' | 'allergy_conflict' | 'drug_interaction';
  severity: 'critical' | 'warning';
  title: string;
  message: string;
  affectedItems: string[];
}

export interface LabTrendPoint {
  date: string;
  value: number;
  unit: string;
  isAbnormal: boolean;
  referenceRange: string | null;
}

export interface LabTrendReport {
  testName: string;
  latestValue: string;
  latestUnit: string;
  trendDirection: 'UPWARD' | 'DOWNWARD' | 'STABLE' | 'NONE';
  points: LabTrendPoint[];
  minVal: number;
  maxVal: number;
}

export class LongitudinalBrainService {
  /**
   * Automatically synchronizes patient profile arrays (known_chronic_conditions, current_long_term_medications, known_allergies)
   * based on verified diagnoses, medications, and allergies in the system.
   */
  static async syncProfileFromRecords(
    patientId: string,
    dbClient: any,
    isDemo: boolean = false
  ): Promise<void> {
    let verifiedDiagnoses: any[] = [];
    let verifiedMedications: any[] = [];
    let rawExtractions: any[] = [];

    if (isDemo) {
      // 1. Fetch from mockDb
      const dxRes = mockDb.query('diagnoses').select().eq('patient_id', patientId);
      verifiedDiagnoses = (dxRes.data || []).filter(
        (d: any) => d.verification_status === 'verified' || d.verification_status === 'corrected'
      );

      const medRes = mockDb.query('medications').select().eq('patient_id', patientId);
      verifiedMedications = (medRes.data || []).filter(
        (m: any) => m.verification_status === 'verified' || m.verification_status === 'corrected'
      );

      const extRes = mockDb.query('raw_extractions').select().eq('patient_id', patientId);
      rawExtractions = extRes.data || [];
    } else {
      // 2. Fetch from Supabase
      const { data: dxData } = await dbClient
        .from('diagnoses')
        .select('*')
        .eq('patient_id', patientId)
        .in('verification_status', ['verified', 'corrected']);
      verifiedDiagnoses = dxData || [];

      const { data: medData } = await dbClient
        .from('medications')
        .select('*')
        .eq('patient_id', patientId)
        .in('verification_status', ['verified', 'corrected']);
      verifiedMedications = medData || [];

      const { data: extData } = await dbClient
        .from('raw_extractions')
        .select('raw_payload')
        .eq('patient_id', patientId);
      rawExtractions = extData || [];
    }

    // --- Process Chronic Conditions ---
    const chronicKeywords = ['chronic', 'diabetes', 'hypertension', 'asthma', 'copd', 'hypothyroid', 'pancreatitis', 'gastritis', 'arthritis', 'gout'];
    const chronicConditions = new Set<string>();
    
    verifiedDiagnoses.forEach((dx: any) => {
      const name = (dx.name || '').trim();
      if (!name) return;
      const lowerName = name.toLowerCase();
      
      const isChronicByField = dx.is_chronic === true || dx.isChronic === true;
      const isChronicByKeyword = chronicKeywords.some(kw => lowerName.includes(kw));
      
      if (isChronicByField || isChronicByKeyword) {
        chronicConditions.add(name);
      }
    });

    // --- Process Long-Term Medications ---
    const maintenanceMeds = ['metformin', 'atorvastatin', 'amlodipine', 'losartan', 'thyroxine', 'levothyroxine', 'pan', 'pantoprazole', 'aspirin', 'clopidogrel', 'insulin', 'glimepiride'];
    const longTermMedications = new Set<string>();

    verifiedMedications.forEach((med: any) => {
      const name = (med.medicine_name || med.medicineName || '').trim();
      if (!name) return;
      const lowerName = name.toLowerCase();
      const duration = (med.duration || '').toLowerCase();

      const isLongTermByDuration = duration.includes('chronic') || duration.includes('lifetime') || duration.includes('ongoing') || duration.includes('monthly') || duration.includes('years') || duration.includes('daily');
      const isLongTermByDrug = maintenanceMeds.some(m => lowerName.includes(m));

      if (isLongTermByDuration || isLongTermByDrug) {
        longTermMedications.add(name);
      }
    });

    // --- Process Allergies (from raw payloads and current patient profile)
    const allergies = new Set<string>();
    
    // Add current profile allergies first
    let currentPatient: any = null;
    if (isDemo) {
      currentPatient = mockDb.query('patients').select().eq('id', patientId).single().data;
    } else {
      const { data } = await dbClient.from('patients').select('*').eq('id', patientId).single();
      currentPatient = data;
    }

    if (currentPatient && currentPatient.known_allergies) {
      currentPatient.known_allergies.forEach((alg: string) => allergies.add(alg.trim()));
    }

    // Extract allergies from all raw extraction payloads
    rawExtractions.forEach((ext: any) => {
      const payload = ext.raw_payload || ext;
      if (payload && Array.isArray(payload.allergies)) {
        payload.allergies.forEach((alg: any) => {
          const val = typeof alg === 'string' ? alg : alg.value;
          if (val && val.trim()) {
            allergies.add(val.trim());
          }
        });
      }
    });

    // --- Save Back to Patient Profile ---
    const updatedFields = {
      known_chronic_conditions: Array.from(chronicConditions),
      current_long_term_medications: Array.from(longTermMedications),
      known_allergies: Array.from(allergies)
    };

    if (isDemo) {
      mockDb.query('patients').update(updatedFields).eq('id', patientId);
    } else {
      await dbClient
        .from('patients')
        .update(updatedFields)
        .eq('id', patientId);
    }
  }

  /**
   * Runs clinical safety checks for active medications against other active medications and known allergies.
   */
  static async runClinicalSafetyCheck(
    patientId: string,
    dbClient: any,
    isDemo: boolean = false
  ): Promise<ClinicalSafetyAlert[]> {
    let patient: any = null;
    let verifiedMedications: any[] = [];

    if (isDemo) {
      patient = mockDb.query('patients').select().eq('id', patientId).single().data;
      const medRes = mockDb.query('medications').select().eq('patient_id', patientId);
      verifiedMedications = (medRes.data || []).filter(
        (m: any) => m.verification_status === 'verified' || m.verification_status === 'corrected'
      );
    } else {
      const { data: pData } = await dbClient.from('patients').select('*').eq('id', patientId).single();
      patient = pData;

      const { data: medData } = await dbClient
        .from('medications')
        .select('*')
        .eq('patient_id', patientId)
        .in('verification_status', ['verified', 'corrected']);
      verifiedMedications = medData || [];
    }

    if (!patient) return [];

    const alerts: ClinicalSafetyAlert[] = [];
    const now = new Date();

    // Filter to active medications: end_date is null or in the future
    const activeMeds = verifiedMedications.filter((med: any) => {
      if (med.end_date) {
        return new Date(med.end_date) >= now;
      }
      return true;
    });

    // 1. Duplicate Medication Check
    const medGroups = new Map<string, any[]>();
    activeMeds.forEach(med => {
      const name = (med.medicine_name || med.medicineName || '').toLowerCase().trim();
      if (!name) return;
      if (!medGroups.has(name)) medGroups.set(name, []);
      medGroups.get(name)!.push(med);
    });

    medGroups.forEach((group, name) => {
      if (group.length > 1) {
        alerts.push({
          type: 'duplicate',
          severity: 'warning',
          title: 'Duplicate Medication Warning',
          message: `Multiple active prescriptions found for "${group[0].medicine_name}". Ensure you are not taking duplicate dosages.`,
          affectedItems: group.map(m => m.medicine_name)
        });
      }
    });

    // 2. Allergy Conflict Check
    const allergies = patient.known_allergies || [];
    activeMeds.forEach(med => {
      const medName = (med.medicine_name || '').toLowerCase();
      const genName = (med.generic_name || '').toLowerCase();

      allergies.forEach((allergy: string) => {
        const algLower = allergy.toLowerCase().trim();
        if (!algLower) return;

        // Simple substring check
        if (medName.includes(algLower) || algLower.includes(medName) || (genName && (genName.includes(algLower) || algLower.includes(genName)))) {
          alerts.push({
            type: 'allergy_conflict',
            severity: 'critical',
            title: 'Critical Allergy Conflict',
            message: `Active medication "${med.medicine_name}" conflicts with known allergy: "${allergy}".`,
            affectedItems: [med.medicine_name, allergy]
          });
        }
      });
    });

    // 3. Drug-Drug Interaction Check (Deterministic pairs)
    const activeNames = Array.from(medGroups.keys());
    const criticalPairs = [
      {
        drugs: ['aspirin', 'warfarin'],
        message: 'Concomitant use of Aspirin and Warfarin significantly increases bleeding risk. Monitor coagulation parameters closely.'
      },
      {
        drugs: ['aspirin', 'clopidogrel'],
        message: 'Concomitant use of Aspirin and Clopidogrel increases risk of gastrointestinal bleeding.'
      },
      {
        drugs: ['metformin', 'contrast'],
        message: 'Metformin must be temporarily discontinued before and after administration of iodinated contrast media to avoid lactic acidosis.'
      }
    ];

    criticalPairs.forEach(pair => {
      const hasBoth = pair.drugs.every(d => activeNames.some(name => name.includes(d)));
      if (hasBoth) {
        // Find matching original casing names
        const affected = pair.drugs.map(d => {
          const match = activeMeds.find(m => (m.medicine_name || '').toLowerCase().includes(d));
          return match ? match.medicine_name : d;
        });

        alerts.push({
          type: 'drug_interaction',
          severity: 'critical',
          title: 'Critical Drug-Drug Interaction',
          message: pair.message,
          affectedItems: affected
        });
      }
    });

    return alerts;
  }

  /**
   * Analyzes history for a specific lab test and returns a chronological trend report.
   */
  static async analyzeLabTrends(
    patientId: string,
    testName: string,
    dbClient: any,
    isDemo: boolean = false
  ): Promise<LabTrendReport | null> {
    let verifiedLabs: any[] = [];

    if (isDemo) {
      const res = mockDb.query('lab_results').select().eq('patient_id', patientId);
      verifiedLabs = (res.data || []).filter(
        (l: any) => l.verification_status === 'verified' || l.verification_status === 'corrected'
      );
    } else {
      const { data } = await dbClient
        .from('lab_results')
        .select('*')
        .eq('patient_id', patientId)
        .in('verification_status', ['verified', 'corrected']);
      verifiedLabs = data || [];
    }

    const targetLower = testName.toLowerCase().trim();
    // Filter matching lab results
    const matchingLabs = verifiedLabs.filter((l: any) => {
      const name = (l.test_name || '').toLowerCase().trim();
      return name === targetLower || name.includes(targetLower) || targetLower.includes(name);
    });

    if (matchingLabs.length === 0) return null;

    // Sort chronologically by date
    matchingLabs.sort((a: any, b: any) => {
      const dateA = new Date(a.test_date || a.event_date || 0).getTime();
      const dateB = new Date(b.test_date || b.event_date || 0).getTime();
      return dateA - dateB;
    });

    const points: LabTrendPoint[] = [];
    let numericValues: number[] = [];

    matchingLabs.forEach((lab: any) => {
      const cleanValStr = (lab.normalized_value || lab.value || '').replace(/[^\d\.]/g, '');
      const numVal = parseFloat(cleanValStr);
      if (isNaN(numVal)) return;

      numericValues.push(numVal);
      points.push({
        date: lab.test_date || lab.event_date || new Date().toISOString().split('T')[0],
        value: numVal,
        unit: lab.normalized_unit || lab.unit || '',
        isAbnormal: lab.abnormal_flag === true || lab.abnormalFlag === true,
        referenceRange: lab.reference_range || lab.referenceRange || null
      });
    });

    if (points.length === 0) return null;

    const latest = points[points.length - 1];
    let trendDirection: 'UPWARD' | 'DOWNWARD' | 'STABLE' | 'NONE' = 'NONE';

    if (points.length >= 2) {
      const prev = points[points.length - 2];
      if (latest.value > prev.value) {
        trendDirection = 'UPWARD';
      } else if (latest.value < prev.value) {
        trendDirection = 'DOWNWARD';
      } else {
        trendDirection = 'STABLE';
      }
    }

    return {
      testName: matchingLabs[0].test_name,
      latestValue: String(latest.value),
      latestUnit: latest.unit,
      trendDirection,
      points,
      minVal: Math.min(...numericValues),
      maxVal: Math.max(...numericValues)
    };
  }
}

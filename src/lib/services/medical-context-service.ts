import { Diagnosis, Medication, LabResult, Procedure } from '@/types';

export interface RelevantHistoryResult {
  records: {
    id: string;
    type: 'diagnosis' | 'medication' | 'lab_result' | 'procedure';
    title: string;
    date: string;
    details: string;
    relevanceExplanation: string;
    sourceDocumentId?: string;
    sourcePage?: number;
    sourceText?: string;
  }[];
  allergies: {
    name: string;
    provenance: 'verified' | 'patient-entered';
  }[];
  bloodGroup: {
    value: string;
    provenance: 'verified' | 'patient-entered' | 'unknown';
  };
}

export class RelevantMedicalHistoryService {
  /**
   * Retrieves prior patient records potentially relevant to the current symptoms
   * based on structured heuristics.
   */
  static async retrieveRelevantHistory(
    patientId: string,
    context: {
      reason_category: string;
      problem_location?: string;
      selected_symptoms?: string[];
      patient_description?: string;
    },
    dbClient: any,
    isDemo: boolean = false
  ): Promise<RelevantHistoryResult> {
    
    // 1. Fetch patient details (allergies, blood group)
    let patientData: any = null;
    let diagnoses: any[] = [];
    let medications: any[] = [];
    let labResults: any[] = [];
    let procedures: any[] = [];

    if (isDemo) {
      const pRes = dbClient.query('patients').select().eq('id', patientId).single();
      patientData = pRes.data;

      diagnoses = dbClient.query('diagnoses').select().eq('patient_id', patientId).data || [];
      medications = dbClient.query('medications').select().eq('patient_id', patientId).data || [];
      labResults = dbClient.query('lab_results').select().eq('patient_id', patientId).data || [];
      procedures = dbClient.query('procedures').select().eq('patient_id', patientId).data || [];
    } else {
      const { data: pData } = await dbClient
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();
      patientData = pData;

      const { data: dx } = await dbClient
        .from('diagnoses')
        .select('*, medical_records(event_date)')
        .eq('patient_id', patientId)
        .eq('verification_status', 'verified');
      diagnoses = dx || [];

      const { data: meds } = await dbClient
        .from('medications')
        .select('*, medical_records(event_date)')
        .eq('patient_id', patientId)
        .eq('verification_status', 'verified');
      medications = meds || [];

      const { data: labs } = await dbClient
        .from('lab_results')
        .select('*, medical_records(event_date)')
        .eq('patient_id', patientId)
        .eq('verification_status', 'verified');
      labResults = labs || [];

      const { data: procs } = await dbClient
        .from('procedures')
        .select('*, medical_records(event_date)')
        .eq('patient_id', patientId)
        .eq('verification_status', 'verified');
      procedures = procs || [];
    }

    const matchedRecords: RelevantHistoryResult['records'] = [];

    // Normalize input text for heuristic match
    const searchString = `${context.reason_category} ${context.problem_location || ''} ${context.selected_symptoms?.join(' ') || ''} ${context.patient_description || ''}`.toLowerCase();

    // Define locations
    const isAbdomen = searchString.includes('abdomen') || searchString.includes('abdominal') || searchString.includes('stomach') || searchString.includes('belly') || searchString.includes('pancreas') || searchString.includes('pancreatitis') || searchString.includes('gastro') || searchString.includes('vomit');
    const isChest = searchString.includes('chest') || searchString.includes('heart') || searchString.includes('breath') || searchString.includes('lung') || searchString.includes('cough') || searchString.includes('asthma') || searchString.includes('pneumonia');
    const isHead = searchString.includes('head') || searchString.includes('migraine') || searchString.includes('brain') || searchString.includes('neuro') || searchString.includes('concussion') || searchString.includes('dizzy') || searchString.includes('consciousness');
    const isAccident = context.reason_category === 'Accident / Injury' || searchString.includes('accident') || searchString.includes('injury') || searchString.includes('trauma') || searchString.includes('fall') || searchString.includes('bleed');

    // HEURISTIC MATCHING RULES (Deterministic Selection)

    // Rule 1: Diagnoses
    diagnoses.forEach((dx: any) => {
      const nameLower = dx.name.toLowerCase();
      const notesLower = (dx.notes || '').toLowerCase();
      const dxText = `${nameLower} ${notesLower}`;
      let relevanceReason = '';

      if (isAbdomen && (dxText.includes('pancrea') || dxText.includes('gastro') || dxText.includes('stomach') || dxText.includes('chole') || dxText.includes('liver') || dxText.includes('appendix') || dxText.includes('colitis') || dxText.includes('abdominal'))) {
        relevanceReason = 'Retrieved because this prior diagnosis involves the abdominal area or gastrointestinal history.';
      } else if (isChest && (dxText.includes('heart') || dxText.includes('card') || dxText.includes('lung') || dxText.includes('asthma') || dxText.includes('pneumonia') || dxText.includes('angina') || dxText.includes('pulmon'))) {
        relevanceReason = 'Retrieved because this prior diagnosis involves respiratory or cardiovascular systems.';
      } else if (isHead && (dxText.includes('head') || dxText.includes('migraine') || dxText.includes('brain') || dxText.includes('neuro') || dxText.includes('stroke') || dxText.includes('concussion'))) {
        relevanceReason = 'Retrieved because this prior diagnosis involves neurological or head symptoms.';
      } else if (isAccident && (dxText.includes('diabet') || dxText.includes('hyper') || dxText.includes('bleed') || dxText.includes('stroke') || dx.is_chronic)) {
        relevanceReason = 'Retrieved because this chronic or critical history is important in trauma assessment.';
      }

      if (relevanceReason) {
        matchedRecords.push({
          id: dx.id,
          type: 'diagnosis',
          title: dx.name,
          date: dx.medical_records?.event_date || dx.event_date || new Date().toISOString().split('T')[0],
          details: dx.notes || 'No specific notes recorded.',
          relevanceExplanation: relevanceReason,
          sourceDocumentId: dx.source_document_id,
          sourcePage: dx.source_page,
          sourceText: dx.source_text
        });
      }
    });

    // Rule 2: Active Medications (Medications are always relevant to clinical intake)
    medications.forEach((med: any) => {
      // Check if it is an active daily medication
      const isHistorical = med.end_date && new Date(med.end_date) < new Date();
      if (!isHistorical) {
        let medRelevance = 'Retrieved because it is an active medication currently recorded in your profile.';
        if (isAccident && (med.medicine_name.toLowerCase().includes('insul') || med.medicine_name.toLowerCase().includes('aspirin') || med.medicine_name.toLowerCase().includes('warfarin') || med.medicine_name.toLowerCase().includes('clopid') || med.medicine_name.toLowerCase().includes('apixaban') || med.medicine_name.toLowerCase().includes('heparin'))) {
          medRelevance = 'Retrieved because this active medication (insulin or blood thinner) is critical safety context for accidents.';
        }

        matchedRecords.push({
          id: med.id,
          type: 'medication',
          title: med.medicine_name,
          date: med.start_date || med.medical_records?.event_date || new Date().toISOString().split('T')[0],
          details: `Strength: ${med.strength || 'N/A'}, Dosage: ${med.dosage || 'N/A'}, Frequency: ${med.frequency || 'N/A'}`,
          relevanceExplanation: medRelevance,
          sourceDocumentId: med.source_document_id,
          sourcePage: med.source_page,
          sourceText: med.source_text
        });
      }
    });

    // Rule 3: Lab Results
    labResults.forEach((lab: any) => {
      const nameLower = lab.test_name.toLowerCase();
      let relevanceReason = '';

      if (isAbdomen && (nameLower.includes('amylase') || nameLower.includes('lipase') || nameLower.includes('lft') || nameLower.includes('liver') || nameLower.includes('bilirubin'))) {
        relevanceReason = 'Retrieved because this lab test checks pancreatic or liver enzymes relevant to abdominal complaints.';
      } else if (isChest && (nameLower.includes('troponin') || nameLower.includes('bnp') || nameLower.includes('d-dimer') || nameLower.includes('cbc') || nameLower.includes('blood gas'))) {
        relevanceReason = 'Retrieved because this lab test checks cardiovascular or oxygenation markers.';
      } else if (isHead && (nameLower.includes('glucose') || nameLower.includes('electrolytes') || nameLower.includes('sodium') || nameLower.includes('potassium'))) {
        relevanceReason = 'Retrieved because metabolic panels or electrolyte imbalances can trigger dizziness or confusion.';
      } else if (isAccident && (nameLower.includes('hba1c') || nameLower.includes('inr') || nameLower.includes('pt') || nameLower.includes('platelet'))) {
        relevanceReason = 'Retrieved because blood coagulation markers are critical to monitor during bleeding or trauma.';
      }

      if (relevanceReason) {
        matchedRecords.push({
          id: lab.id,
          type: 'lab_result',
          title: `${lab.test_name}: ${lab.value} ${lab.unit || ''}`,
          date: lab.test_date || lab.medical_records?.event_date || new Date().toISOString().split('T')[0],
          details: `Reference Range: ${lab.reference_range || 'N/A'}. ${lab.abnormal_flag ? 'Flagged ABNORMAL.' : ''}`,
          relevanceExplanation: relevanceReason,
          sourceDocumentId: lab.source_document_id,
          sourcePage: lab.source_page,
          sourceText: lab.source_text
        });
      }
    });

    // Rule 4: Procedures
    procedures.forEach((proc: any) => {
      const nameLower = proc.name.toLowerCase();
      const notesLower = (proc.notes || '').toLowerCase();
      const procText = `${nameLower} ${notesLower}`;
      let relevanceReason = '';

      if (isAbdomen && (procText.includes('abdomen') || procText.includes('lapar') || procText.includes('append') || procText.includes('chole') || procText.includes('endoscopy') || procText.includes('colonoscopy') || procText.includes('ct abdomen'))) {
        relevanceReason = 'Retrieved because this previous procedure or imaging involved the digestive or abdominal systems.';
      } else if (isChest && (procText.includes('bypass') || procText.includes('stent') || procText.includes('angio') || procText.includes('chest') || procText.includes('ecg') || procText.includes('x-ray chest'))) {
        relevanceReason = 'Retrieved because this previous procedure or imaging checked cardiopulmonary pathways.';
      } else if (isHead && (procText.includes('ct brain') || procText.includes('mri brain') || procText.includes('craniotomy') || procText.includes('eeg'))) {
        relevanceReason = 'Retrieved because this prior brain scan or neuro-procedure is related to head complaints.';
      } else if (isAccident && (procText.includes('surger') || procText.includes('fixation') || procText.includes('implant') || procText.includes('pacemaker'))) {
        relevanceReason = 'Retrieved because prior implants or major surgeries are critical for surgical and trauma teams.';
      }

      if (relevanceReason) {
        matchedRecords.push({
          id: proc.id,
          type: 'procedure',
          title: proc.name,
          date: proc.date || proc.medical_records?.event_date || new Date().toISOString().split('T')[0],
          details: proc.notes || 'No specific procedure notes recorded.',
          relevanceExplanation: relevanceReason,
          sourceDocumentId: proc.source_document_id,
          sourcePage: proc.source_page,
          sourceText: proc.source_text
        });
      }
    });

    // Extract Allergies
    const allergies: RelevantHistoryResult['allergies'] = [];
    if (patientData && patientData.known_allergies) {
      patientData.known_allergies.forEach((alg: string) => {
        // Assume patient allergies entered during onboarding are patient-entered,
        // or check if they match any verified records to determine provenance
        allergies.push({
          name: alg,
          provenance: 'patient-entered' // Default to patient-entered if entered manually
        });
      });
    }

    // Extract Blood Group
    let bloodGroup: RelevantHistoryResult['bloodGroup'] = { value: 'Unknown', provenance: 'unknown' };
    if (patientData && patientData.blood_group) {
      bloodGroup = {
        value: patientData.blood_group,
        provenance: 'patient-entered' // Default patient-entered unless verified by lab
      };

      // Check if any verified lab result explicitly mentions Blood Group
      const hasVerifiedBloodGroupLab = labResults.some((l: any) => 
        l.test_name.toLowerCase().includes('blood group') || 
        l.test_name.toLowerCase().includes('blood type')
      );
      if (hasVerifiedBloodGroupLab) {
        bloodGroup.provenance = 'verified';
      }
    }

    return {
      records: matchedRecords,
      allergies,
      bloodGroup
    };
  }
}

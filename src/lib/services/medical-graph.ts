import { mockDb } from '../supabase/service';
import { formatDate } from '../utils';

export interface GraphNode {
  id?: string;
  patient_id: string;
  entity_type: string;
  canonical_name: string;
  properties: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface GraphEdge {
  id?: string;
  patient_id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: string;
  properties: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface ClinicalInsight {
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  citations: Array<{
    documentId: string;
    documentTitle: string;
    date: string;
    snippet: string;
  }>;
}

export class MedicalGraphService {
  /**
   * Entity Resolution (Phase 2)
   * Resolves raw variations of diagnoses or medications into unified canonical terms.
   */
  public static canonicalizeEntity(name: string, type: 'diagnosis' | 'medication'): string {
    const raw = name.trim().toLowerCase();
    
    if (type === 'diagnosis') {
      // Diabetes mellitus synonyms
      if (
        raw === 'dm' ||
        raw === 'diabetes' ||
        raw === 'type ii dm' ||
        raw === 'type 2 dm' ||
        raw === 't2dm' ||
        raw.includes('diabetes mellitus')
      ) {
        return 'Type 2 Diabetes Mellitus';
      }
      
      // Hypertension synonyms
      if (
        raw === 'htn' ||
        raw === 'hypertension' ||
        raw.includes('high blood pressure') ||
        raw === 'essential hypertension'
      ) {
        return 'Hypertension';
      }

      // GERD synonyms
      if (raw === 'gerd' || raw.includes('acid reflux') || raw.includes('gastroesophageal reflux')) {
        return 'Gastroesophageal Reflux Disease (GERD)';
      }

      // Asthma synonyms
      if (raw === 'asthma' || raw.includes('bronchial asthma')) {
        return 'Bronchial Asthma';
      }

      // Hyperlipidemia synonyms
      if (raw.includes('hyperlipidemia') || raw.includes('high cholesterol') || raw === 'dyslipidemia') {
        return 'Hyperlipidemia';
      }

      // Chronic Kidney Disease synonyms
      if (raw === 'ckd' || raw.includes('chronic kidney disease') || raw.includes('renal failure')) {
        return 'Chronic Kidney Disease';
      }

      // Acute Bronchitis
      if (raw.includes('bronchitis')) {
        return 'Bronchitis';
      }
    }

    if (type === 'medication') {
      // Metformin synonyms
      if (
        raw.includes('metformin') ||
        raw.includes('glycomet') ||
        raw.includes('glucophage') ||
        raw === 'metformin hydrochloride'
      ) {
        return 'Metformin';
      }

      // Aspirin synonyms
      if (
        raw.includes('aspirin') ||
        raw.includes('ecotrin') ||
        raw.includes('acetylsalicylic acid')
      ) {
        return 'Aspirin';
      }

      // Atorvastatin synonyms
      if (raw.includes('atorvastatin') || raw.includes('lipitor') || raw.includes('atorva')) {
        return 'Atorvastatin';
      }

      // Amoxicillin synonyms
      if (raw.includes('amoxicillin') || raw.includes('mox') || raw.includes('amoxil')) {
        return 'Amoxicillin';
      }

      // Metoprolol synonyms
      if (raw.includes('metoprolol') || raw.includes('lopressor')) {
        return 'Metoprolol';
      }

      // Warfarin synonyms
      if (raw.includes('warfarin') || raw.includes('coumadin')) {
        return 'Warfarin';
      }

      // Clopidogrel synonyms
      if (raw.includes('clopidogrel') || raw.includes('plavix')) {
        return 'Clopidogrel';
      }

      // Lisinopril synonyms
      if (raw.includes('lisinopril') || raw.includes('zestril')) {
        return 'Lisinopril';
      }
    }

    // Default cleanup: strip strengths (e.g. 500mg, 10ml, tab, cap)
    return name
      .replace(/\b\d+(\.\d+)?\s*(mg|g|mcg|ml|tab|cap|tabs|caps|iu)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Build Knowledge Graph from records (Phase 1)
   * Scans verified diagnoses, medications, labs, and procedures to build graph nodes and edges.
   */
  public static async buildGraphFromRecords(
    patientId: string,
    dbClient: any,
    isDemo: boolean = false
  ): Promise<void> {
    try {
      // 1. Fetch patient verified clinical entities
      let diagnoses: any[] = [];
      let medications: any[] = [];
      let labResults: any[] = [];
      let procedures: any[] = [];
      let documents: any[] = [];

      if (isDemo) {
        diagnoses = dbClient.query('diagnoses').select().eq('patient_id', patientId).data || [];
        medications = dbClient.query('medications').select().eq('patient_id', patientId).data || [];
        labResults = dbClient.query('lab_results').select().eq('patient_id', patientId).data || [];
        procedures = dbClient.query('procedures').select().eq('patient_id', patientId).data || [];
        documents = dbClient.query('documents').select().eq('patient_id', patientId).data || [];
      } else {
        const { data: dx } = await dbClient.from('diagnoses').select('*').eq('patient_id', patientId);
        const { data: med } = await dbClient.from('medications').select('*').eq('patient_id', patientId);
        const { data: lab } = await dbClient.from('lab_results').select('*').eq('patient_id', patientId);
        const { data: proc } = await dbClient.from('procedures').select('*').eq('patient_id', patientId);
        const { data: docs } = await dbClient.from('documents').select('*').eq('patient_id', patientId);
        diagnoses = dx || [];
        medications = med || [];
        labResults = lab || [];
        procedures = proc || [];
        documents = docs || [];
      }

      // Filter to only processed/verified status items
      const verifiedDx = diagnoses.filter(d => d.verification_status === 'verified' || d.verification_status === 'corrected');
      const verifiedMed = medications.filter(m => m.verification_status === 'verified' || m.verification_status === 'corrected');
      const verifiedLab = labResults.filter(l => l.verification_status === 'verified' || l.verification_status === 'corrected');
      const verifiedProc = procedures.filter(p => p.verification_status === 'verified' || p.verification_status === 'corrected');

      // Clear existing graph nodes and edges to rebuild fresh
      if (isDemo) {
        dbClient.query('graph_nodes').delete().eq('patient_id', patientId);
        dbClient.query('graph_edges').delete().eq('patient_id', patientId);
      } else {
        await dbClient.from('graph_nodes').delete().eq('patient_id', patientId);
        await dbClient.from('graph_edges').delete().eq('patient_id', patientId);
      }

      // 2. Insert Patient Node
      const patientNodeId = `node-patient-${patientId}`;
      const patientNode: GraphNode = {
        id: patientNodeId,
        patient_id: patientId,
        entity_type: 'Patient',
        canonical_name: 'Patient Profile',
        properties: { evidence_count: 1, source_documents: [] }
      };

      if (isDemo) {
        dbClient.query('graph_nodes').insert(patientNode);
      } else {
        await dbClient.from('graph_nodes').insert(patientNode);
      }

      // Helper map to cache node IDs by type + canonical name
      const nodeCache: Record<string, string> = {
        'Patient:Patient Profile': patientNodeId
      };

      const getOrCreateNode = async (
        type: string,
        name: string,
        initialProps: Record<string, any>,
        docId?: string
      ): Promise<string> => {
        const cacheKey = `${type}:${name}`;
        if (nodeCache[cacheKey]) {
          return nodeCache[cacheKey];
        }

        const nodeId = `node-${type.toLowerCase()}-${Math.random().toString(36).substring(7)}`;
        const node: GraphNode = {
          id: nodeId,
          patient_id: patientId,
          entity_type: type,
          canonical_name: name,
          properties: {
            evidence_count: 1,
            source_documents: docId ? [docId] : [],
            ...initialProps
          }
        };

        if (isDemo) {
          dbClient.query('graph_nodes').insert(node);
        } else {
          await dbClient.from('graph_nodes').insert(node);
        }

        nodeCache[cacheKey] = nodeId;
        return nodeId;
      };

      const createEdge = async (
        sourceId: string,
        targetId: string,
        relType: string,
        props: Record<string, any>
      ) => {
        const edge: GraphEdge = {
          patient_id: patientId,
          source_node_id: sourceId,
          target_node_id: targetId,
          relationship_type: relType,
          properties: props
        };

        if (isDemo) {
          dbClient.query('graph_edges').insert(edge);
        } else {
          await dbClient.from('graph_edges').insert(edge);
        }
      };

      // 3. Cluster documents into Encounters (Phase 1)
      const sortedDocs = [...documents].sort((a, b) => {
        const dateA = a.created_at || '';
        const dateB = b.created_at || '';
        return dateA.localeCompare(dateB);
      });

      const encounters: Array<{
        id: string;
        date: string;
        hospital: string | null;
        doctor: string | null;
        docIds: string[];
        title: string;
      }> = [];

      for (const doc of sortedDocs) {
        const docDate = doc.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
        const docHospital = doc.metadata?.hospital_name || doc.metadata?.clinic_name || null;
        const docDoctor = doc.metadata?.doctor_name || null;

        // Try to find an existing encounter within a 3-day window matching hospital or doctor
        let matchedEncounter = encounters.find(enc => {
          const daysDiff = Math.abs(new Date(enc.date).getTime() - new Date(docDate).getTime()) / (1000 * 60 * 60 * 24);
          if (daysDiff > 3) return false;

          if (docHospital && enc.hospital && docHospital.toLowerCase().trim() === enc.hospital.toLowerCase().trim()) {
            return true;
          }
          if (docDoctor && enc.doctor && docDoctor.toLowerCase().trim() === enc.doctor.toLowerCase().trim()) {
            return true;
          }
          if (!docHospital && !enc.hospital && !docDoctor && !enc.doctor) {
            return true;
          }
          return false;
        });

        if (matchedEncounter) {
          matchedEncounter.docIds.push(doc.id);
          if (docHospital && !matchedEncounter.hospital) matchedEncounter.hospital = docHospital;
          if (docDoctor && !matchedEncounter.doctor) matchedEncounter.doctor = docDoctor;
        } else {
          const encId = `enc-${Math.random().toString(36).substring(7)}`;
          encounters.push({
            id: encId,
            date: docDate,
            hospital: docHospital,
            doctor: docDoctor,
            docIds: [doc.id],
            title: docHospital ? `Admission at ${docHospital}` : `Doctor Visit on ${formatDate(docDate)}`
          });
        }
      }

      const encounterMap: Record<string, string> = {}; // docId -> encounterNodeId

      for (const enc of encounters) {
        const encounterNodeId = await getOrCreateNode(
          'Encounter',
          enc.title,
          {
            date: enc.date,
            hospital_name: enc.hospital,
            doctor_name: enc.doctor,
            documents_count: enc.docIds.length
          },
          enc.docIds[0]
        );

        for (const docId of enc.docIds) {
          encounterMap[docId] = encounterNodeId;
          // Link Patient -> Encounter
          await createEdge(patientNodeId, encounterNodeId, 'belongs_to_encounter', { date: enc.date });
          
          if (enc.hospital) {
            const hospNodeId = await getOrCreateNode('Hospital', enc.hospital, {}, docId);
            await createEdge(encounterNodeId, hospNodeId, 'performed_at', { date: enc.date });
          }
          if (enc.doctor) {
            const docNodeId = await getOrCreateNode('Doctor', enc.doctor, {}, docId);
            await createEdge(encounterNodeId, docNodeId, 'ordered_by', { date: enc.date });
          }
        }
      }

      // Helper to retrieve or create encounter if missing
      const getEncounterId = async (docId?: string, fallbackDate?: string): Promise<string> => {
        if (docId && encounterMap[docId]) {
          return encounterMap[docId];
        }
        const date = fallbackDate || new Date().toISOString().split('T')[0];
        const encounterName = `Encounter on ${formatDate(date)}`;
        return getOrCreateNode('Encounter', encounterName, { date }, docId);
      };

      // 4. Populate diagnoses nodes & edges
      for (const dx of verifiedDx) {
        const canonical = this.canonicalizeEntity(dx.name, 'diagnosis');
        const dxNodeId = await getOrCreateNode(
          'Diagnosis',
          canonical,
          {
            is_chronic: dx.is_chronic,
            notes: dx.notes,
            confidence: dx.confidence_score,
            verification_status: dx.verification_status
          },
          dx.source_document_id
        );

        // Link Encounter -> Diagnosis via diagnosed_with
        const encounterId = await getEncounterId(dx.source_document_id, dx.created_at);
        await createEdge(encounterId, dxNodeId, 'diagnosed_with', {
          confidence: dx.confidence_score,
          evidence_text: dx.source_text
        });

        // Link Patient -> Diagnosis
        await createEdge(patientNodeId, dxNodeId, 'diagnosed_with', {
          is_chronic: dx.is_chronic
        });
      }

      // 5. Populate medications nodes & edges
      for (const med of verifiedMed) {
        const canonical = this.canonicalizeEntity(med.medicine_name, 'medication');
        const medNodeId = await getOrCreateNode(
          'Medication',
          canonical,
          {
            generic_name: med.generic_name,
            strength: med.strength,
            route: med.route,
            frequency: med.frequency,
            duration: med.duration,
            instructions: med.instructions,
            start_date: med.start_date,
            end_date: med.end_date,
            reason: med.reason,
            confidence: med.confidence_score,
            verification_status: med.verification_status
          },
          med.source_document_id
        );

        // Link Encounter -> Medication via prescribed
        const encounterId = await getEncounterId(med.source_document_id, med.created_at);
        await createEdge(encounterId, medNodeId, 'prescribed', {
          dosage: med.dosage,
          duration: med.duration,
          instructions: med.instructions
        });

        // Link Patient -> Medication
        await createEdge(patientNodeId, medNodeId, 'prescribed', {
          start_date: med.start_date,
          end_date: med.end_date
        });
      }

      // 6. Populate lab results nodes & edges
      for (const lab of verifiedLab) {
        const labTestNodeId = await getOrCreateNode(
          'Lab Test',
          lab.test_name,
          { unit: lab.unit },
          lab.source_document_id
        );

        // Create lab result node
        const labResultNodeId = await getOrCreateNode(
          'Lab Result',
          `${lab.test_name}: ${lab.value} ${lab.unit || ''}`,
          {
            value: lab.value,
            unit: lab.unit,
            reference_range: lab.reference_range,
            abnormal_flag: lab.abnormal_flag,
            test_date: lab.test_date,
            confidence: lab.confidence_score
          },
          lab.source_document_id
        );

        // Link Lab Test -> Lab Result
        await createEdge(labTestNodeId, labResultNodeId, 'caused', { date: lab.test_date });

        // Link Encounter -> Lab Result
        const encounterId = await getEncounterId(lab.source_document_id, lab.test_date);
        await createEdge(encounterId, labResultNodeId, 'ordered_by', { date: lab.test_date });
      }

      // 7. Populate procedures nodes & edges
      for (const proc of verifiedProc) {
        const procNodeId = await getOrCreateNode(
          'Procedure',
          proc.name,
          {
            date: proc.date,
            surgeon_name: proc.surgeon_name,
            notes: proc.notes,
            confidence: proc.confidence_score
          },
          proc.source_document_id
        );

        // Link Encounter -> Procedure
        const encounterId = await getEncounterId(proc.source_document_id, proc.date);
        await createEdge(encounterId, procNodeId, 'belongs_to_encounter', { date: proc.date });
      }

    } catch (err) {
      console.error('Failed to build Knowledge Graph from records:', err);
    }
  }

  /**
   * Sync Patient Memory (Phase 3)
   * Syncs resolved canonical diagnoses and medications back to patient profile arrays.
   */
  public static async syncMemory(
    patientId: string,
    dbClient: any,
    isDemo: boolean = false
  ): Promise<void> {
    try {
      let nodes: GraphNode[] = [];
      if (isDemo) {
        nodes = dbClient.query('graph_nodes').select().eq('patient_id', patientId).data || [];
      } else {
        const { data } = await dbClient.from('graph_nodes').select('*').eq('patient_id', patientId);
        nodes = data || [];
      }

      // Extract chronic conditions
      const chronicConditions = nodes
        .filter(n => n.entity_type === 'Diagnosis' && n.properties?.is_chronic === true)
        .map(n => n.canonical_name);

      // Extract current active long-term medications
      const longTermMeds = nodes
        .filter(n => n.entity_type === 'Medication' && (!n.properties?.end_date || n.properties?.duration?.toLowerCase().includes('ongoing') || n.properties?.duration?.toLowerCase().includes('chronic')))
        .map(n => n.canonical_name);

      // Unique deduplicated lists
      const uniqueChronic = Array.from(new Set(chronicConditions));
      const uniqueMeds = Array.from(new Set(longTermMeds));

      if (isDemo) {
        dbClient.query('patients').update({
          known_chronic_conditions: uniqueChronic,
          current_long_term_medications: uniqueMeds
        }).eq('id', patientId);
      } else {
        await dbClient.from('patients').update({
          known_chronic_conditions: uniqueChronic,
          current_long_term_medications: uniqueMeds
        }).eq('id', patientId);
      }

      console.log(`Knowledge Graph Synced Memory: Chronic Conditions=[${uniqueChronic.join(', ')}], Medications=[${uniqueMeds.join(', ')}]`);
    } catch (err) {
      console.error('Failed to sync patient profile memory from Knowledge Graph:', err);
    }
  }

  /**
   * Generate Clinical Insights (Phase 4)
   * Evaluates lab history, medications, and conditions to generate reasoned insights with citations.
   */
  public static async generateClinicalInsights(
    patientId: string,
    dbClient: any,
    isDemo: boolean = false
  ): Promise<ClinicalInsight[]> {
    const insights: ClinicalInsight[] = [];

    try {
      let labResults: any[] = [];
      let medications: any[] = [];
      let diagnoses: any[] = [];
      let documents: any[] = [];

      if (isDemo) {
        labResults = dbClient.query('lab_results').select().eq('patient_id', patientId).data || [];
        medications = dbClient.query('medications').select().eq('patient_id', patientId).data || [];
        diagnoses = dbClient.query('diagnoses').select().eq('patient_id', patientId).data || [];
        documents = dbClient.query('documents').select().eq('patient_id', patientId).data || [];
      } else {
        const { data: lab } = await dbClient.from('lab_results').select('*').eq('patient_id', patientId);
        const { data: med } = await dbClient.from('medications').select('*').eq('patient_id', patientId);
        const { data: dx } = await dbClient.from('diagnoses').select('*').eq('patient_id', patientId);
        const { data: docs } = await dbClient.from('documents').select('*').eq('patient_id', patientId);
        labResults = lab || [];
        medications = med || [];
        diagnoses = dx || [];
        documents = docs || [];
      }

      const getDocTitle = (id?: string) => {
        const d = documents.find(doc => doc.id === id);
        return d ? d.file_name : 'Medical Document';
      };

      // 1. HbA1c Progression Check (Diabetes)
      const hba1cTests = labResults
        .filter(l => l.test_name.toLowerCase().includes('hba1c') && (l.verification_status === 'verified' || l.verification_status === 'corrected'))
        .sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());

      if (hba1cTests.length >= 2) {
        const first = hba1cTests[0];
        const last = hba1cTests[hba1cTests.length - 1];
        const valFirst = parseFloat(first.value);
        const valLast = parseFloat(last.value);

        if (!isNaN(valFirst) && !isNaN(valLast) && valLast > valFirst) {
          insights.push({
            title: 'Diabetes Progression Risk (Rising HbA1c)',
            description: `Your HbA1c has increased from ${valFirst}% on ${formatDate(first.test_date)} to ${valLast}% on ${formatDate(last.test_date)}, indicating worsening glycemic control and potential diabetes progression risk.`,
            severity: valLast >= 6.5 ? 'critical' : 'warning',
            citations: hba1cTests.map(t => ({
              documentId: t.source_document_id || '',
              documentTitle: getDocTitle(t.source_document_id),
              date: t.test_date,
              snippet: `${t.test_name}: ${t.value}%`
            }))
          });
        }
      }

      // 2. Hemoglobin Falling Check (Anemia)
      const hbTests = labResults
        .filter(l => (l.test_name.toLowerCase() === 'hemoglobin' || l.test_name.toLowerCase() === 'hb') && (l.verification_status === 'verified' || l.verification_status === 'corrected'))
        .sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());

      if (hbTests.length >= 2) {
        const first = hbTests[0];
        const last = hbTests[hbTests.length - 1];
        const valFirst = parseFloat(first.value);
        const valLast = parseFloat(last.value);

        if (!isNaN(valFirst) && !isNaN(valLast) && valLast < valFirst && valLast < 12.0) {
          insights.push({
            title: 'Anemia Alert (Falling Hemoglobin)',
            description: `Your Hemoglobin level has fallen from ${valFirst} g/dL on ${formatDate(first.test_date)} to ${valLast} g/dL on ${formatDate(last.test_date)}, indicating potential development or worsening of anemia.`,
            severity: valLast < 10.0 ? 'critical' : 'warning',
            citations: hbTests.map(t => ({
              documentId: t.source_document_id || '',
              documentTitle: getDocTitle(t.source_document_id),
              date: t.test_date,
              snippet: `${t.test_name}: ${t.value} g/dL`
            }))
          });
        }
      }

      // 3. Repeated Antibiotics Use Check
      const verifiedMeds = medications.filter(m => m.verification_status === 'verified' || m.verification_status === 'corrected');
      const antibiotics = verifiedMeds.filter(m => {
        const name = m.medicine_name.toLowerCase();
        return (
          name.includes('amoxicillin') ||
          name.includes('azithromycin') ||
          name.includes('ciprofloxacin') ||
          name.includes('doxycycline') ||
          name.includes('clavulanate') ||
          name.includes('cefixime')
        );
      });

      if (antibiotics.length >= 3) {
        insights.push({
          title: 'Frequent Antibiotic Use Warning',
          description: `You have been prescribed antibiotic courses ${antibiotics.length} times recently. Frequent antibiotic usage can increase the risk of gut microbiome disruption and antibiotic resistance.`,
          severity: 'warning',
          citations: antibiotics.map(a => ({
            documentId: a.source_document_id || '',
            documentTitle: getDocTitle(a.source_document_id),
            date: a.start_date || a.created_at?.split('T')[0] || '',
            snippet: `Prescribed: ${a.medicine_name} (${a.duration || 'Short course'})`
          }))
        });
      }

      // 4. Repeated Hospital Encounters
      const verifiedDocs = documents.filter(d => d.processing_status === 'completed' || d.processing_status === 'awaiting_review');
      const dischargeSummaries = verifiedDocs.filter(d => d.category?.toLowerCase() === 'discharge summary' || d.file_name?.toLowerCase().includes('discharge'));

      if (dischargeSummaries.length >= 2) {
        insights.push({
          title: 'Frequent Hospitalizations / Readmission Alert',
          description: `The medical timeline records ${dischargeSummaries.length} hospital discharge events, suggesting a high rate of hospitalization. Closer physician monitoring is recommended to prevent readmission.`,
          severity: 'critical',
          citations: dischargeSummaries.map(d => ({
            documentId: d.id,
            documentTitle: d.file_name || 'Discharge Summary',
            date: d.created_at?.split('T')[0] || '',
            snippet: `Hospitalization Record: ${d.file_name}`
          }))
        });
      }

    } catch (err) {
      console.error('Failed to generate clinical reasoning insights:', err);
    }

    return insights;
  }

  /**
   * Save Reviewer Feedback for Continuous Learning (Phase 8)
   * Captures corrections and user edits for versioning and training.
   */
  public static async saveCorrectionFeedback(
    patientId: string,
    documentId: string,
    originalOcr: string,
    originalPayload: any,
    correctedPayload: any,
    edits: any,
    dbClient: any,
    isDemo: boolean = false,
    reasonForCorrection: string = 'User Correction',
    version: number = 1
  ): Promise<void> {
    try {
      const feedback = {
        patient_id: patientId,
        document_id: documentId,
        original_ocr: originalOcr,
        original_extraction: originalPayload,
        corrected_extraction: correctedPayload,
        confidence: correctedPayload.classificationConfidence || 1.0,
        reviewer_edits: edits,
        reason_for_correction: reasonForCorrection,
        version: version,
        created_at: new Date().toISOString()
      };

      if (isDemo) {
        dbClient.query('feedback_training_data').insert(feedback);
      } else {
        await dbClient.from('feedback_training_data').insert(feedback);
      }

      console.log(`Saved correction feedback to continuous learning database for document ${documentId} (v${version})`);
    } catch (err) {
      console.error('Failed to save correction feedback for continuous learning:', err);
    }
  }

  /**
   * Disease Journey Timelines (Phase 2)
   * Tracks chronological stages and lifecycles for each diagnosis node.
   */
  public static async analyzeDiseaseJourneys(
    patientId: string,
    dbClient: any,
    isDemo: boolean = false
  ): Promise<Record<string, { status: string; timeline: any[] }>> {
    let diagnoses: any[] = [];
    if (isDemo) {
      diagnoses = dbClient.query('diagnoses').select().eq('patient_id', patientId).data || [];
    } else {
      const { data } = await dbClient.from('diagnoses').select('*').eq('patient_id', patientId);
      diagnoses = data || [];
    }

    const verified = diagnoses
      .filter(d => d.verification_status === 'verified' || d.verification_status === 'corrected')
      .sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());

    const journeys: Record<string, { status: string; timeline: any[] }> = {};

    for (const dx of verified) {
      const canonical = this.canonicalizeEntity(dx.name, 'diagnosis');
      if (!journeys[canonical]) {
        journeys[canonical] = {
          status: 'Detected',
          timeline: []
        };
      }

      let eventStatus = 'Detected';
      if (dx.verification_status === 'verified') {
        eventStatus = 'Confirmed';
      } else if (dx.verification_status === 'corrected') {
        eventStatus = 'Confirmed (Corrected)';
      }

      if (dx.is_chronic) {
        eventStatus = 'Chronic (Stable)';
      }

      if (dx.notes?.toLowerCase().includes('worsening') || dx.notes?.toLowerCase().includes('progression')) {
        eventStatus = 'Progressing';
      } else if (dx.notes?.toLowerCase().includes('improving') || dx.notes?.toLowerCase().includes('resolved')) {
        eventStatus = 'Resolved';
      }

      journeys[canonical].timeline.push({
        date: dx.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        status: eventStatus,
        notes: dx.notes || '',
        documentId: dx.source_document_id
      });

      journeys[canonical].status = eventStatus;
    }

    return journeys;
  }

  /**
   * Medication Switches (Phase 3)
   * Tracks dose changes, starts, stops, and therapeutic substitutions.
   */
  public static async detectMedicationSwitches(
    patientId: string,
    dbClient: any,
    isDemo: boolean = false
  ): Promise<any[]> {
    let medications: any[] = [];
    let labResults: any[] = [];

    if (isDemo) {
      medications = dbClient.query('medications').select().eq('patient_id', patientId).data || [];
      labResults = dbClient.query('lab_results').select().eq('patient_id', patientId).data || [];
    } else {
      const { data: med } = await dbClient.from('medications').select('*').eq('patient_id', patientId);
      const { data: lab } = await dbClient.from('lab_results').select('*').eq('patient_id', patientId);
      medications = med || [];
      labResults = lab || [];
    }

    const verified = medications
      .filter(m => m.verification_status === 'verified' || m.verification_status === 'corrected')
      .sort((a, b) => new Date(a.start_date || a.created_at).getTime() - new Date(b.start_date || b.created_at).getTime());

    const switches: any[] = [];
    const activeMeds: Record<string, any> = {};

    for (const med of verified) {
      const canonicalName = this.canonicalizeEntity(med.medicine_name, 'medication');
      const medDate = med.start_date || med.created_at?.split('T')[0] || '';

      const prev = activeMeds[canonicalName];
      if (prev) {
        if (prev.strength !== med.strength || prev.dosage !== med.dosage) {
          switches.push({
            type: 'Dose changed',
            medicine: canonicalName,
            from: prev.strength || prev.dosage || 'Previous Dose',
            to: med.strength || med.dosage || 'New Dose',
            date: medDate,
            evidence: `Dosing altered from ${prev.strength || prev.dosage} to ${med.strength || med.dosage}`,
            citations: [prev.source_document_id, med.source_document_id]
          });
        }
        activeMeds[canonicalName] = med;
      } else {
        const antiHypertensives = ['amlodipine', 'telmisartan', 'metoprolol', 'lisinopril', 'losartan'];
        const isAH = antiHypertensives.includes(canonicalName.toLowerCase());
        
        let replacedMed = null;
        if (isAH) {
          for (const [activeName, activeMed] of Object.entries(activeMeds)) {
            if (antiHypertensives.includes(activeName.toLowerCase()) && activeName !== canonicalName) {
              replacedMed = activeMed;
              break;
            }
          }
        }

        if (replacedMed) {
          const replacedName = this.canonicalizeEntity(replacedMed.medicine_name, 'medication');
          const highBpEvidence = labResults.some(l => 
            (l.test_name.toLowerCase().includes('bp') || l.test_name.toLowerCase().includes('blood pressure')) && 
            parseFloat(l.value) > 140
          );
          const reason = highBpEvidence ? 'Blood pressure uncontrolled' : 'Treatment optimization';

          switches.push({
            type: 'Replacement',
            from: replacedName,
            to: canonicalName,
            date: medDate,
            reason: reason,
            evidence: `${canonicalName} substituted for ${replacedName}. Reason: ${reason}.`,
            citations: [replacedMed.source_document_id, med.source_document_id]
          });

          delete activeMeds[replacedName];
        }

        activeMeds[canonicalName] = med;
        switches.push({
          type: 'Started',
          medicine: canonicalName,
          date: medDate,
          evidence: `${canonicalName} initiated daily.`,
          citations: [med.source_document_id]
        });
      }
    }

    return switches;
  }

  /**
   * Laboratory Intelligence Panels (Phase 4)
   * Groups markers into panels and computes statistics.
   */
  public static async computeLabPanels(
    patientId: string,
    dbClient: any,
    isDemo: boolean = false
  ): Promise<Record<string, Record<string, {
    latest: string;
    highest: string;
    lowest: string;
    median: string;
    rate_of_change: string;
    persistent_abnormality: boolean;
    points: any[];
  }>>> {
    let labResults: any[] = [];
    if (isDemo) {
      labResults = dbClient.query('lab_results').select().eq('patient_id', patientId).data || [];
    } else {
      const { data } = await dbClient.from('lab_results').select('*').eq('patient_id', patientId);
      labResults = data || [];
    }

    const verified = labResults
      .filter(l => l.verification_status === 'verified' || l.verification_status === 'corrected')
      .sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());

    const panelMappings: Record<string, string[]> = {
      'CBC': ['wbc', 'rbc', 'hemoglobin', 'hb', 'platelet', 'platelets', 'hematocrit'],
      'LFT': ['bilirubin', 'sgot', 'ast', 'sgpt', 'alt', 'alkaline phosphatase', 'alp', 'albumin', 'total protein'],
      'KFT': ['creatinine', 'urea', 'bun', 'uric acid'],
      'Lipid Profile': ['cholesterol', 'triglycerides', 'hdl', 'ldl'],
      'Diabetes Profile': ['hba1c', 'fasting blood sugar', 'fbs', 'post-prandial blood sugar', 'ppbs']
    };

    const panels: Record<string, Record<string, any>> = {};

    for (const [panelName, markers] of Object.entries(panelMappings)) {
      const panelData: Record<string, any> = {};

      for (const marker of markers) {
        const markerResults = verified.filter(l => {
          const name = l.test_name.toLowerCase();
          return name === marker || name.includes(marker);
        });

        if (markerResults.length === 0) continue;

        const values = markerResults.map(r => parseFloat(r.value)).filter(v => !isNaN(v));
        if (values.length === 0) continue;

        const latest = markerResults[markerResults.length - 1];
        const highest = Math.max(...values);
        const lowest = Math.min(...values);
        
        const sortedVals = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sortedVals.length / 2);
        const median = sortedVals.length % 2 !== 0 ? sortedVals[mid] : (sortedVals[mid - 1] + sortedVals[mid]) / 2;

        let rateOfChange = '0.00 / day';
        if (markerResults.length >= 2) {
          const earliest = markerResults[0];
          const days = Math.abs(new Date(latest.test_date).getTime() - new Date(earliest.test_date).getTime()) / (1000 * 60 * 60 * 24);
          if (days > 0) {
            const diff = parseFloat(latest.value) - parseFloat(earliest.value);
            rateOfChange = `${(diff / days).toFixed(3)} ${latest.unit || ''}/day`;
          }
        }

        let persistentAbnormality = false;
        let consecutiveCount = 0;
        for (const res of markerResults) {
          if (res.abnormal_flag) {
            consecutiveCount++;
            if (consecutiveCount >= 2) {
              persistentAbnormality = true;
            }
          } else {
            consecutiveCount = 0;
          }
        }

        panelData[marker.toUpperCase()] = {
          latest: `${latest.value} ${latest.unit || ''}`,
          highest: `${highest} ${latest.unit || ''}`,
          lowest: `${lowest} ${latest.unit || ''}`,
          median: `${median} ${latest.unit || ''}`,
          rate_of_change: rateOfChange,
          persistent_abnormality: persistentAbnormality,
          points: markerResults.map(r => ({ date: r.test_date, value: r.value }))
        };
      }

      if (Object.keys(panelData).length > 0) {
        panels[panelName] = panelData;
      }
    }

    return panels;
  }

  /**
   * Memory Compression (Phase 6)
   * Generates a compact Patient Memory summary used as default context.
   */
  public static async generateCompressedMemory(
    patientId: string,
    dbClient: any,
    isDemo: boolean = false
  ): Promise<string> {
    try {
      let patient = null;
      let nodes: GraphNode[] = [];
      if (isDemo) {
        patient = dbClient.query('patients').select().eq('id', patientId).single().data;
        nodes = dbClient.query('graph_nodes').select().eq('patient_id', patientId).data || [];
      } else {
        const { data: pat } = await dbClient.from('patients').select('*').eq('id', patientId).single();
        const { data } = await dbClient.from('graph_nodes').select('*').eq('patient_id', patientId);
        patient = pat;
        nodes = data || [];
      }

      const currentMeds = nodes
        .filter(n => n.entity_type === 'Medication' && (!n.properties?.end_date || n.properties?.duration?.toLowerCase().includes('ongoing') || n.properties?.duration?.toLowerCase().includes('chronic')))
        .map(n => `${n.canonical_name} (${n.properties?.strength || 'N/A'})`);

      const currentDiseases = nodes
        .filter(n => n.entity_type === 'Diagnosis' && n.properties?.is_chronic === true)
        .map(n => n.canonical_name);

      const resolvedDiseases = nodes
        .filter(n => n.entity_type === 'Diagnosis' && n.properties?.verification_status?.toLowerCase().includes('resolved'))
        .map(n => n.canonical_name);

      const allergies = patient?.known_allergies || [];
      
      const memoryString = `
[PATIENT COMPACT CLINICAL MEMORY]
Patient Name: ${patient?.full_name || 'Patient'}
Age/DOB: ${patient?.date_of_birth || 'N/A'}
Blood Group: ${patient?.blood_group || 'N/A'}

Active Chronic Conditions:
${currentDiseases.map(d => `- ${d}`).join('\n') || 'None'}

Resolved Conditions:
${resolvedDiseases.map(d => `- ${d}`).join('\n') || 'None'}

Active Long-term Medications:
${currentMeds.map(m => `- ${m}`).join('\n') || 'None'}

Known Allergies:
${allergies.map(a => `- ${a}`).join('\n') || 'None'}
`;
      return memoryString.trim();
    } catch (err) {
      console.error('Failed to generate compressed patient memory:', err);
      return '';
    }
  }
}

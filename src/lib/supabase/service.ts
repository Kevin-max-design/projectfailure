import { createClient as createBrowserClient } from './client';
export { DEMO_PATIENT, DEMO_DOCUMENTS } from '../extraction/demo-data';
import { DEMO_PATIENT, DEMO_DOCUMENTS } from '../extraction/demo-data';
import { isDemoMode, isSupabaseConfigured } from '../mode';

export { isSupabaseConfigured };

// In-memory/local storage database fallback for demo mode
class MockDatabase {
  private getStorage(key: string): any[] {
    if (typeof window === 'undefined') return [];
    const val = localStorage.getItem(`medmemory_${key}`);
    return val ? JSON.parse(val) : [];
  }

  private setStorage(key: string, data: any[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`medmemory_${key}`, JSON.stringify(data));
  }

  // Auto seed on initialization
  constructor() {
    if (!isDemoMode()) {
      return; // Do not use mock database in production mode
    }
    if (typeof window !== 'undefined') {
      const seeded = localStorage.getItem('medmemory_seeded');
      if (!seeded) {
        // Seed Patient
        this.setStorage('patients', [DEMO_PATIENT]);
        
        // Seed Documents
        const docs = DEMO_DOCUMENTS.map(doc => ({
          id: doc.id,
          patient_id: DEMO_PATIENT.id,
          file_name: doc.fileName,
          file_size: 1542000,
          mime_type: doc.fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
          storage_path: `documents/${doc.id}`,
          category: doc.category,
          processing_status: 'completed',
          created_at: new Date(doc.date).toISOString(),
          updated_at: new Date(doc.date).toISOString()
        }));
        this.setStorage('documents', docs);

        // Seed raw extractions
        const extractions = DEMO_DOCUMENTS.map(doc => ({
          id: `raw-${doc.id}`,
          document_id: doc.id,
          patient_id: DEMO_PATIENT.id,
          raw_payload: doc.extraction,
          extraction_method: 'demo',
          created_at: new Date(doc.date).toISOString()
        }));
        this.setStorage('raw_extractions', extractions);

        // Seed medical records
        const records: any[] = [];
        const diagnoses: any[] = [];
        const medications: any[] = [];
        const labResults: any[] = [];
        const procedures: any[] = [];
        const events: any[] = [];

        DEMO_DOCUMENTS.forEach(doc => {
          const ext = doc.extraction;
          const date = ext.documentDate.value || doc.date;

          // Diagnoses
          ext.diagnoses?.forEach((dx: any, i: number) => {
            const recordId = `rec-dx-${doc.id}-${i}`;
            records.push({
              id: recordId,
              patient_id: DEMO_PATIENT.id,
              document_id: doc.id,
              record_type: 'diagnosis',
              title: dx.name,
              event_date: date,
              created_at: new Date(date).toISOString()
            });

            diagnoses.push({
              id: `dx-${doc.id}-${i}`,
              patient_id: DEMO_PATIENT.id,
              record_id: recordId,
              name: dx.name,
              onset_weeks: dx.onsetWeeks,
              is_chronic: dx.isChronic,
              notes: dx.notes,
              source_document_id: doc.id,
              source_page: dx.page || 1,
              source_text: dx.sourceText,
              extraction_method: 'demo',
              confidence_score: dx.confidence,
              verification_status: 'verified' // default seeded as verified
            });

            events.push({
              id: `ev-dx-${doc.id}-${i}`,
              patient_id: DEMO_PATIENT.id,
              event_date: date,
              event_type: 'Diagnosis',
              title: `Diagnosed with ${dx.name}`,
              summary: dx.notes || 'Diagnosis verified.',
              source_document_id: doc.id,
              verification_status: 'verified'
            });
          });

          // Medications
          ext.medications?.forEach((med: any, i: number) => {
            const recordId = `rec-med-${doc.id}-${i}`;
            records.push({
              id: recordId,
              patient_id: DEMO_PATIENT.id,
              document_id: doc.id,
              record_type: 'medication',
              title: med.medicineName,
              event_date: date,
              created_at: new Date(date).toISOString()
            });

            medications.push({
              id: `med-${doc.id}-${i}`,
              patient_id: DEMO_PATIENT.id,
              record_id: recordId,
              medicine_name: med.medicineName,
              generic_name: med.genericName,
              strength: med.strength,
              dosage: med.dosage,
              route: med.route,
              frequency: med.frequency,
              duration: med.duration,
              instructions: med.instructions,
              start_date: med.startDate,
              end_date: med.endDate,
              reason: med.reason,
              source_document_id: doc.id,
              source_page: med.page || 1,
              source_text: med.sourceText,
              extraction_method: 'demo',
              confidence_score: med.confidence,
              verification_status: 'verified'
            });

            events.push({
              id: `ev-med-${doc.id}-${i}`,
              patient_id: DEMO_PATIENT.id,
              event_date: date,
              event_type: 'Medication Start',
              title: `Started Medication: ${med.medicineName}`,
              summary: `Dosage: ${med.dosage || ''} ${med.strength || ''}. Frequency: ${med.frequency || ''}.`,
              source_document_id: doc.id,
              verification_status: 'verified'
            });
          });

          // Lab Results
          ext.labResults?.forEach((lab: any, i: number) => {
            const recordId = `rec-lab-${doc.id}-${i}`;
            records.push({
              id: recordId,
              patient_id: DEMO_PATIENT.id,
              document_id: doc.id,
              record_type: 'lab_result',
              title: lab.testName,
              event_date: lab.date || date,
              created_at: new Date(date).toISOString()
            });

            labResults.push({
              id: `lab-${doc.id}-${i}`,
              patient_id: DEMO_PATIENT.id,
              record_id: recordId,
              test_name: lab.testName,
              value: lab.value,
              unit: lab.unit,
              reference_range: lab.referenceRange,
              abnormal_flag: lab.abnormalFlag,
              test_date: lab.date || date,
              source_document_id: doc.id,
              source_page: lab.page || 1,
              source_text: lab.sourceText,
              extraction_method: 'demo',
              confidence_score: lab.confidence,
              verification_status: 'verified'
            });

            events.push({
              id: `ev-lab-${doc.id}-${i}`,
              patient_id: DEMO_PATIENT.id,
              event_date: lab.date || date,
              event_type: 'Lab Test',
              title: `Lab Result: ${lab.testName}`,
              summary: `Result: ${lab.value} ${lab.unit || ''} (Ref Range: ${lab.referenceRange || 'N/A'}). ${lab.abnormalFlag ? 'Flagged as ABNORMAL.' : ''}`,
              source_document_id: doc.id,
              verification_status: 'verified'
            });
          });

          // Procedures
          ext.procedures?.forEach((proc: any, i: number) => {
            const recordId = `rec-proc-${doc.id}-${i}`;
            records.push({
              id: recordId,
              patient_id: DEMO_PATIENT.id,
              document_id: doc.id,
              record_type: 'procedure',
              title: proc.name,
              event_date: proc.date || date,
              created_at: new Date(date).toISOString()
            });

            procedures.push({
              id: `proc-${doc.id}-${i}`,
              patient_id: DEMO_PATIENT.id,
              record_id: recordId,
              name: proc.name,
              date: proc.date || date,
              surgeon_name: proc.surgeonName,
              notes: proc.notes,
              source_document_id: doc.id,
              source_page: proc.page || 1,
              source_text: proc.sourceText,
              extraction_method: 'demo',
              confidence_score: proc.confidence,
              verification_status: 'verified'
            });

            events.push({
              id: `ev-proc-${doc.id}-${i}`,
              patient_id: DEMO_PATIENT.id,
              event_date: proc.date || date,
              event_type: 'Procedure',
              title: `Procedure: ${proc.name}`,
              summary: proc.notes || 'Procedure verified.',
              source_document_id: doc.id,
              verification_status: 'verified'
            });
          });
        });

        this.setStorage('medical_records', records);
        this.setStorage('diagnoses', diagnoses);
        this.setStorage('medications', medications);
        this.setStorage('lab_results', labResults);
        this.setStorage('procedures', procedures);
        this.setStorage('medical_events', events);
        this.setStorage('activity_logs', []);
        this.setStorage('verification_history', []);
        this.setStorage('emergency_tokens', [{
          id: 'token-1',
          patient_id: DEMO_PATIENT.id,
          token: 'demo-active-token-12345',
          is_enabled: true,
          created_at: new Date().toISOString()
        }]);
        this.setStorage('medical_help_sessions', []);
        this.setStorage('doctor_briefs', []);
        this.setStorage('medical_share_tokens', []);
        this.setStorage('emergency_profile_config', [{
          id: 'config-1',
          patient_id: DEMO_PATIENT.id,
          show_name: true,
          show_blood_group: true,
          show_allergies: true,
          show_conditions: true,
          show_medications: true,
          show_contact: true,
          show_surgeries: true,
          show_hospitalizations: true
        }]);

        localStorage.setItem('medmemory_seeded', 'true');
      }
    }
  }

  // CRUD Operations mimicking Supabase Client
  query(table: string) {
    const data = this.getStorage(table);
    return {
      select: (fields?: string) => {
        return {
          eq: (column: string, value: any) => {
            const filtered = data.filter(item => item[column] === value);
            return {
              single: () => ({ data: filtered[0] || null, error: null }),
              data: filtered,
              error: null
            };
          },
          order: (column: string, options?: { ascending: boolean }) => {
            const sorted = [...data].sort((a, b) => {
              const valA = a[column];
              const valB = b[column];
              if (options?.ascending) {
                return valA > valB ? 1 : -1;
              }
              return valA < valB ? 1 : -1;
            });
            return {
              eq: (columnName: string, val: any) => ({
                data: sorted.filter(item => item[columnName] === val),
                error: null
              }),
              data: sorted,
              error: null
            };
          },
          data: data,
          error: null
        };
      },
      insert: (payload: any) => {
        const current = this.getStorage(table);
        const rows = Array.isArray(payload) ? payload : [payload];
        const newRows = rows.map(r => ({ id: r.id || Math.random().toString(36).substring(7), ...r }));
        this.setStorage(table, [...current, ...newRows]);
        return {
          select: () => ({
            single: () => ({ data: newRows[0], error: null }),
            data: newRows,
            error: null
          }),
          data: newRows,
          error: null
        };
      },
      update: (payload: any) => {
        return {
          eq: (column: string, value: any) => {
            const current = this.getStorage(table);
            const updated = current.map(item => {
              if (item[column] === value) {
                return { ...item, ...payload };
              }
              return item;
            });
            this.setStorage(table, updated);
            return { data: updated.filter(item => item[column] === value), error: null };
          }
        };
      },
      delete: () => {
        return {
          eq: (column: string, value: any) => {
            const current = this.getStorage(table);
            const filtered = current.filter(item => item[column] !== value);
            this.setStorage(table, filtered);
            return { data: null, error: null };
          }
        };
      }
    };
  }
}

export const mockDb = new MockDatabase();
export const mockUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'arjun.rao@medmemory.demo',
  user_metadata: {
    full_name: 'Arjun Rao'
  }
};

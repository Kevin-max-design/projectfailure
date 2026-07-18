import { VerificationStatus } from '@/types';
import { mockDb } from '../supabase/service';

export class TimelineGenerator {
  /**
   * Syncs timeline events for a given patient based on verified medical records.
   * Ensures verified medical records are represented cleanly in the medical_events timeline.
   */
  static async syncTimelineEventForRecord(
    recordId: string,
    recordType: 'diagnosis' | 'medication' | 'lab_result' | 'procedure',
    patientId: string
  ): Promise<void> {
    if (typeof window !== 'undefined') {
      // Client-side Mock Database implementation
      if (recordType === 'diagnosis') {
        const dx = mockDb.query('diagnoses').select().eq('record_id', recordId).single().data;
        if (dx && dx.verification_status === 'verified') {
          mockDb.query('medical_events').insert({
            patient_id: patientId,
            event_date: new Date().toISOString().split('T')[0], // fallback or document date
            event_type: 'Diagnosis',
            title: `Diagnosed with ${dx.name}`,
            summary: dx.notes || 'Diagnosis verified.',
            source_document_id: dx.source_document_id,
            verification_status: 'verified'
          });
        }
      } else if (recordType === 'medication') {
        const med = mockDb.query('medications').select().eq('record_id', recordId).single().data;
        if (med && med.verification_status === 'verified') {
          mockDb.query('medical_events').insert({
            patient_id: patientId,
            event_date: new Date().toISOString().split('T')[0],
            event_type: 'Medication Start',
            title: `Started Medication: ${med.medicine_name}`,
            summary: `Dosage: ${med.dosage || ''} ${med.strength || ''}. Frequency: ${med.frequency || ''}. Route: ${med.route || ''}. Duration: ${med.duration || ''}.`,
            source_document_id: med.source_document_id,
            verification_status: 'verified'
          });
        }
      } else if (recordType === 'lab_result') {
        const lab = mockDb.query('lab_results').select().eq('record_id', recordId).single().data;
        if (lab && lab.verification_status === 'verified') {
          mockDb.query('medical_events').insert({
            patient_id: patientId,
            event_date: lab.test_date || new Date().toISOString().split('T')[0],
            event_type: 'Lab Test',
            title: `Lab Result: ${lab.test_name}`,
            summary: `Result: ${lab.value} ${lab.unit || ''} (Ref Range: ${lab.reference_range || 'N/A'}). ${lab.abnormal_flag ? 'Flagged as ABNORMAL.' : ''}`,
            source_document_id: lab.source_document_id,
            verification_status: 'verified'
          });
        }
      } else if (recordType === 'procedure') {
        const proc = mockDb.query('procedures').select().eq('record_id', recordId).single().data;
        if (proc && proc.verification_status === 'verified') {
          mockDb.query('medical_events').insert({
            patient_id: patientId,
            event_date: proc.date || new Date().toISOString().split('T')[0],
            event_type: 'Procedure',
            title: `Procedure: ${proc.name}`,
            summary: proc.notes || 'Procedure verified.',
            source_document_id: proc.source_document_id,
            verification_status: 'verified'
          });
        }
      }
    }
  }

  /**
   * Log verification update in the verification_history and log activity
   */
  static async recordVerificationAction(params: {
    patientId: string;
    recordId: string;
    entityType: 'diagnoses' | 'medications' | 'lab_results' | 'procedures';
    fieldName: string;
    oldValue: string | null;
    newValue: string | null;
    actionType: 'confirm' | 'correct' | 'reject' | 'unreadable';
    verifiedBy: string;
  }) {
    if (typeof window !== 'undefined') {
      // Client-side Mock Database implementation
      mockDb.query('verification_history').insert({
        patient_id: params.patientId,
        record_id: params.recordId,
        entity_type: params.entityType,
        field_name: params.fieldName,
        old_value: params.oldValue,
        new_value: params.newValue,
        action_type: params.actionType,
        verified_by: params.verifiedBy
      });

      mockDb.query('activity_logs').insert({
        patient_id: params.patientId,
        action: 'record_edited',
        metadata: {
          record_id: params.recordId,
          entity_type: params.entityType,
          field_name: params.fieldName,
          action_type: params.actionType
        }
      });
    }
  }
}

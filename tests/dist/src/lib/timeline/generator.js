"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelineGenerator = void 0;
const service_1 = require("../supabase/service");
class TimelineGenerator {
    /**
     * Syncs timeline events for a given patient based on verified medical records.
     * Ensures verified medical records are represented cleanly in the medical_events timeline.
     */
    static async syncTimelineEventForRecord(recordId, recordType, patientId) {
        if (typeof window !== 'undefined') {
            let sourceDocId = null;
            if (recordType === 'diagnosis') {
                const r = service_1.mockDb.query('diagnoses').select().eq('record_id', recordId).single().data;
                sourceDocId = (r === null || r === void 0 ? void 0 : r.source_document_id) || null;
            }
            else if (recordType === 'medication') {
                const r = service_1.mockDb.query('medications').select().eq('record_id', recordId).single().data;
                sourceDocId = (r === null || r === void 0 ? void 0 : r.source_document_id) || null;
            }
            else if (recordType === 'lab_result') {
                const r = service_1.mockDb.query('lab_results').select().eq('record_id', recordId).single().data;
                sourceDocId = (r === null || r === void 0 ? void 0 : r.source_document_id) || null;
            }
            else if (recordType === 'procedure') {
                const r = service_1.mockDb.query('procedures').select().eq('record_id', recordId).single().data;
                sourceDocId = (r === null || r === void 0 ? void 0 : r.source_document_id) || null;
            }
            if (sourceDocId) {
                const doc = service_1.mockDb.query('documents').select().eq('id', sourceDocId).single().data;
                const docTypeUpper = ((doc === null || doc === void 0 ? void 0 : doc.document_type) || (doc === null || doc === void 0 ? void 0 : doc.documentType) || (doc === null || doc === void 0 ? void 0 : doc.category) || '').toUpperCase();
                if (['PHARMACY_INVOICE', 'OP_BILL_RECEIPT'].includes(docTypeUpper)) {
                    return;
                }
            }
            // Client-side Mock Database implementation
            if (recordType === 'diagnosis') {
                const dx = service_1.mockDb.query('diagnoses').select().eq('record_id', recordId).single().data;
                if (dx && dx.verification_status === 'verified') {
                    service_1.mockDb.query('medical_events').insert({
                        patient_id: patientId,
                        event_date: new Date().toISOString().split('T')[0], // fallback or document date
                        event_type: 'Diagnosis',
                        title: `Diagnosed with ${dx.name}`,
                        summary: dx.notes || 'Diagnosis verified.',
                        source_document_id: dx.source_document_id,
                        verification_status: 'verified'
                    });
                }
            }
            else if (recordType === 'medication') {
                const med = service_1.mockDb.query('medications').select().eq('record_id', recordId).single().data;
                if (med && med.verification_status === 'verified') {
                    service_1.mockDb.query('medical_events').insert({
                        patient_id: patientId,
                        event_date: new Date().toISOString().split('T')[0],
                        event_type: 'Medication Start',
                        title: `Started Medication: ${med.medicine_name}`,
                        summary: `Dosage: ${med.dosage || ''} ${med.strength || ''}. Frequency: ${med.frequency || ''}. Route: ${med.route || ''}. Duration: ${med.duration || ''}.`,
                        source_document_id: med.source_document_id,
                        verification_status: 'verified'
                    });
                }
            }
            else if (recordType === 'lab_result') {
                const lab = service_1.mockDb.query('lab_results').select().eq('record_id', recordId).single().data;
                if (lab && lab.verification_status === 'verified') {
                    service_1.mockDb.query('medical_events').insert({
                        patient_id: patientId,
                        event_date: lab.test_date || new Date().toISOString().split('T')[0],
                        event_type: 'Lab Test',
                        title: `Lab Result: ${lab.test_name}`,
                        summary: `Result: ${lab.value} ${lab.unit || ''} (Ref Range: ${lab.reference_range || 'N/A'}). ${lab.abnormal_flag ? 'Flagged as ABNORMAL.' : ''}`,
                        source_document_id: lab.source_document_id,
                        verification_status: 'verified'
                    });
                }
            }
            else if (recordType === 'procedure') {
                const proc = service_1.mockDb.query('procedures').select().eq('record_id', recordId).single().data;
                if (proc && proc.verification_status === 'verified') {
                    service_1.mockDb.query('medical_events').insert({
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
    static async recordVerificationAction(params) {
        if (typeof window !== 'undefined') {
            // Client-side Mock Database implementation
            service_1.mockDb.query('verification_history').insert({
                patient_id: params.patientId,
                record_id: params.recordId,
                entity_type: params.entityType,
                field_name: params.fieldName,
                old_value: params.oldValue,
                new_value: params.newValue,
                action_type: params.actionType,
                verified_by: params.verifiedBy
            });
            service_1.mockDb.query('activity_logs').insert({
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
exports.TimelineGenerator = TimelineGenerator;

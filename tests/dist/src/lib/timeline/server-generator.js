"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerTimelineGenerator = void 0;
const server_1 = require("../supabase/server");
class ServerTimelineGenerator {
    static async syncTimelineEventForRecord(recordId, recordType, patientId) {
        const supabase = (0, server_1.createAdminClient)();
        let sourceDocId = null;
        if (recordType === 'diagnosis') {
            const { data: r } = await supabase.from('diagnoses').select('source_document_id').eq('record_id', recordId).single();
            sourceDocId = (r === null || r === void 0 ? void 0 : r.source_document_id) || null;
        }
        else if (recordType === 'medication') {
            const { data: r } = await supabase.from('medications').select('source_document_id').eq('record_id', recordId).single();
            sourceDocId = (r === null || r === void 0 ? void 0 : r.source_document_id) || null;
        }
        else if (recordType === 'lab_result') {
            const { data: r } = await supabase.from('lab_results').select('source_document_id').eq('record_id', recordId).single();
            sourceDocId = (r === null || r === void 0 ? void 0 : r.source_document_id) || null;
        }
        else if (recordType === 'procedure') {
            const { data: r } = await supabase.from('procedures').select('source_document_id').eq('record_id', recordId).single();
            sourceDocId = (r === null || r === void 0 ? void 0 : r.source_document_id) || null;
        }
        if (sourceDocId) {
            const { data: doc } = await supabase.from('documents').select('document_type, category').eq('id', sourceDocId).single();
            const docTypeUpper = ((doc === null || doc === void 0 ? void 0 : doc.document_type) || (doc === null || doc === void 0 ? void 0 : doc.category) || '').toUpperCase();
            if (['PHARMACY_INVOICE', 'OP_BILL_RECEIPT'].includes(docTypeUpper)) {
                return;
            }
        }
        if (recordType === 'diagnosis') {
            const { data: dx } = await supabase
                .from('diagnoses')
                .select('*, medical_records(title, event_date, document_id)')
                .eq('record_id', recordId)
                .single();
            if (dx && dx.verification_status === 'verified') {
                await supabase.from('medical_events').insert({
                    patient_id: patientId,
                    event_date: dx.medical_records.event_date,
                    event_type: 'Diagnosis',
                    title: `Diagnosed with ${dx.name}`,
                    summary: dx.notes || 'Diagnosis verified.',
                    source_document_id: dx.source_document_id,
                    verification_status: 'verified'
                });
            }
        }
        else if (recordType === 'medication') {
            const { data: med } = await supabase
                .from('medications')
                .select('*, medical_records(title, event_date, document_id)')
                .eq('record_id', recordId)
                .single();
            if (med && med.verification_status === 'verified') {
                await supabase.from('medical_events').insert({
                    patient_id: patientId,
                    event_date: med.medical_records.event_date,
                    event_type: 'Medication Start',
                    title: `Started Medication: ${med.medicine_name}`,
                    summary: `Dosage: ${med.dosage || ''} ${med.strength || ''}. Frequency: ${med.frequency || ''}. Route: ${med.route || ''}. Duration: ${med.duration || ''}.`,
                    source_document_id: med.source_document_id,
                    verification_status: 'verified'
                });
            }
        }
        else if (recordType === 'lab_result') {
            const { data: lab } = await supabase
                .from('lab_results')
                .select('*, medical_records(title, event_date, document_id)')
                .eq('record_id', recordId)
                .single();
            if (lab && lab.verification_status === 'verified') {
                await supabase.from('medical_events').insert({
                    patient_id: patientId,
                    event_date: lab.medical_records.event_date,
                    event_type: 'Lab Test',
                    title: `Lab Result: ${lab.test_name}`,
                    summary: `Result: ${lab.value} ${lab.unit || ''} (Ref Range: ${lab.reference_range || 'N/A'}). ${lab.abnormal_flag ? 'Flagged as ABNORMAL.' : ''}`,
                    source_document_id: lab.source_document_id,
                    verification_status: 'verified'
                });
            }
        }
        else if (recordType === 'procedure') {
            const { data: proc } = await supabase
                .from('procedures')
                .select('*, medical_records(title, event_date, document_id)')
                .eq('record_id', recordId)
                .single();
            if (proc && proc.verification_status === 'verified') {
                await supabase.from('medical_events').insert({
                    patient_id: patientId,
                    event_date: proc.medical_records.event_date,
                    event_type: 'Procedure',
                    title: `Procedure: ${proc.name}`,
                    summary: proc.notes || 'Procedure verified.',
                    source_document_id: proc.source_document_id,
                    verification_status: 'verified'
                });
            }
        }
    }
    static async recordVerificationAction(params) {
        const supabase = (0, server_1.createAdminClient)();
        await supabase.from('verification_history').insert({
            patient_id: params.patientId,
            record_id: params.recordId,
            entity_type: params.entityType,
            field_name: params.fieldName,
            old_value: params.oldValue,
            new_value: params.newValue,
            action_type: params.actionType,
            verified_by: params.verifiedBy
        });
        await supabase.from('activity_logs').insert({
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
exports.ServerTimelineGenerator = ServerTimelineGenerator;

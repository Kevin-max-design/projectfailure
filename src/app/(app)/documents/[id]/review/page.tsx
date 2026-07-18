'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Check, 
  X, 
  HelpCircle, 
  Edit2, 
  FileText, 
  AlertTriangle,
  FileWarning
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { mockDb } from '@/lib/supabase/service';
import { TimelineGenerator } from '@/lib/timeline/generator';
import { isDemoMode } from '@/lib/mode';

export default function VerificationScreen() {
  const params = useParams();
  const router = useRouter();
  const docId = params.id as string;

  const [document, setDocument] = useState<any>(null);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [labResults, setLabResults] = useState<any[]>([]);
  const [procedures, setProcedures] = useState<any[]>([]);
  const [signedUrl, setSignedUrl] = useState<string>('');

  // Edit forms/overlay state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<string>('');
  const [editValue, setEditValue] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [docId]);

  const loadData = async () => {
    if (isDemoMode()) {
      const docRes = mockDb.query('documents').select().eq('id', docId).single();
      if (!docRes.data || docRes.data.is_deleted) {
        router.push('/app/documents');
        return;
      }
      setDocument(docRes.data);
      loadEntities();
    } else {
      try {
        const response = await fetch(`/api/documents/${docId}`);
        if (!response.ok) {
          router.push('/app/documents');
          return;
        }

        const data = await response.json();
        setDocument(data.document);

        // Fetch related entities from Supabase
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        const { data: dx } = await supabase.from('diagnoses').select('*').eq('source_document_id', docId);
        setDiagnoses(dx || []);

        const { data: med } = await supabase.from('medications').select('*').eq('source_document_id', docId);
        setMedications(med || []);

        const { data: lab } = await supabase.from('lab_results').select('*').eq('source_document_id', docId);
        setLabResults(lab || []);

        const { data: proc } = await supabase.from('procedures').select('*').eq('source_document_id', docId);
        setProcedures(proc || []);

        // Load signed URL for viewing document side-by-side
        const urlRes = await fetch(`/api/documents/${docId}/signed-url`);
        if (urlRes.ok) {
          const urlData = await urlRes.json();
          setSignedUrl(urlData.signedUrl);
        }

      } catch (err) {
        console.error('Failed to load review data:', err);
      }
    }
  };

  const loadEntities = () => {
    if (isDemoMode()) {
      const dxRes = mockDb.query('diagnoses').select().eq('source_document_id', docId);
      setDiagnoses(dxRes.data || []);

      const medRes = mockDb.query('medications').select().eq('source_document_id', docId);
      setMedications(medRes.data || []);

      const labRes = mockDb.query('lab_results').select().eq('source_document_id', docId);
      setLabResults(labRes.data || []);

      const procRes = mockDb.query('procedures').select().eq('source_document_id', docId);
      setProcedures(procRes.data || []);
    }
  };

  const handleAction = async (
    recordId: string,
    type: 'diagnosis' | 'medication' | 'lab_result' | 'procedure',
    table: 'diagnoses' | 'medications' | 'lab_results' | 'procedures',
    action: 'confirm' | 'reject' | 'unreadable',
    fieldName = 'name'
  ) => {
    if (isDemoMode()) {
      const patientProfile = typeof window !== 'undefined' ? localStorage.getItem('medmemory_patient_profile') : null;
      const patientId = patientProfile ? JSON.parse(patientProfile).id : '00000000-0000-0000-0000-000000000001';

      const status = 
        action === 'confirm' ? 'verified' : 
        action === 'reject' ? 'rejected' : 'unreadable';

      // Update entity
      mockDb.query(table).update({ verification_status: status }).eq('record_id', recordId);
      
      // Add verification history audit log
      await TimelineGenerator.recordVerificationAction({
        patientId,
        recordId,
        entityType: table,
        fieldName,
        oldValue: 'pending_review',
        newValue: status,
        actionType: action,
        verifiedBy: patientId
      });

      // Sync timeline event if confirmed
      if (action === 'confirm') {
        await TimelineGenerator.syncTimelineEventForRecord(recordId, type, patientId);
      }

      loadEntities();
    } else {
      try {
        const response = await fetch(`/api/documents/${docId}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recordId,
            entityType: table,
            action,
            fieldName,
            oldValue: 'pending_review',
            newValue: action === 'confirm' ? 'verified' : action === 'reject' ? 'rejected' : 'unreadable'
          })
        });

        if (response.ok) {
          loadData();
        }
      } catch (err) {
        console.error('Failed to verify record:', err);
      }
    }
  };

  const handleSaveCorrection = async () => {
    if (!editingId) return;

    const table = 
      editingType === 'diagnosis' ? 'diagnoses' :
      editingType === 'medication' ? 'medications' :
      editingType === 'lab_result' ? 'lab_results' : 'procedures';

    const fieldName = 
      editingType === 'medication' ? 'medicine_name' :
      editingType === 'lab_result' ? 'test_name' : 'name';

    if (isDemoMode()) {
      const patientProfile = typeof window !== 'undefined' ? localStorage.getItem('medmemory_patient_profile') : null;
      const patientId = patientProfile ? JSON.parse(patientProfile).id : '00000000-0000-0000-0000-000000000001';

      // Update entity
      mockDb.query(table).update({ 
        [fieldName]: editValue,
        verification_status: 'corrected' 
      }).eq('record_id', editingId);

      // Sync title of base medical record
      mockDb.query('medical_records').update({ title: editValue }).eq('id', editingId);

      // Log history
      await TimelineGenerator.recordVerificationAction({
        patientId,
        recordId: editingId,
        entityType: table,
        fieldName,
        oldValue: 'AI Output',
        newValue: editValue,
        actionType: 'correct',
        verifiedBy: patientId
      });

      // Create synchronized timeline event
      await TimelineGenerator.syncTimelineEventForRecord(editingId, editingType as any, patientId);

      setEditingId(null);
      loadEntities();
    } else {
      try {
        const response = await fetch(`/api/documents/${docId}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recordId: editingId,
            entityType: table,
            action: 'correct',
            fieldName,
            oldValue: 'AI Output',
            newValue: editValue
          })
        });

        if (response.ok) {
          setEditingId(null);
          loadData();
        }
      } catch (err) {
        console.error('Failed to correct record:', err);
      }
    }
  };

  const handleCompleteReview = async () => {
    if (isDemoMode()) {
      // Set document status as completed
      mockDb.query('documents').update({ processing_status: 'completed' }).eq('id', docId);
      
      // Auto confirm remaining items as verified for convenience
      diagnoses.forEach(dx => {
        if (dx.verification_status === 'pending_review') {
          handleAction(dx.record_id, 'diagnosis', 'diagnoses', 'confirm');
        }
      });

      medications.forEach(med => {
        if (med.verification_status === 'pending_review') {
          handleAction(med.record_id, 'medication', 'medications', 'confirm', 'medicine_name');
        }
      });

      labResults.forEach(lab => {
        if (lab.verification_status === 'pending_review') {
          handleAction(lab.record_id, 'lab_result', 'lab_results', 'confirm', 'test_name');
        }
      });

      router.push(`/app/documents/${docId}`);
    } else {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        // 1. Mark document status as completed
        await supabase
          .from('documents')
          .update({ processing_status: 'completed' })
          .eq('id', docId);

        // 2. Auto confirm any remaining unverified items
        for (const dx of diagnoses) {
          if (dx.verification_status === 'pending_review') {
            await handleAction(dx.record_id, 'diagnosis', 'diagnoses', 'confirm');
          }
        }

        for (const med of medications) {
          if (med.verification_status === 'pending_review') {
            await handleAction(med.record_id, 'medication', 'medications', 'confirm', 'medicine_name');
          }
        }

        for (const lab of labResults) {
          if (lab.verification_status === 'pending_review') {
            await handleAction(lab.record_id, 'lab_result', 'lab_results', 'confirm', 'test_name');
          }
        }

        router.push(`/app/documents/${docId}`);
      } catch (err) {
        console.error('Failed to complete review:', err);
      }
    }
  };

  if (!document) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      </AppShell>
    );
  }

  const fileName = document.file_name || document.fileName || 'document';

  return (
    <AppShell>
      <div className="space-y-8">
        
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-center space-x-3">
            <Link href={`/app/documents/${docId}`} className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-slate-850 dark:hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Verify Extracted Records</h1>
              <p className="text-xs text-slate-500 mt-0.5">Grounding truth layer: Verify and correct AI output.</p>
            </div>
          </div>

          <button
            onClick={handleCompleteReview}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            Complete & Save Records
          </button>
        </div>

        {/* Side-by-side desktop / Stacked mobile grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left panel: Immutable original document viewer */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-slate-850 dark:text-slate-200 text-sm flex items-center">
              <FileText className="h-4 w-4 text-teal-600 mr-2" />
              Original Medical Record File
            </h3>

            <div className="aspect-[3/4] bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center overflow-hidden">
              {isDemoMode() || !signedUrl ? (
                <div className="p-6 text-center">
                  <FileText className="h-16 w-16 text-slate-350 dark:text-slate-650 mb-3 mx-auto" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 max-w-[250px] truncate block">{fileName}</span>
                  <p className="text-[10px] text-slate-400 mt-2 max-w-xs leading-relaxed mx-auto">
                    Use the side-by-side view to trace extracted snippets against original scanned prescriptions or lab summaries.
                  </p>
                </div>
              ) : document.mime_type === 'application/pdf' ? (
                <iframe
                  src={`${signedUrl}#toolbar=0`}
                  className="w-full h-full border-0"
                  title="PDF Viewer"
                />
              ) : (
                <img
                  src={signedUrl}
                  alt="Medical Document Preview"
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>

          {/* Right panel: Extracted entities Verification List */}
          <div className="space-y-6">
            
            {/* Diagnoses Verification */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-50 dark:border-slate-800 pb-2">
                1. Diagnoses Verification
              </h3>

              <div className="space-y-3">
                {diagnoses.map((dx) => {
                  const confidence = Number(dx.confidence_score || dx.confidence || 0);
                  return (
                    <div key={dx.id} className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{dx.name}</span>
                          <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full ${
                            confidence >= 0.90 ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/20' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20'
                          }`}>
                            {Math.round(confidence * 100)}% Match
                          </span>
                        </div>
                        {dx.source_text && (
                          <p className="text-[10px] text-slate-455 italic">
                            Snippet: "{dx.source_text}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 self-end md:self-auto">
                        <button
                          onClick={() => handleAction(dx.record_id, 'diagnosis', 'diagnoses', 'confirm')}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            dx.verification_status === 'verified'
                              ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400'
                              : 'border-slate-200 text-slate-450 hover:bg-slate-100 hover:text-teal-650'
                          }`}
                          title="Confirm diagnosis match"
                        >
                          <Check className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => {
                            setEditingId(dx.record_id);
                            setEditingType('diagnosis');
                            setEditValue(dx.name);
                          }}
                          className="p-1.5 border border-slate-200 text-slate-450 hover:bg-slate-100 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors"
                          title="Edit value"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleAction(dx.record_id, 'diagnosis', 'diagnoses', 'reject')}
                          className={`p-1.5 border transition-colors rounded-lg ${
                            dx.verification_status === 'rejected'
                              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400'
                              : 'border-slate-200 text-slate-450 hover:bg-red-50 hover:text-[#ef4444]'
                          }`}
                          title="Reject diagnosis"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {diagnoses.length === 0 && <p className="text-xs text-slate-400 italic">No diagnoses extracted.</p>}
              </div>
            </div>

            {/* Medications Verification */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-50 dark:border-slate-800 pb-2">
                2. Medications Verification
              </h3>

              <div className="space-y-3">
                {medications.map((med) => {
                  const confidence = Number(med.confidence_score || med.confidence || 0);
                  const medName = med.medicine_name || med.medicineName;
                  return (
                    <div key={med.id} className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-855 dark:text-slate-200 text-xs">
                            {medName} {med.strength ? `(${med.strength})` : ''}
                          </span>
                          <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full ${
                            confidence >= 0.90 ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/20' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20'
                          }`}>
                            {Math.round(confidence * 100)}% Match
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-550 dark:text-slate-400">
                          {med.dosage || ''} | {med.frequency || ''} | {med.instructions || ''}
                        </p>
                        {med.source_text && (
                          <p className="text-[10px] text-slate-455 italic">
                            Snippet: "{med.source_text}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 self-end md:self-auto">
                        <button
                          onClick={() => handleAction(med.record_id, 'medication', 'medications', 'confirm', 'medicine_name')}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            med.verification_status === 'verified'
                              ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400'
                              : 'border-slate-200 text-slate-450 hover:bg-slate-100 hover:text-teal-650'
                          }`}
                          title="Confirm medication match"
                        >
                          <Check className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => {
                            setEditingId(med.record_id);
                            setEditingType('medication');
                            setEditValue(medName);
                          }}
                          className="p-1.5 border border-slate-200 text-slate-450 hover:bg-slate-100 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors"
                          title="Edit value"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleAction(med.record_id, 'medication', 'medications', 'reject', 'medicine_name')}
                          className={`p-1.5 border transition-colors rounded-lg ${
                            med.verification_status === 'rejected'
                              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400'
                              : 'border-slate-200 text-slate-450 hover:bg-red-50 hover:text-[#ef4444]'
                          }`}
                          title="Reject medication"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {medications.length === 0 && <p className="text-xs text-slate-400 italic">No medications extracted.</p>}
              </div>
            </div>

            {/* Lab Results Verification */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-50 dark:border-slate-800 pb-2">
                3. Lab Results Verification
              </h3>

              <div className="space-y-3">
                {labResults.map((lab) => {
                  const confidence = Number(lab.confidence_score || lab.confidence || 0);
                  const labName = lab.test_name || lab.testName;
                  return (
                    <div key={lab.id} className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-855 dark:text-slate-200 text-xs">
                            {labName}: <span className={lab.abnormal_flag ? 'text-red-500 font-bold' : ''}>{lab.value} {lab.unit || ''}</span>
                          </span>
                          <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full ${
                            confidence >= 0.90 ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/20' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20'
                          }`}>
                            {Math.round(confidence * 100)}% Match
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Ref Range: {lab.reference_range || lab.referenceRange || 'N/A'}
                        </p>
                        {lab.source_text && (
                          <p className="text-[10px] text-slate-455 italic">
                            Snippet: "{lab.source_text}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 self-end md:self-auto">
                        <button
                          onClick={() => handleAction(lab.record_id, 'lab_result', 'lab_results', 'confirm', 'test_name')}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            lab.verification_status === 'verified'
                              ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400'
                              : 'border-slate-200 text-slate-450 hover:bg-slate-100 hover:text-teal-650'
                          }`}
                          title="Confirm lab result match"
                        >
                          <Check className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => {
                            setEditingId(lab.record_id);
                            setEditingType('lab_result');
                            setEditValue(labName);
                          }}
                          className="p-1.5 border border-slate-200 text-slate-450 hover:bg-slate-100 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors"
                          title="Edit value"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleAction(lab.record_id, 'lab_result', 'lab_results', 'reject', 'test_name')}
                          className={`p-1.5 border transition-colors rounded-lg ${
                            lab.verification_status === 'rejected'
                              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400'
                              : 'border-slate-200 text-slate-450 hover:bg-red-50 hover:text-[#ef4444]'
                          }`}
                          title="Reject lab result"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {labResults.length === 0 && <p className="text-xs text-slate-400 italic">No lab results extracted.</p>}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Editing Dialog Modal Overlay */}
      {editingId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full p-6 space-y-4">
            <h4 className="font-bold text-slate-850 dark:text-white text-sm">Correct Extracted Value</h4>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 block font-bold uppercase">Original suggestion value</label>
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-semibold"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setEditingId(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCorrection}
                className="px-3.5 py-1.5 bg-teal-650 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                Save Correction
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

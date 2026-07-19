'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  FileText, 
  Trash2, 
  Edit3, 
  Calendar, 
  Hospital, 
  UserRound,
  Download,
  AlertTriangle,
  Bookmark,
  RefreshCw
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { mockDb } from '@/lib/supabase/service';
import { formatDate, formatBytes } from '@/lib/utils';
import { isDemoMode } from '@/lib/mode';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.id as string;

  const [document, setDocument] = useState<any>(null);
  const [extraction, setExtraction] = useState<any>(null);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [labResults, setLabResults] = useState<any[]>([]);
  const [procedures, setProcedures] = useState<any[]>([]);
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [reprocessing, setReprocessing] = useState(false);

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

      const mockExtraction = {
        documentType: docRes.data.category || 'Discharge Summary',
        documentTitle: { value: docRes.data.file_name, confidence: 0.98, sourceText: docRes.data.file_name, page: 1 },
        documentDate: { value: '2026-05-12', confidence: 0.95, sourceText: 'Date of Discharge: 12 May 2026', page: 1 },
        hospitalName: { value: 'Apollo Hospital', confidence: 0.99, sourceText: 'APOLLO HEALTH CITY', page: 1 },
        doctorName: { value: 'Dr. Ramesh Kumar', confidence: 0.94, sourceText: 'Consultant: Dr. Ramesh Kumar', page: 1 },
        encounterDetails: {
          hospitalName: { value: 'Apollo Hospital', confidence: 0.99, sourceText: 'APOLLO HEALTH CITY', page: 1 },
          doctorName: { value: 'Dr. Ramesh Kumar', confidence: 0.94, sourceText: 'Consultant: Dr. Ramesh Kumar', page: 1 }
        }
      };
      setExtraction(mockExtraction);

      const dxRes = mockDb.query('diagnoses').select().eq('source_document_id', docId);
      setDiagnoses(dxRes.data || []);

      const medRes = mockDb.query('medications').select().eq('source_document_id', docId);
      setMedications(medRes.data || []);

      const labRes = mockDb.query('lab_results').select().eq('source_document_id', docId);
      setLabResults(labRes.data || []);

      const procRes = mockDb.query('procedures').select().eq('source_document_id', docId);
      setProcedures(procRes.data || []);
    } else {
      try {
        const response = await fetch(`/api/documents/${docId}`);
        if (!response.ok) {
          router.push('/app/documents');
          return;
        }

        const data = await response.json();
        setDocument(data.document);
        setExtraction(data.extraction);

        // Fetch related entities from Supabase via client client
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

        // Load signed URL for viewing original document
        const urlRes = await fetch(`/api/documents/${docId}/signed-url`);
        if (urlRes.ok) {
          const urlData = await urlRes.json();
          setSignedUrl(urlData.signedUrl);
        }

      } catch (err) {
        console.error('Failed to load document details:', err);
      }
    }
  };

  const handleReprocess = async () => {
    if (confirm('Warning: Re-running extraction will query the AI model again. Existing verified or corrected records will NOT be overwritten, but any new items discovered will be added for review. Continue?')) {
      setReprocessing(true);
      try {
        const res = await fetch(`/api/documents/${docId}/reprocess`, {
          method: 'POST'
        });
        if (res.ok) {
          alert('Reprocessing triggered in the background. Please wait...');
          // Poll for completion
          const interval = setInterval(async () => {
            const statusRes = await fetch(`/api/documents/${docId}/status`);
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.status === 'awaiting_review' || statusData.status === 'completed' || statusData.status === 'failed') {
                clearInterval(interval);
                setReprocessing(false);
                loadData();
              }
            }
          }, 2000);
        } else {
          alert('Failed to trigger reprocessing.');
          setReprocessing(false);
        }
      } catch (err) {
        console.error(err);
        setReprocessing(false);
      }
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this document?')) {
      if (isDemoMode()) {
        mockDb.query('documents').update({ is_deleted: true }).eq('id', docId);
        router.push('/app/documents');
      } else {
        try {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          await supabase
            .from('documents')
            .update({ is_deleted: true })
            .eq('id', docId);
          router.push('/app/documents');
        } catch (err) {
          console.error('Failed to delete document:', err);
        }
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

  // Calculate confidence categories
  const allConfidenceScores = [
    ...diagnoses.map(d => Number(d.confidence_score || d.confidence || 0)),
    ...medications.map(m => Number(m.confidence_score || m.confidence || 0)),
    ...labResults.map(l => Number(l.confidence_score || l.confidence || 0)),
    ...procedures.map(p => Number(p.confidence_score || p.confidence || 0))
  ];
  
  const averageConfidence = allConfidenceScores.length > 0
    ? (allConfidenceScores.reduce((a, b) => a + b, 0) / allConfidenceScores.length)
    : 1.0;

  const confidenceCategory = 
    averageConfidence >= 0.90 ? 'HIGH' :
    averageConfidence >= 0.65 ? 'MEDIUM' : 'LOW';

  const fileName = document.file_name || document.fileName || 'document';
  const fileSize = document.file_size || document.fileSize || 0;
  const createdAt = document.created_at || document.createdAt || '';
  const processingStatus = document.processing_status || document.processingStatus || 'completed';

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Back Link */}
        <Link href="/app/documents" className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Document Vault
        </Link>

        {/* Top Header Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-teal-50 dark:bg-teal-950/20 text-teal-650 rounded-2xl">
              <FileText className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate max-w-md">{fileName}</h1>
              <div className="flex flex-wrap gap-2 text-xs text-slate-400 mt-1 font-semibold">
                <span>{formatBytes(fileSize)}</span>
                <span>•</span>
                <span>Uploaded: {formatDate(createdAt)}</span>
                <span>•</span>
                <span className="text-teal-650">{document.category}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            {!isDemoMode() && (
              <button
                onClick={handleReprocess}
                disabled={reprocessing}
                className="flex items-center px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${reprocessing ? 'animate-spin' : ''}`} />
                {reprocessing ? 'Reprocessing...' : 'Re-run Extraction'}
              </button>
            )}

            {processingStatus === 'awaiting_review' ? (
              <Link
                href={`/app/documents/${docId}/review`}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors text-center flex-1 md:flex-initial"
              >
                Verify Extracted Data
              </Link>
            ) : (
              <div className="flex items-center text-teal-600 dark:text-teal-400 text-xs font-bold bg-teal-50 dark:bg-teal-950/20 px-3 py-1.5 rounded-lg border border-teal-100 dark:border-teal-900/30">
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Verified
              </div>
            )}

            <button
              onClick={handleDelete}
              className="p-2 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-650 rounded-lg transition-colors"
              title="Delete Document"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Document Viewer / Preview */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-850 dark:text-slate-200 text-sm">Document Source File</h3>
            
            <div className="aspect-[3/4] bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center overflow-hidden">
              {isDemoMode() || !signedUrl ? (
                <div className="p-6 text-center">
                  <FileText className="h-16 w-16 text-slate-350 dark:text-slate-650 mb-3 mx-auto" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px] block">{fileName}</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Private Medical Document</span>
                  
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); alert('Original secure file download is simulated in Demo mode.'); }}
                    className="mt-6 inline-flex items-center px-4 py-2 border border-slate-250 dark:border-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Download Original
                  </a>
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

            {/* Confidence Summary */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Extraction Integrity</h4>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-650 dark:text-slate-300 font-medium">Confidence Score</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  confidenceCategory === 'HIGH' ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400' :
                  confidenceCategory === 'MEDIUM' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20' : 'bg-red-50 text-red-700'
                }`}>
                  {confidenceCategory === 'HIGH' ? 'High confidence' : confidenceCategory === 'MEDIUM' ? 'Needs review' : 'Low confidence'}
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: Structured Extracted Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Metadata Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-slate-805 dark:text-slate-200 text-sm border-b border-slate-50 dark:border-slate-850 pb-2 flex items-center">
                <Bookmark className="h-4 w-4 text-teal-600 mr-2" />
                Document Information Metadata
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="flex items-center space-x-3 p-2 bg-slate-50 dark:bg-slate-850 rounded-lg">
                  <Calendar className="h-4 w-4 text-slate-450" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Document Date</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {extraction?.documentDate?.value || (createdAt ? formatDate(createdAt) : 'Under Review')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-2 bg-slate-50 dark:bg-slate-850 rounded-lg">
                  <Hospital className="h-4 w-4 text-slate-450" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Hospital/Clinic Name</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {extraction?.encounterDetails?.hospitalName?.value || extraction?.hospitalName?.value || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-2 bg-slate-50 dark:bg-slate-850 rounded-lg">
                  <UserRound className="h-4 w-4 text-slate-450" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Attending Practitioner</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {extraction?.encounterDetails?.doctorName?.value || extraction?.doctorName?.value || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-2 bg-slate-50 dark:bg-slate-850 rounded-lg">
                  <FileText className="h-4 w-4 text-slate-450" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Classification Category</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {document.category || extraction?.documentType || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Extracted Entities */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
              
              {/* Diagnoses Section */}
              <div>
                <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-3">Extracted Diagnoses</h4>
                <div className="space-y-3">
                  {diagnoses.map((dx, i) => (
                    <div key={i} className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-slate-850 dark:text-slate-200 text-sm">{dx.name}</h5>
                        {dx.source_text && (
                          <p className="text-[10px] text-slate-450 mt-1 italic">
                            "Evidence: {dx.source_text}"
                          </p>
                        )}
                      </div>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        dx.verification_status === 'verified' ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                      }`}>
                        {dx.verification_status}
                      </span>
                    </div>
                  ))}
                  {diagnoses.length === 0 && <p className="text-xs text-slate-400 italic">No diagnoses extracted.</p>}
                </div>
              </div>

              {/* Medications Section */}
              <div>
                <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-3">Extracted Medications</h4>
                <div className="space-y-3">
                  {medications.map((med, i) => (
                    <div key={i} className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-slate-850 dark:text-slate-200 text-sm">
                          {med.medicine_name || med.medicineName} {med.strength ? `(${med.strength})` : ''}
                        </h5>
                        <p className="text-xs text-slate-650 dark:text-slate-350 mt-1">
                          Dosage: {med.dosage || 'N/A'} | Freq: {med.frequency || 'N/A'} | Route: {med.route || 'N/A'}
                        </p>
                        {med.source_text && (
                          <p className="text-[10px] text-slate-450 mt-1 italic">
                            "Evidence: {med.source_text}"
                          </p>
                        )}
                      </div>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        med.verification_status === 'verified' ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                      }`}>
                        {med.verification_status}
                      </span>
                    </div>
                  ))}
                  {medications.length === 0 && <p className="text-xs text-slate-400 italic">No medications extracted.</p>}
                </div>
              </div>

              {/* Lab Results Section */}
              <div>
                <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-3">Extracted Lab Results</h4>
                <div className="space-y-3">
                  {labResults.map((lab, i) => (
                    <div key={i} className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-slate-850 dark:text-slate-200 text-sm">
                          {lab.test_name || lab.testName}: <span className={lab.abnormal_flag ? 'text-red-500 font-extrabold' : 'text-slate-800 dark:text-slate-300'}>{lab.value} {lab.unit || ''}</span>
                        </h5>
                        <p className="text-xs text-slate-500 mt-1">
                          Reference Range: {lab.reference_range || lab.referenceRange || 'N/A'}
                        </p>
                        {lab.source_text && (
                          <p className="text-[10px] text-slate-450 mt-1 italic">
                            "Evidence: {lab.source_text}"
                          </p>
                        )}
                      </div>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        lab.verification_status === 'verified' ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                      }`}>
                        {lab.verification_status}
                      </span>
                    </div>
                  ))}
                  {labResults.length === 0 && <p className="text-xs text-slate-400 italic">No lab results extracted.</p>}
                </div>
              </div>

              {/* Patient Profile on Document */}
              {extraction?.patientDetails && (extraction?.patientDetails?.patientNameOnDocument?.value || extraction?.patientDetails?.age?.value || extraction?.patientDetails?.gender?.value || extraction?.patientDetails?.patientIdOrMrn?.value) && (
                <div>
                  <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-3">Patient Profile on Document</h4>
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    {extraction.patientDetails.patientNameOnDocument?.value && (
                      <div>
                        <span className="text-[10px] text-slate-400 block">Name</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{extraction.patientDetails.patientNameOnDocument.value}</span>
                      </div>
                    )}
                    {extraction.patientDetails.age?.value && (
                      <div>
                        <span className="text-[10px] text-slate-400 block">Age</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{extraction.patientDetails.age.value}</span>
                      </div>
                    )}
                    {extraction.patientDetails.gender?.value && (
                      <div>
                        <span className="text-[10px] text-slate-400 block">Gender</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{extraction.patientDetails.gender.value}</span>
                      </div>
                    )}
                    {extraction.patientDetails.patientIdOrMrn?.value && (
                      <div>
                        <span className="text-[10px] text-slate-400 block">MRN / Patient ID</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{extraction.patientDetails.patientIdOrMrn.value}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Chief Complaints & Symptoms */}
              {((extraction?.clinicalInformation?.chiefComplaints && extraction.clinicalInformation.chiefComplaints.length > 0) || (extraction?.clinicalInformation?.presentingSymptoms && extraction.clinicalInformation.presentingSymptoms.length > 0)) && (
                <div>
                  <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-3">Chief Complaints & Symptoms</h4>
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl space-y-2 text-xs">
                    {extraction.clinicalInformation.chiefComplaints && extraction.clinicalInformation.chiefComplaints.length > 0 && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold mb-1">Chief Complaints</span>
                        <ul className="list-disc pl-4 space-y-1">
                          {extraction.clinicalInformation.chiefComplaints.map((cc: any, idx: number) => (
                            <li key={idx} className="text-slate-700 dark:text-slate-300 font-semibold">{cc.value}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {extraction.clinicalInformation.presentingSymptoms && extraction.clinicalInformation.presentingSymptoms.length > 0 && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold mb-1">Presenting Symptoms</span>
                        <ul className="list-disc pl-4 space-y-1">
                          {extraction.clinicalInformation.presentingSymptoms.map((ps: any, idx: number) => (
                            <li key={idx} className="text-slate-700 dark:text-slate-300">{ps.value}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Clinical History */}
              {(extraction?.clinicalInformation?.historyOfPresentIllness?.value || extraction?.clinicalInformation?.pastMedicalHistory?.value || extraction?.clinicalInformation?.familyHistory?.value || (extraction?.clinicalInformation?.comorbidities && extraction.clinicalInformation.comorbidities.length > 0)) && (
                <div>
                  <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-3">Clinical History</h4>
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl space-y-3 text-xs">
                    {extraction.clinicalInformation.historyOfPresentIllness?.value && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">History of Present Illness (HPI)</span>
                        <p className="text-slate-750 dark:text-slate-300 leading-relaxed font-medium">{extraction.clinicalInformation.historyOfPresentIllness.value}</p>
                      </div>
                    )}
                    {extraction.clinicalInformation.pastMedicalHistory?.value && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Past Medical History</span>
                        <p className="text-slate-755 dark:text-slate-350 leading-relaxed">{extraction.clinicalInformation.pastMedicalHistory.value}</p>
                      </div>
                    )}
                    {extraction.clinicalInformation.familyHistory?.value && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Family History</span>
                        <p className="text-slate-755 dark:text-slate-350 leading-relaxed">{extraction.clinicalInformation.familyHistory.value}</p>
                      </div>
                    )}
                    {extraction.clinicalInformation.comorbidities && extraction.clinicalInformation.comorbidities.length > 0 && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold mb-1">Comorbidities</span>
                        <ul className="list-disc pl-4 space-y-1">
                          {extraction.clinicalInformation.comorbidities.map((cm: any, idx: number) => (
                            <li key={idx} className="text-slate-700 dark:text-slate-300">{cm.value}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Vitals & Physical Examination */}
              {(extraction?.examination?.vitals || extraction?.examination?.generalExamination?.value || extraction?.examination?.systemicExamination?.value || extraction?.examination?.clinicalFindings?.value) && (
                <div>
                  <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-3">Vitals & Examination</h4>
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl space-y-3 text-xs">
                    {extraction.examination.vitals && (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {extraction.examination.vitals.bp?.value && (
                          <div className="p-2 bg-white dark:bg-slate-900 border border-slate-100 rounded-lg">
                            <span className="text-[9px] text-slate-400 block">BP</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{extraction.examination.vitals.bp.value}</span>
                          </div>
                        )}
                        {extraction.examination.vitals.hr?.value && (
                          <div className="p-2 bg-white dark:bg-slate-900 border border-slate-100 rounded-lg">
                            <span className="text-[9px] text-slate-400 block">Heart Rate</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{extraction.examination.vitals.hr.value}</span>
                          </div>
                        )}
                        {extraction.examination.vitals.temp?.value && (
                          <div className="p-2 bg-white dark:bg-slate-900 border border-slate-100 rounded-lg">
                            <span className="text-[9px] text-slate-400 block">Temp</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{extraction.examination.vitals.temp.value}</span>
                          </div>
                        )}
                        {extraction.examination.vitals.rr?.value && (
                          <div className="p-2 bg-white dark:bg-slate-900 border border-slate-100 rounded-lg">
                            <span className="text-[9px] text-slate-400 block">Resp Rate</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{extraction.examination.vitals.rr.value}</span>
                          </div>
                        )}
                        {extraction.examination.vitals.spo2?.value && (
                          <div className="p-2 bg-white dark:bg-slate-900 border border-slate-100 rounded-lg">
                            <span className="text-[9px] text-slate-400 block">SpO2</span>
                            <span className="font-bold text-slate-800 dark:text-teal-405">{extraction.examination.vitals.spo2.value}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {extraction.examination.generalExamination?.value && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">General Physical Exam</span>
                        <p className="text-slate-750 dark:text-slate-350">{extraction.examination.generalExamination.value}</p>
                      </div>
                    )}
                    {extraction.examination.clinicalFindings?.value && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Clinical Findings</span>
                        <p className="text-slate-750 dark:text-slate-300">{extraction.examination.clinicalFindings.value}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Imaging & Diagnostic Studies */}
              {extraction?.investigations?.imaging && extraction.investigations.imaging.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-3">Imaging Reports / Studies</h4>
                  <div className="space-y-3">
                    {extraction.investigations.imaging.map((img: any, i: number) => (
                      <div key={i} className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl space-y-1 text-xs">
                        <h5 className="font-bold text-slate-800 dark:text-slate-200">{img.studyName}</h5>
                        {img.findings && (
                          <p className="text-slate-705 dark:text-slate-350"><span className="text-[10px] text-slate-400 font-semibold block">Findings</span> {img.findings}</p>
                        )}
                        {img.impression && (
                          <p className="text-slate-705 dark:text-slate-300 font-medium"><span className="text-[10px] text-slate-400 font-semibold block">Impression</span> {img.impression}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Procedures Snapshot */}
              {procedures.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-3">Extracted Procedures & Surgeries</h4>
                  <div className="space-y-3">
                    {procedures.map((proc, i) => (
                      <div key={i} className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl text-xs space-y-1">
                        <h5 className="font-bold text-slate-850 dark:text-slate-200">{proc.name} {proc.date ? `(${proc.date})` : ''}</h5>
                        {proc.surgeon_name && <p className="text-slate-500">Surgeon: {proc.surgeon_name}</p>}
                        {proc.notes && <p className="text-slate-650 dark:text-slate-350">{proc.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Treatment snaps / hospital course */}
              {(extraction?.treatment?.treatmentGiven?.value || extraction?.treatment?.hospitalCourse?.value) && (
                <div>
                  <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-3">Treatment during admission & Course</h4>
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl space-y-2 text-xs">
                    {extraction.treatment.treatmentGiven?.value && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Treatment Administered</span>
                        <p className="text-slate-700 dark:text-slate-300">{extraction.treatment.treatmentGiven.value}</p>
                      </div>
                    )}
                    {extraction.treatment.hospitalCourse?.value && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Hospital Course Details</span>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{extraction.treatment.hospitalCourse.value}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Discharge Advice & Plan */}
              {(extraction?.dischargePlan?.dietaryAdvice?.value || extraction?.dischargePlan?.activityAdvice?.value || extraction?.dischargePlan?.nextVisit?.value || (extraction?.dischargePlan?.referrals && extraction.dischargePlan.referrals.length > 0) || (extraction?.dischargePlan?.warningSigns && extraction.dischargePlan.warningSigns.length > 0)) && (
                <div>
                  <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-3">Advice & Follow-up</h4>
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl space-y-3 text-xs">
                    {extraction.dischargePlan.dietaryAdvice?.value && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Dietary Advice</span>
                        <p className="text-slate-750 dark:text-slate-300 font-medium">{extraction.dischargePlan.dietaryAdvice.value}</p>
                      </div>
                    )}
                    {extraction.dischargePlan.activityAdvice?.value && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Activity Instructions</span>
                        <p className="text-slate-750 dark:text-slate-350">{extraction.dischargePlan.activityAdvice.value}</p>
                      </div>
                    )}
                    {extraction.dischargePlan.nextVisit?.value && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Next Appointment</span>
                        <p className="text-slate-750 dark:text-slate-300 font-semibold">{extraction.dischargePlan.nextVisit.value}</p>
                      </div>
                    )}
                    {extraction.dischargePlan.referrals && extraction.dischargePlan.referrals.length > 0 && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold mb-1">Referrals</span>
                        <ul className="list-disc pl-4 space-y-1">
                          {extraction.dischargePlan.referrals.map((ref: any, idx: number) => (
                            <li key={idx} className="text-slate-700 dark:text-slate-300">{ref.value}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {extraction.dischargePlan.warningSigns && extraction.dischargePlan.warningSigns.length > 0 && (
                      <div>
                        <span className="text-[10px] text-red-500 block font-bold mb-1">Warning Signs to Watch Out</span>
                        <ul className="list-disc pl-4 space-y-1 text-red-655 dark:text-red-400">
                          {extraction.dischargePlan.warningSigns.map((ws: any, idx: number) => (
                            <li key={idx} className="font-semibold">{ws.value}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Allergies & Other Notes */}
              {((extraction?.allergies && extraction.allergies.length > 0) || (extraction?.notes && extraction.notes.length > 0)) && (
                <div>
                  <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-3">Allergies & Notes</h4>
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl space-y-2 text-xs">
                    {extraction.allergies && extraction.allergies.length > 0 && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold mb-1 text-amber-600">Allergies</span>
                        <ul className="list-disc pl-4 space-y-1 text-amber-700 dark:text-amber-400 font-semibold">
                          {extraction.allergies.map((all: any, idx: number) => (
                            <li key={idx}>{all.value}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {extraction.notes && extraction.notes.length > 0 && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold mb-1">Additional Notes</span>
                        <ul className="list-disc pl-4 space-y-1">
                          {extraction.notes.map((n: any, idx: number) => (
                            <li key={idx} className="text-slate-750 dark:text-slate-300">{n.value}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Unmapped / Other Documented Information */}
              {extraction?.unmappedDocumentedInformation && extraction.unmappedDocumentedInformation.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-3">Other Documented Information (Unmapped)</h4>
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl text-xs space-y-2 max-h-[300px] overflow-y-auto">
                    {extraction.unmappedDocumentedInformation.map((item: any, idx: number) => (
                      <div key={idx} className="border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0 last:pb-0">
                        <span className="text-[9px] text-slate-400 font-bold block">{item.sectionHeading || 'Unstructured Content'} (Page {item.page || 1})</span>
                        <p className="text-slate-750 dark:text-slate-350 italic mt-0.5">"{item.text}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unreadable Sections */}
              {extraction?.unreadableSections && extraction.unreadableSections.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-3">Unreadable / Uncertain Sections</h4>
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl text-xs space-y-1 text-amber-800 dark:text-amber-400">
                    <ul className="list-disc pl-4 space-y-1 font-semibold">
                      {extraction.unreadableSections.map((item: any, idx: number) => (
                        <li key={idx}>{item.description} (Page {item.page || 1})</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      </div>
    </AppShell>
  );
}

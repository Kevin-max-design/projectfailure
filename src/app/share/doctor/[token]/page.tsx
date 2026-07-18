'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  Printer, 
  AlertTriangle, 
  FileText,
  ShieldAlert,
  HeartPulse,
  Clock,
  Eye,
  X
} from 'lucide-react';
import { mockDb, DEMO_PATIENT } from '@/lib/supabase/service';
import { formatDate } from '@/lib/utils';
import { isDemoMode } from '@/lib/mode';
import { BRAND_CONFIG } from '@/config/brand';

export default function PublicSharedBriefView() {
  const params = useParams();
  const token = params.token as string;

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [brief, setBrief] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Evidence Modal State
  const [selectedEvidence, setSelectedEvidence] = useState<{ title: string; snippet: string; docId: string; page?: number } | null>(null);

  useEffect(() => {
    loadPublicData();
  }, [token]);

  const loadPublicData = async () => {
    if (isDemoMode()) {
      // Find mock token
      const tokenRecord = mockDb.query('medical_share_tokens').select().eq('token_hash', token).single().data;
      if (tokenRecord) {
        const isExpired = new Date(tokenRecord.expires_at) < new Date();
        if (isExpired) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        const briefRecord = mockDb.query('doctor_briefs').select().eq('id', tokenRecord.brief_id).single().data;
        if (briefRecord) {
          setAuthorized(true);
          setBrief(briefRecord);
          const storedProfile = localStorage.getItem('medmemory_patient_profile');
          setPatient(storedProfile ? JSON.parse(storedProfile) : DEMO_PATIENT);
        } else {
          setAuthorized(false);
        }
      } else {
        setAuthorized(false);
      }
      setLoading(false);
    } else {
      try {
        const res = await fetch(`/api/public/doctor-brief?token=${token}`);
        if (res.ok) {
          const data = await res.json();
          setAuthorized(true);
          setBrief(data.brief);
          setPatient(data.patient);
        } else {
          setAuthorized(false);
        }
      } catch (err) {
        console.error('Error fetching public doctor brief:', err);
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-650"></div>
      </div>
    );
  }

  if (authorized === false || !brief || !patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-lg space-y-4">
          <div className="inline-flex p-4 bg-red-50 text-red-650 rounded-2xl">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-850">Access Token Expired or Revoked</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            The clinical brief sharing link has expired or been revoked by the patient. For privacy and data security, full clinical details are hidden.
          </p>
        </div>
      </div>
    );
  }

  const content = brief.structured_content;
  const reason = content.currentReason;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 flex flex-col items-center">
      
      {/* Document Container */}
      <div className="max-w-3xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black">
        
        {/* Clinical Header */}
        <div className="bg-teal-650 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <HeartPulse className="h-7 w-7" />
            <div>
              <h1 className="text-lg font-black tracking-wider uppercase">MedMemory — Clinical Doctor Brief</h1>
              <span className="text-[10px] text-teal-100 font-semibold block">Source-Backed Patient Medical Context</span>
            </div>
          </div>
          
          <button
            onClick={handlePrint}
            className="p-2 bg-teal-750 hover:bg-teal-800 rounded-xl transition-colors text-white border border-teal-500/30 print:hidden"
            title="Print Brief"
          >
            <Printer className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Global disclaimer */}
        <div className="bg-amber-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-655 dark:text-slate-300 leading-relaxed">
            <span className="font-bold">Disclaimer:</span> This brief summarizes information available in the patient’s MedMemory vault and patient-reported symptoms. It may not represent the complete medical history.
          </p>
        </div>

        {/* Contents */}
        <div className="p-6 md:p-8 space-y-8">
          
          {/* Patient Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-6 border-b border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Patient Name</span>
              <span className="font-extrabold text-slate-850 dark:text-white text-sm">{patient.fullName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-405 font-bold uppercase tracking-wider block mb-0.5">Age / DOB</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{patient.dateOfBirth ? formatDate(patient.dateOfBirth) : 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-405 font-bold uppercase tracking-wider block mb-0.5">Blood Group</span>
              <span className="font-bold text-red-600 text-sm">
                {patient.bloodGroup || 'Unknown'}
                <span className="text-[8px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded ml-1 font-normal uppercase tracking-normal">
                  Patient Entered
                </span>
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-405 font-bold uppercase tracking-wider block mb-0.5">Generated Time</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(brief.generated_at)}</span>
            </div>
          </div>

          {/* 1. Reason for Visit */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Reason for Visit</h3>
              <span className="text-[9px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                PATIENT REPORTED
              </span>
            </div>
            <div className="bg-slate-50/50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div><span className="font-bold text-slate-400 block mb-0.5">Category:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{reason.category}</span></div>
                <div><span className="font-bold text-slate-400 block mb-0.5">Onset:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{reason.onset}</span></div>
                <div><span className="font-bold text-slate-400 block mb-0.5">Severity Index:</span> <span className="font-bold text-red-600">{reason.severity}</span></div>
              </div>
              {reason.symptoms?.length > 0 && (
                <div className="text-xs">
                  <span className="font-bold text-slate-400 block mb-1">Associated Symptoms:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {reason.symptoms.map((s: string, idx: number) => (
                      <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-semibold text-[10px]">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {reason.description && (
                <div className="text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className="font-bold text-slate-400 block mb-1">Patient Context Statement:</span>
                  <p className="text-slate-750 leading-relaxed italic">"{reason.description}"</p>
                </div>
              )}
            </div>
          </div>

          {/* 2. Documented History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Relevant Documented History</h3>
              <span className="text-[9px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                DOCUMENT VERIFIED
              </span>
            </div>
            <div className="space-y-3">
              {content.relevantHistory?.map((h: any, idx: number) => (
                <div key={idx} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{h.title}</span>
                      <span className="text-[10px] text-slate-405 font-medium">({formatDate(h.date)})</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{h.details}</p>
                    <p className="text-[10px] text-teal-650 font-bold bg-teal-50/40 dark:bg-teal-950/20 px-2 py-1 rounded inline-block">
                      <span className="uppercase text-[8px] mr-1">RELEVANCE:</span> {h.relevanceExplanation}
                    </p>
                  </div>
                  {h.sourceDocumentId && (
                    <button
                      onClick={() => setSelectedEvidence({
                        title: h.title,
                        snippet: h.sourceText || '',
                        docId: h.sourceDocumentId,
                        page: h.sourcePage
                      })}
                      className="self-start sm:self-center px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-350 flex items-center space-x-1 print:hidden"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View Evidence</span>
                    </button>
                  )}
                </div>
              ))}

              {(!content.relevantHistory || content.relevantHistory.length === 0) && (
                <div className="text-xs text-slate-405 italic bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl text-center">
                  No verified prior chronic conditions or diagnoses relevant to current triage complaints were found.
                </div>
              )}
            </div>
          </div>

          {/* 3. Medications & Allergies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Medications */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Current Medications</h3>
              <div className="space-y-2">
                {content.currentMedications?.map((m: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{m.name}</span>
                      <span className="text-[8px] bg-teal-50 text-teal-700 px-1 py-0.5 rounded uppercase font-bold">Verified</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">{m.details}</span>
                  </div>
                ))}
                {(!content.currentMedications || content.currentMedications.length === 0) && (
                  <div className="text-xs text-slate-405 italic p-3 bg-slate-50/50 rounded-xl text-center">
                    No active daily medications found in records.
                  </div>
                )}
              </div>
            </div>

            {/* Allergies */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Known Allergies</h3>
              <div className="space-y-2">
                {content.allergies?.map((a: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-205">{a.name}</span>
                      <span className="text-[8px] bg-amber-50 text-amber-700 px-1 py-0.5 rounded uppercase font-bold">{a.provenance.replace('_', ' ')}</span>
                    </div>
                  </div>
                ))}
                {(!content.allergies || content.allergies.length === 0) && (
                  <div className="text-xs text-slate-400 italic p-3 bg-slate-50/50 rounded-xl text-center">
                    No verified allergy information was found.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* 4. Relevant Investigations */}
          {content.relevantInvestigations?.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Relevant Investigations & Labs</h3>
              <div className="space-y-2">
                {content.relevantInvestigations.map((inv: any, idx: number) => (
                  <div key={idx} className="p-3.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{inv.title}</span>
                      <span className="text-[10px] text-slate-400">{formatDate(inv.date)}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{inv.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Print Footer Disclaimer */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-6 text-[10px] text-slate-400 font-medium leading-relaxed">
            <span className="font-bold block text-slate-500 mb-1">Disclaimer & Limitations</span>
            {content.limitations}
          </div>

        </div>

      </div>

      {/* Evidence Drawer Modal */}
      {selectedEvidence && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl animate-scaleIn">
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">Provenance Evidence Verification</h4>
              <button onClick={() => setSelectedEvidence(null)} className="text-slate-400 hover:text-slate-655">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Record Name</span>
                <span className="font-bold text-slate-850 dark:text-white">{selectedEvidence.title}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Original Source Snippet</span>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 font-mono rounded-xl border border-slate-100 dark:border-slate-850 text-[10px] text-slate-750 dark:text-slate-300 leading-relaxed italic">
                  "{selectedEvidence.snippet || 'Referenced document text segment.'}"
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Source Document ID</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 truncate block">{selectedEvidence.docId.substring(0, 12)}...</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Page Number</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Page {selectedEvidence.page || 1}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

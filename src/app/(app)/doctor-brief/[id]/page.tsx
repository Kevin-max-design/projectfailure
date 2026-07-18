'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Printer, 
  Share2, 
  Clock, 
  AlertTriangle, 
  ArrowLeft,
  FileText,
  Shield,
  Eye,
  X,
  CheckCircle,
  Copy,
  Trash2,
  Lock
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { mockDb, DEMO_PATIENT } from '@/lib/supabase/service';
import { formatDate } from '@/lib/utils';
import { isDemoMode } from '@/lib/mode';
import { BRAND_CONFIG } from '@/config/brand';

export default function DoctorBriefDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [brief, setBrief] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Evidence Modal State
  const [selectedEvidence, setSelectedEvidence] = useState<{ title: string; snippet: string; docId: string; page?: number } | null>(null);

  // Share Modal State
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareDuration, setShareDuration] = useState(60); // minutes
  const [shareLink, setShareLink] = useState('');
  const [shareExpires, setShareExpires] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (isDemoMode()) {
      const briefData = mockDb.query('doctor_briefs').select().eq('id', id).single().data;
      if (!briefData) {
        alert('Brief not found');
        router.push('/app/doctor-brief');
        return;
      }
      setBrief(briefData);

      const storedProfile = localStorage.getItem('medmemory_patient_profile');
      setPatient(storedProfile ? JSON.parse(storedProfile) : DEMO_PATIENT);
      setLoading(false);
    } else {
      try {
        const res = await fetch(`/api/doctor-brief/${id}`);
        if (res.ok) {
          const data = await res.json();
          setBrief(data);

          // Get patient info
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: p } = await supabase.from('patients').select('*').eq('user_id', user.id).single();
            setPatient(p);
          }
        } else {
          router.push('/app/doctor-brief');
        }
      } catch (err) {
        console.error('Error fetching brief details:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleGenerateShareLink = async () => {
    if (isDemoMode()) {
      const mockToken = `tok-brf-${Math.random().toString(36).substring(2, 12)}`;
      const link = `${window.location.origin}/share/doctor/${mockToken}`;
      const expires = new Date(Date.now() + shareDuration * 60 * 1000).toISOString();
      
      mockDb.query('medical_share_tokens').insert({
        id: `tok-${Math.random().toString(36).substring(7)}`,
        patient_id: patient.id,
        brief_id: id,
        token_hash: mockToken, // simplify matching for demo
        scope: 'read_brief',
        expires_at: expires
      });

      setShareLink(link);
      setShareExpires(expires);
    } else {
      try {
        const res = await fetch(`/api/doctor-brief/${id}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ durationMinutes: shareDuration })
        });

        if (res.ok) {
          const data = await res.json();
          const link = `${window.location.origin}/share/doctor/${data.token}`;
          setShareLink(link);
          setShareExpires(data.expiresAt);
        } else {
          alert('Error generating share link');
        }
      } catch (err) {
        console.error('Error creating share token:', err);
      }
    }
  };

  const handleRevokeShares = async () => {
    if (isDemoMode()) {
      mockDb.query('medical_share_tokens').delete().eq('brief_id', id);
      setShareLink('');
      setShareExpires(null);
      alert('All active share links revoked.');
    } else {
      try {
        const res = await fetch(`/api/doctor-brief/${id}/share`, {
          method: 'DELETE'
        });
        if (res.ok) {
          setShareLink('');
          setShareExpires(null);
          alert('All active share links revoked.');
        } else {
          alert('Failed to revoke shares');
        }
      } catch (err) {
        console.error('Error revoking shares:', err);
      }
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !brief || !patient) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      </AppShell>
    );
  }

  const content = brief.structured_content;
  const reason = content.currentReason;

  // Calculate age
  const dob = new Date(patient.dateOfBirth);
  const ageDiff = Date.now() - dob.getTime();
  const ageDate = new Date(ageDiff);
  const patientAge = Math.abs(ageDate.getUTCFullYear() - 1970);

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto pb-16 print:p-0 print:m-0 print:max-w-full">
        
        {/* Navigation / Header Actions (Hidden in Print) */}
        <div className="flex items-center justify-between print:hidden">
          <Link
            href="/app/doctor-brief"
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to briefs
          </Link>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setShareModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
            >
              <Share2 className="h-4 w-4 mr-1.5" />
              Share Link
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 bg-teal-650 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
            >
              <Printer className="h-4 w-4 mr-1.5" />
              Print / Save PDF
            </button>
          </div>
        </div>

        {/* The Brief Document Card */}
        <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-8 md:p-12 rounded-3xl shadow-sm print:border-none print:shadow-none print:p-0">
          
          {/* Header Info */}
          <div className="border-b-2 border-slate-100 dark:border-slate-800 pb-6 flex flex-col md:flex-row md:justify-between md:items-start space-y-4 md:space-y-0">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                {BRAND_CONFIG.name} — Clinical Doctor Brief
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Temporary Medical History Summary Handoff
              </p>
            </div>
            <div className="text-xs md:text-right space-y-1 text-slate-500 dark:text-slate-400">
              <div><span className="font-bold">Generated:</span> {formatDate(brief.generated_at)}</div>
              <div><span className="font-bold">Method:</span> {brief.generation_method === 'ai_openai' ? 'Verified AI Summary' : 'Deterministic Layout'}</div>
            </div>
          </div>

          {/* Patient Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-b border-slate-105 dark:border-slate-800 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Patient Name</span>
              <span className="font-extrabold text-slate-850 dark:text-white text-sm">{patient.fullName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Age / DOB</span>
              <span className="font-semibold text-slate-800 dark:text-slate-205">{patientAge} Years ({formatDate(patient.dateOfBirth)})</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Blood Group</span>
              <span className="font-bold text-red-650 text-sm">
                {patient.bloodGroup || 'Unknown'}
                <span className="text-[8px] bg-slate-50 text-slate-400 px-1 py-0.5 rounded ml-1 tracking-normal font-normal">
                  PATIENT ENTERED
                </span>
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Emergency Contact</span>
              <span className="font-semibold text-slate-800 dark:text-slate-205">{patient.emergencyContactName} ({patient.emergencyContactPhone})</span>
            </div>
          </div>

          <div className="space-y-8 pt-8">
            
            {/* 1. Current Reason for Visit */}
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

            {/* 2. Important Documented History */}
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
                        className="self-start sm:self-center px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center space-x-1 print:hidden"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Evidence</span>
                      </button>
                    )}
                  </div>
                ))}

                {(!content.relevantHistory || content.relevantHistory.length === 0) && (
                  <div className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl text-center">
                    No verified prior medical history records matching symptom categories were found in MedMemory.
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
                    <div className="text-xs text-slate-400 italic p-3 bg-slate-50/50 rounded-xl text-center">
                      No active daily medications found in available records.
                    </div>
                  )}
                </div>
              </div>

              {/* Allergies */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Known Allergies</h3>
                <div className="space-y-2">
                  {content.allergies?.map((a: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-105 dark:border-slate-800 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{a.name}</span>
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

            {/* Disclaimer Disclaimer */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6 text-[10px] text-slate-400 font-medium leading-relaxed">
              <span className="font-bold block text-slate-500 mb-1">Disclaimer & Limitations</span>
              {content.limitations}
            </div>

          </div>

        </div>

      </div>

      {/* 1. Evidence Drawer Modal */}
      {selectedEvidence && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl animate-scaleIn">
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">Provenance Evidence Verification</h4>
              <button onClick={() => setSelectedEvidence(null)} className="text-slate-400 hover:text-slate-600">
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

      {/* 2. Share Link Generator Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 max-w-md w-full rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center">
                <Lock className="h-4 w-4 text-teal-650 mr-1.5" />
                Temporary Share Handoff Link
              </h4>
              <button onClick={() => { setShareModalOpen(false); setShareLink(''); }} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5 text-xs">
              
              {!shareLink ? (
                <div className="space-y-4">
                  <p className="text-slate-500 leading-relaxed text-[11px]">
                    Generate a high-entropy sharing URL. The recipient can view ONLY this specific brief snapshot. The link will automatically deactivate when it expires.
                  </p>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Link Expiry Duration</label>
                    <select
                      value={shareDuration}
                      onChange={(e) => setShareDuration(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-100 dark:bg-slate-850 dark:border-slate-800 rounded-xl font-semibold text-xs"
                    >
                      <option value={15}>15 Minutes</option>
                      <option value={60}>1 Hour</option>
                      <option value={1440}>24 Hours</option>
                    </select>
                  </div>
                  <button
                    onClick={handleGenerateShareLink}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors"
                  >
                    Generate Secure Link
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-405 font-bold uppercase tracking-wider block">Your Sharing Link</span>
                    <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                      <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300 truncate flex-1">{shareLink}</span>
                      <button
                        onClick={handleCopyLink}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                        title="Copy to clipboard"
                      >
                        {copied ? <CheckCircle className="h-4.5 w-4.5 text-teal-600" /> : <Copy className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-[10px] text-slate-400 font-bold bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                    Expires at: {new Date(shareExpires!).toLocaleString()}
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={handleRevokeShares}
                      className="flex-1 py-2 border border-red-200 dark:border-red-900 text-red-650 hover:bg-red-50 rounded-xl font-bold flex items-center justify-center space-x-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Revoke Link</span>
                    </button>
                    <button
                      onClick={() => { setShareModalOpen(false); setShareLink(''); }}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </AppShell>
  );
}

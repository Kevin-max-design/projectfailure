'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Heart, 
  FileWarning, 
  Plus, 
  Search, 
  ShieldAlert, 
  AlertTriangle,
  FileText,
  Activity,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { mockDb, DEMO_PATIENT } from '@/lib/supabase/service';
import { formatDate } from '@/lib/utils';
import { BRAND_CONFIG } from '@/config/brand';
import { isDemoMode } from '@/lib/mode';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [patient, setPatient] = useState<any>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [documentsNeedingReview, setDocumentsNeedingReview] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (isDemoMode()) {
        if (typeof window !== 'undefined') {
          const storedProfile = localStorage.getItem('medmemory_patient_profile');
          if (storedProfile) {
            setPatient(JSON.parse(storedProfile));
          } else {
            setPatient(DEMO_PATIENT);
          }

          // Load medical events sorted by date desc
          const eventsRes = mockDb.query('medical_events').select().order('event_date', { ascending: false });
          setRecentEvents(eventsRes.data.slice(0, 4));

          // Load documents needing review
          const docsRes = mockDb.query('documents').select().eq('processing_status', 'awaiting_review');
          setDocumentsNeedingReview(docsRes.data || []);
        }
        setLoading(false);
      } else {
        try {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();

          if (!user) {
            router.push('/login');
            return;
          }

          // 1. Fetch patient profile
          const { data: patientData, error: patientError } = await supabase
            .from('patients')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (patientError || !patientData) {
            console.log('Patient profile not found in DB, redirecting to onboarding...');
            router.push('/app/onboarding');
            return;
          }

          const mappedPatient = {
            id: patientData.id,
            fullName: patientData.full_name,
            dateOfBirth: patientData.date_of_birth,
            gender: patientData.gender,
            bloodGroup: patientData.blood_group,
            phone: patientData.phone,
            emergencyContactName: patientData.emergency_contact_name,
            emergencyContactPhone: patientData.emergency_contact_phone,
            knownAllergies: patientData.known_allergies || [],
            knownChronicConditions: patientData.known_chronic_conditions || [],
            currentLongTermMedications: patientData.current_long_term_medications || [],
            createdAt: patientData.created_at,
            updatedAt: patientData.updated_at
          };
          setPatient(mappedPatient);

          // Update local storage so other components stay sync'd
          if (typeof window !== 'undefined') {
            localStorage.setItem('medmemory_patient_id', patientData.id);
            localStorage.setItem('medmemory_patient_name', patientData.full_name);
            localStorage.setItem('medmemory_onboarded', 'true');
          }

          // 2. Load recent events from Supabase
          const { data: eventsData } = await supabase
            .from('medical_events')
            .select('*')
            .eq('patient_id', patientData.id)
            .order('event_date', { ascending: false })
            .limit(4);

          setRecentEvents(eventsData || []);

          // 3. Load documents needing review
          const { data: docsData } = await supabase
            .from('documents')
            .select('*')
            .eq('patient_id', patientData.id)
            .eq('processing_status', 'awaiting_review');

          setDocumentsNeedingReview(docsData || []);

        } catch (err) {
          console.error('Failed to load dashboard data:', err);
        } finally {
          setLoading(false);
        }
      }
    };

    loadDashboardData();
  }, [router]);

  if (loading || !patient) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              Good morning, {patient.fullName}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Your health memory, organized in one place.
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/app/help"
              className="inline-flex items-center px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Activity className="h-4 w-4 mr-2 animate-pulse" />
              I Need Medical Help
            </Link>
            <Link
              href="/app/documents"
              className="inline-flex items-center px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Upload Medical Record
            </Link>
          </div>
        </div>

        {/* Safety Disclaimer */}
        <div className="bg-teal-50/50 dark:bg-slate-800/40 border border-teal-150/40 dark:border-slate-700/50 rounded-xl p-4 flex items-start space-x-3">
          <TrendingUp className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <span className="font-semibold text-teal-800 dark:text-teal-400">Disclaimer:</span> {BRAND_CONFIG.medicalDisclaimer}
          </p>
        </div>

        {/* Grid Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Health Snapshot Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3">
              <h3 className="text-md font-bold text-slate-800 dark:text-slate-200 flex items-center">
                <Activity className="h-5 w-5 text-teal-600 mr-2" />
                Health Snapshot
              </h3>
              <span className="text-[10px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {patient.bloodGroup || 'O+'}
              </span>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1.5">Known Conditions</span>
                <div className="flex flex-wrap gap-1.5">
                  {patient.knownChronicConditions?.map((cond: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
                      {cond}
                    </span>
                  ))}
                  {!patient.knownChronicConditions?.length && (
                    <span className="text-slate-400 text-xs italic">No chronic conditions listed.</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1.5">Allergies</span>
                <div className="flex flex-wrap gap-1.5">
                  {patient.knownAllergies?.map((alg: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-full text-xs font-medium">
                      {alg}
                    </span>
                  ))}
                  {!patient.knownAllergies?.length && (
                    <span className="text-slate-400 text-xs italic">No known allergies.</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1.5">Current Long-term Medications</span>
                <div className="space-y-1.5">
                  {patient.currentLongTermMedications?.map((med: string, i: number) => (
                    <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300">
                      {med}
                    </div>
                  ))}
                  {!patient.currentLongTermMedications?.length && (
                    <span className="text-slate-400 text-xs italic">No active daily medications.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Events & Timeline Preview */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Actionable Review Box */}
            {documentsNeedingReview.length > 0 && (
              <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/20 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-pulse">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-850 dark:text-amber-400">Review Required</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      You have {documentsNeedingReview.length} document{documentsNeedingReview.length > 1 ? 's' : ''} awaiting extraction verification.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/app/documents/${documentsNeedingReview[0].id}/review`}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Verify Now
                </Link>
              </div>
            )}

            {/* Timeline Preview */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3">
                <h3 className="text-md font-bold text-slate-800 dark:text-slate-200">
                  Recent Medical Events
                </h3>
                <Link href="/app/timeline" className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center">
                  View Full Timeline
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </div>

              <div className="relative pl-6 timeline-line space-y-6">
                {recentEvents.map((event, i) => (
                  <div key={i} className="relative">
                    {/* Circle icon marker */}
                    <span className="absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-teal-600 bg-white dark:bg-slate-900 z-10" />
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">{formatDate(event.event_date)}</span>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{event.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{event.summary}</p>
                      {event.hospital_name && (
                        <span className="text-[10px] bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-md mt-1.5 inline-block font-semibold">
                          {event.hospital_name}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {recentEvents.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-sm">
                    Your health timeline is empty. Upload a medical document to generate events.
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Link 
                href="/app/documents" 
                className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center group transition-all"
              >
                <div className="p-3 bg-teal-50 dark:bg-teal-950/20 text-teal-600 rounded-xl mb-3 group-hover:scale-105 transition-transform">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Upload Record</span>
                <span className="text-[10px] text-slate-400 mt-1">Add files or photos</span>
              </Link>

              <Link 
                href="/app/help" 
                className="bg-white hover:bg-slate-55 dark:bg-slate-900 dark:hover:bg-slate-800/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center group transition-all"
              >
                <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-650 rounded-xl mb-3 group-hover:scale-105 transition-transform">
                  <Activity className="h-5 w-5 animate-pulse" />
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Get Medical Help</span>
                <span className="text-[10px] text-slate-400 mt-1">Triage intake summary</span>
              </Link>

              <Link 
                href="/app/doctor-brief" 
                className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center group transition-all"
              >
                <div className="p-3 bg-teal-50 dark:bg-teal-950/20 text-teal-650 rounded-xl mb-3 group-hover:scale-105 transition-transform">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Doctor Briefs</span>
                <span className="text-[10px] text-slate-400 mt-1">Handoff summaries</span>
              </Link>

              <Link 
                href="/app/emergency" 
                className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center group transition-all"
              >
                <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-xl mb-3 group-hover:scale-105 transition-transform">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Emergency ID</span>
                <span className="text-[10px] text-slate-400 mt-1">Configure emergency QR</span>
              </Link>

              <Link 
                href="/app/ask" 
                className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center group transition-all"
              >
                <div className="p-3 bg-teal-50 dark:bg-teal-950/20 text-teal-600 rounded-xl mb-3 group-hover:scale-105 transition-transform">
                  <Search className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Ask Records</span>
                <span className="text-[10px] text-slate-400 mt-1">Grounded RAG QA</span>
              </Link>
            </div>

          </div>

        </div>
      </div>
    </AppShell>
  );
}

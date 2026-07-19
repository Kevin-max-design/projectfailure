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
import { LongitudinalBrainService, ClinicalSafetyAlert } from '@/lib/services/longitudinal-brain';
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
  const [safetyAlerts, setSafetyAlerts] = useState<ClinicalSafetyAlert[]>([]);
  const [labTrends, setLabTrends] = useState<any>(null);
  const [clinicalInsights, setClinicalInsights] = useState<any[]>([]);
  const [graphMetrics, setGraphMetrics] = useState<any>({ nodes: 0, edges: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (isDemoMode()) {
        if (typeof window !== 'undefined') {
          let patId = DEMO_PATIENT.id;
          const storedProfile = localStorage.getItem('medmemory_patient_profile');
          if (storedProfile) {
            const p = JSON.parse(storedProfile);
            setPatient(p);
            patId = p.id;
          } else {
            setPatient(DEMO_PATIENT);
          }

          // Load medical events sorted by date desc
          const eventsRes = mockDb.query('medical_events').select().order('event_date', { ascending: false });
          setRecentEvents(eventsRes.data.slice(0, 4));

          // Load documents needing review
          const docsRes = mockDb.query('documents').select().eq('processing_status', 'awaiting_review');
          setDocumentsNeedingReview(docsRes.data || []);

          // Sync patient profile before safety check in demo mode
          await LongitudinalBrainService.syncProfileFromRecords(patId, mockDb, true);

          // Run clinical safety check in browser for demo mode
          const alerts = await LongitudinalBrainService.runClinicalSafetyCheck(patId, mockDb, true);
          setSafetyAlerts(alerts);

          // Analyze lab trends in browser for demo mode
          const hba1cTrend = await LongitudinalBrainService.analyzeLabTrends(patId, 'hba1c', mockDb, true);
          const hbTrend = await LongitudinalBrainService.analyzeLabTrends(patId, 'hemoglobin', mockDb, true);
          const wbcTrend = await LongitudinalBrainService.analyzeLabTrends(patId, 'wbc', mockDb, true);
          const plateletsTrend = await LongitudinalBrainService.analyzeLabTrends(patId, 'platelet', mockDb, true);
          
          setLabTrends({
            hba1c: hba1cTrend,
            hemoglobin: hbTrend,
            wbc: wbcTrend,
            platelets: plateletsTrend
          });

          // Build and Sync Patient Knowledge Graph in browser for demo mode
          const { MedicalGraphService } = await import('@/lib/services/medical-graph');
          await MedicalGraphService.buildGraphFromRecords(patId, mockDb, true);
          await MedicalGraphService.syncMemory(patId, mockDb, true);

          const insights = await MedicalGraphService.generateClinicalInsights(patId, mockDb, true);
          setClinicalInsights(insights);

          const nodes = mockDb.query('graph_nodes').select().eq('patient_id', patId).data || [];
          const edges = mockDb.query('graph_edges').select().eq('patient_id', patId).data || [];
          setGraphMetrics({
            nodes: nodes.length,
            edges: edges.length
          });
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

          // 4. Fetch safety alerts and lab trends from API
          const dbDataRes = await fetch('/api/patient/dashboard-data');
          if (dbDataRes.ok) {
            const dbData = await dbDataRes.json();
            setSafetyAlerts(dbData.safetyAlerts || []);
            setLabTrends(dbData.labTrends || null);
          }

          // 5. Fetch clinical insights and graph metrics from API
          const insightsRes = await fetch('/api/patient/insights');
          if (insightsRes.ok) {
            const insData = await insightsRes.json();
            setClinicalInsights(insData.insights || []);
            setGraphMetrics(insData.metrics || { nodes: 0, edges: 0 });
          }

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

        {/* Clinical Safety Alerts Banner */}
        {safetyAlerts.length > 0 && (
          <div className="bg-red-50/70 dark:bg-red-950/20 border-l-4 border-red-500 rounded-r-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center space-x-2.5">
              <ShieldAlert className="h-5 w-5 text-red-650 dark:text-red-500 flex-shrink-0 animate-pulse" />
              <h3 className="text-sm font-bold text-red-850 dark:text-red-400 uppercase tracking-wider">Clinical Safety Alerts Detected</h3>
            </div>
            <div className="space-y-2">
              {safetyAlerts.map((alert, idx) => (
                <div key={idx} className="text-xs text-red-750 dark:text-red-300 leading-relaxed pl-7 relative">
                  <span className="absolute left-2.5 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
                  <span className="font-bold">{alert.title}: </span>
                  {alert.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Safety Disclaimer */}
        <div className="bg-teal-50/50 dark:bg-slate-800/40 border border-teal-150/40 dark:border-slate-700/50 rounded-xl p-4 flex items-start space-x-3">
          <TrendingUp className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <span className="font-semibold text-teal-800 dark:text-teal-400">Disclaimer:</span> {BRAND_CONFIG.medicalDisclaimer}
          </p>
        </div>

        {/* Grid Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Health Snapshot + Lab Trends */}
          <div className="space-y-6">
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

          {/* Lab History Trends Card */}
          {labTrends && Object.values(labTrends).some((t: any) => t !== null) && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-6 shadow-sm mt-6">
              <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3">
                <h3 className="text-md font-bold text-slate-850 dark:text-slate-200 flex items-center">
                  <TrendingUp className="h-5 w-5 text-teal-650 mr-2" />
                  Lab History Trends
                </h3>
              </div>
              <div className="space-y-5">
                {Object.entries(labTrends).map(([key, trend]: [string, any]) => {
                  if (!trend) return null;
                  const isUp = trend.trendDirection === 'UPWARD';
                  const isDown = trend.trendDirection === 'DOWNWARD';
                  const isStable = trend.trendDirection === 'STABLE';
                  
                  return (
                    <div key={key} className="space-y-2 border-b border-slate-50 dark:border-slate-850/50 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">{trend.testName}</span>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                            {trend.latestValue} {trend.latestUnit}
                          </span>
                          {isUp && (
                            <span className="text-[10px] bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 px-1.5 py-0.5 rounded font-extrabold flex items-center">
                              ↗ UPWARD
                            </span>
                          )}
                          {isDown && (
                            <span className="text-[10px] bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400 px-1.5 py-0.5 rounded font-extrabold flex items-center">
                              ↘ DOWNWARD
                            </span>
                          )}
                          {isStable && (
                            <span className="text-[10px] bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded font-semibold flex items-center">
                              → STABLE
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 overflow-x-auto py-1">
                        {trend.points.map((pt: any, i: number) => (
                          <div key={i} className="flex-shrink-0 flex items-center space-x-1 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded text-[10px] text-slate-500 font-medium">
                            <span>{formatDate(pt.date).split(' ')[0]}</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{pt.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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

            {/* Clinical Insights & AI Knowledge Graph */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-50 dark:border-slate-800 pb-4 space-y-2 sm:space-y-0">
                <div>
                  <h3 className="text-md font-bold text-slate-850 dark:text-slate-200 flex items-center">
                    <ShieldAlert className="h-5 w-5 text-teal-650 mr-2" />
                    Clinical AI Insights
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Continuous medical reasoning across your history.</p>
                </div>
                <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Graph: {graphMetrics.nodes} nodes · {graphMetrics.edges} edges
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {clinicalInsights.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs italic">
                    No clinical warnings or disease progression risks detected.
                  </div>
                ) : (
                  clinicalInsights.map((insight, idx) => {
                    const isCrit = insight.severity === 'critical';
                    const isWarn = insight.severity === 'warning';
                    return (
                      <div key={idx} className="bg-slate-50/50 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800/80 p-4 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-850 dark:text-slate-200 uppercase tracking-wider">{insight.title}</span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isCrit ? 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400' :
                            isWarn ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                            'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                          }`}>
                            {insight.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed">{insight.description}</p>
                        
                        {/* Citations */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100/50 dark:border-slate-800/40">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">Evidence:</span>
                          {insight.citations.map((cit: any, cIdx: number) => (
                            <Link
                              key={cIdx}
                              href={`/app/documents/${cit.documentId}/review`}
                              className="inline-flex items-center px-2 py-0.5 bg-white dark:bg-slate-850 border border-slate-150/60 dark:border-slate-700/60 rounded text-[10px] text-teal-650 dark:text-teal-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                              {cit.documentTitle.replace(/\.[^/.]+$/, '')} ({cit.date})
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

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

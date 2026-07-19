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

// Inline premium SVG Sparkline/Trend Data Visualization
const LabTrendChart = ({ trend }: { trend: any }) => {
  const points = trend.points || [];
  if (points.length === 0) return null;

  const values = points.map((p: any) => parseFloat(p.value)).filter((v: number) => !isNaN(v));
  if (values.length === 0) return null;

  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const valRange = maxVal - minVal;
  
  // Scale scaling padding
  const yPadding = valRange === 0 ? maxVal * 0.25 || 1 : valRange * 0.35;
  const yMax = maxVal + yPadding;
  const yMin = Math.max(0, minVal - yPadding);
  const yRange = yMax - yMin || 1;

  const width = 400;
  const height = 90;
  const paddingX = 30;
  const paddingY = 15;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const svgPoints = points.map((pt: any, idx: number) => {
    const x = paddingX + (idx / (points.length - 1 || 1)) * chartWidth;
    const val = parseFloat(pt.value);
    const y = paddingY + chartHeight - ((val - yMin) / yRange) * chartHeight;
    return { x, y, value: val, date: pt.date, isAbnormal: pt.abnormalFlag || pt.isAbnormal };
  });

  const linePath = svgPoints.map((pt: any, idx: number) => 
    `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`
  ).join(' ');

  const areaPath = points.length > 1
    ? `${linePath} L ${svgPoints[svgPoints.length - 1].x} ${height - paddingY} L ${svgPoints[0].x} ${height - paddingY} Z`
    : '';

  return (
    <div className="bg-slate-50/50 dark:bg-slate-950/20 rounded-xl p-3 border border-slate-100 dark:border-slate-855/50 relative overflow-hidden mt-1">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id={`grad-${trend.testName.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d9488" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        
        {/* Subtle Grid line (horizontal mid line) */}
        <line 
          x1={paddingX} 
          y1={paddingY + chartHeight / 2} 
          x2={width - paddingX} 
          y2={paddingY + chartHeight / 2} 
          className="stroke-slate-200/60 dark:stroke-slate-800/40" 
          strokeWidth="0.75" 
          strokeDasharray="3 3" 
        />

        {/* Area fill under curve */}
        {points.length > 1 && (
          <path d={areaPath} fill={`url(#grad-${trend.testName.replace(/\s+/g, '-')})`} />
        )}

        {/* Sparkline curve */}
        {points.length > 1 ? (
          <path 
            d={linePath} 
            fill="none" 
            stroke="#0d9488" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        ) : (
          <line 
            x1={paddingX} 
            y1={svgPoints[0].y} 
            x2={width - paddingX} 
            y2={svgPoints[0].y} 
            stroke="#0d9488" 
            strokeWidth="1.5" 
            strokeDasharray="2 2" 
          />
        )}

        {/* Circles & Labels */}
        {svgPoints.map((pt: any, idx: number) => (
          <g key={idx}>
            <circle 
              cx={pt.x} 
              cy={pt.y} 
              r="4.5" 
              fill="#ffffff" 
              stroke={pt.isAbnormal ? '#ef4444' : '#0d9488'} 
              strokeWidth="2" 
            />
            <text 
              x={pt.x} 
              y={pt.y - 8} 
              textAnchor="middle" 
              className="text-[9px] font-extrabold fill-slate-700 dark:fill-slate-350"
            >
              {pt.value}
            </text>
            <text 
              x={pt.x} 
              y={height - 2} 
              textAnchor="middle" 
              className="text-[8px] font-semibold fill-slate-400 dark:fill-slate-500"
            >
              {new Date(pt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

// Animated Knowledge Graph Network Visualization
const AIKnowledgeGraphVisualizer = ({ patientName, nodesCount, edgesCount }: { patientName: string, nodesCount: number, edgesCount: number }) => {
  return (
    <div className="bg-slate-50/50 dark:bg-slate-950/40 rounded-xl p-4 border border-slate-100 dark:border-slate-850/50 flex flex-col items-center justify-center space-y-3 relative overflow-hidden h-[230px] mt-1">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a05_1px,transparent_1px),linear-gradient(to_bottom,#0f172a05_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:10px_10px] opacity-40"></div>
      
      <svg className="w-full h-full min-h-[160px] overflow-visible" viewBox="0 0 400 180">
        <style>{`
          @keyframes dash {
            to {
              stroke-dashoffset: -20;
            }
          }
        `}</style>

        {/* Connections (Edges) with dash-array animation */}
        <g stroke="#0d9488" strokeWidth="1.5" strokeOpacity="0.4">
          <line x1="200" y1="90" x2="70" y2="40" style={{ strokeDasharray: '4 4', animation: 'dash 5s linear infinite' }} />
          <line x1="200" y1="90" x2="100" y2="140" style={{ strokeDasharray: '4 4', animation: 'dash 6s linear infinite' }} />
          <line x1="200" y1="90" x2="330" y2="50" style={{ strokeDasharray: '4 4', animation: 'dash 4s linear infinite' }} />
          <line x1="200" y1="90" x2="290" y2="140" style={{ strokeDasharray: '4 4', animation: 'dash 7s linear infinite' }} />
        </g>

        {/* Central Patient Node */}
        <g>
          <circle cx="200" cy="90" r="22" fill="#0d9488" fillOpacity="0.15" stroke="#0d9488" strokeWidth="2.5" className="animate-pulse" />
          <circle cx="200" cy="90" r="16" fill="#0d9488" />
          <text x="200" y="93" textAnchor="middle" fill="#ffffff" className="text-[10px] font-extrabold select-none">YOU</text>
        </g>

        {/* Orbiting Node 1: Conditions */}
        <g>
          <circle cx="70" cy="40" r="14" fill="#f59e0b" fillOpacity="0.1" stroke="#f59e0b" strokeWidth="1.5" />
          <circle cx="70" cy="40" r="10" fill="#f59e0b" />
          <text x="70" y="43" textAnchor="middle" fill="#ffffff" className="text-[8px] font-extrabold select-none">DX</text>
          <text x="70" y="18" textAnchor="middle" className="text-[8px] font-bold fill-slate-555 dark:fill-slate-400 select-none">Diabetes</text>
        </g>

        {/* Orbiting Node 2: Medications */}
        <g>
          <circle cx="100" cy="140" r="14" fill="#14b8a6" fillOpacity="0.1" stroke="#14b8a6" strokeWidth="1.5" />
          <circle cx="100" cy="140" r="10" fill="#14b8a6" />
          <text x="100" y="143" textAnchor="middle" fill="#ffffff" className="text-[8px] font-extrabold select-none">Rx</text>
          <text x="100" y="163" textAnchor="middle" className="text-[8px] font-bold fill-slate-555 dark:fill-slate-400 select-none">Metformin</text>
        </g>

        {/* Orbiting Node 3: Lab Results */}
        <g>
          <circle cx="330" cy="50" r="14" fill="#8b5cf6" fillOpacity="0.1" stroke="#8b5cf6" strokeWidth="1.5" />
          <circle cx="330" cy="50" r="10" fill="#8b5cf6" />
          <text x="330" y="53" textAnchor="middle" fill="#ffffff" className="text-[8px] font-extrabold select-none">Lab</text>
          <text x="330" y="73" textAnchor="middle" className="text-[8px] font-bold fill-slate-555 dark:fill-slate-400 select-none">HbA1c</text>
        </g>

        {/* Orbiting Node 4: Documents */}
        <g>
          <circle cx="290" cy="140" r="14" fill="#3b82f6" fillOpacity="0.1" stroke="#3b82f6" strokeWidth="1.5" />
          <circle cx="290" cy="140" r="10" fill="#3b82f6" />
          <text x="290" y="143" textAnchor="middle" fill="#ffffff" className="text-[8px] font-extrabold select-none">Doc</text>
          <text x="290" y="163" textAnchor="middle" className="text-[8px] font-bold fill-slate-555 dark:fill-slate-400 select-none">Records</text>
        </g>
      </svg>

      <div className="text-center z-10 w-full">
        <span className="text-[9px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider bg-teal-50 dark:bg-teal-950/30 px-2 py-0.5 rounded border border-teal-100 dark:border-teal-900/50 block truncate">
          Memory Graph Active: {nodesCount} Nodes
        </span>
      </div>
    </div>
  );
};

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
                      <LabTrendChart trend={trend} />
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
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Insights list column */}
                <div className="lg:col-span-2 space-y-4">
                  {clinicalInsights.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs italic bg-slate-50/20 dark:bg-slate-950/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
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

                {/* Graph Visualization column */}
                <div className="lg:col-span-1">
                  <AIKnowledgeGraphVisualizer 
                    patientName={patient?.fullName || "Patient"} 
                    nodesCount={graphMetrics.nodes || 0} 
                    edgesCount={graphMetrics.edges || 0} 
                  />
                </div>
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

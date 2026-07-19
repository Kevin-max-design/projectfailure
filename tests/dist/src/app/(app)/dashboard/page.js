"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
const AppShell_1 = __importDefault(require("@/components/layout/AppShell"));
const service_1 = require("@/lib/supabase/service");
const utils_1 = require("@/lib/utils");
const brand_1 = require("@/config/brand");
const mode_1 = require("@/lib/mode");
const navigation_1 = require("next/navigation");
function DashboardPage() {
    var _a, _b, _c, _d, _e, _f;
    const router = (0, navigation_1.useRouter)();
    const [patient, setPatient] = (0, react_1.useState)(null);
    const [recentEvents, setRecentEvents] = (0, react_1.useState)([]);
    const [documentsNeedingReview, setDocumentsNeedingReview] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        const loadDashboardData = async () => {
            if ((0, mode_1.isDemoMode)()) {
                if (typeof window !== 'undefined') {
                    const storedProfile = localStorage.getItem('medmemory_patient_profile');
                    if (storedProfile) {
                        setPatient(JSON.parse(storedProfile));
                    }
                    else {
                        setPatient(service_1.DEMO_PATIENT);
                    }
                    // Load medical events sorted by date desc
                    const eventsRes = service_1.mockDb.query('medical_events').select().order('event_date', { ascending: false });
                    setRecentEvents(eventsRes.data.slice(0, 4));
                    // Load documents needing review
                    const docsRes = service_1.mockDb.query('documents').select().eq('processing_status', 'awaiting_review');
                    setDocumentsNeedingReview(docsRes.data || []);
                }
                setLoading(false);
            }
            else {
                try {
                    const { createClient } = await Promise.resolve().then(() => __importStar(require('@/lib/supabase/client')));
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
                }
                catch (err) {
                    console.error('Failed to load dashboard data:', err);
                }
                finally {
                    setLoading(false);
                }
            }
        };
        loadDashboardData();
    }, [router]);
    if (loading || !patient) {
        return ((0, jsx_runtime_1.jsx)(AppShell_1.default, { children: (0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center min-h-[400px]", children: (0, jsx_runtime_1.jsx)("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" }) }) }));
    }
    return ((0, jsx_runtime_1.jsx)(AppShell_1.default, { children: (0, jsx_runtime_1.jsxs)("div", { className: "space-y-8", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("h1", { className: "text-3xl font-extrabold text-slate-900 dark:text-white", children: ["Good morning, ", patient.fullName] }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-500 dark:text-slate-400 text-sm mt-1", children: "Your health memory, organized in one place." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex space-x-3", children: [(0, jsx_runtime_1.jsxs)(link_1.default, { href: "/app/help", className: "inline-flex items-center px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Activity, { className: "h-4 w-4 mr-2 animate-pulse" }), "I Need Medical Help"] }), (0, jsx_runtime_1.jsxs)(link_1.default, { href: "/app/documents", className: "inline-flex items-center px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "h-4 w-4 mr-2" }), "Upload Medical Record"] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-teal-50/50 dark:bg-slate-800/40 border border-teal-150/40 dark:border-slate-700/50 rounded-xl p-4 flex items-start space-x-3", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.TrendingUp, { className: "h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-slate-600 dark:text-slate-300 leading-relaxed", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-teal-800 dark:text-teal-400", children: "Disclaimer:" }), " ", brand_1.BRAND_CONFIG.medicalDisclaimer] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-8", children: [(0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-6 shadow-sm", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3", children: [(0, jsx_runtime_1.jsxs)("h3", { className: "text-md font-bold text-slate-800 dark:text-slate-200 flex items-center", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Activity, { className: "h-5 w-5 text-teal-600 mr-2" }), "Health Snapshot"] }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400 px-2 py-0.5 rounded-full uppercase tracking-wider", children: patient.bloodGroup || 'O+' })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4 text-sm", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1.5", children: "Known Conditions" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap gap-1.5", children: [(_a = patient.knownChronicConditions) === null || _a === void 0 ? void 0 : _a.map((cond, i) => ((0, jsx_runtime_1.jsx)("span", { className: "px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium", children: cond }, i))), !((_b = patient.knownChronicConditions) === null || _b === void 0 ? void 0 : _b.length) && ((0, jsx_runtime_1.jsx)("span", { className: "text-slate-400 text-xs italic", children: "No chronic conditions listed." }))] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1.5", children: "Allergies" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap gap-1.5", children: [(_c = patient.knownAllergies) === null || _c === void 0 ? void 0 : _c.map((alg, i) => ((0, jsx_runtime_1.jsx)("span", { className: "px-2.5 py-1 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-full text-xs font-medium", children: alg }, i))), !((_d = patient.knownAllergies) === null || _d === void 0 ? void 0 : _d.length) && ((0, jsx_runtime_1.jsx)("span", { className: "text-slate-400 text-xs italic", children: "No known allergies." }))] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1.5", children: "Current Long-term Medications" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-1.5", children: [(_e = patient.currentLongTermMedications) === null || _e === void 0 ? void 0 : _e.map((med, i) => ((0, jsx_runtime_1.jsx)("div", { className: "bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300", children: med }, i))), !((_f = patient.currentLongTermMedications) === null || _f === void 0 ? void 0 : _f.length) && ((0, jsx_runtime_1.jsx)("span", { className: "text-slate-400 text-xs italic", children: "No active daily medications." }))] })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "lg:col-span-2 space-y-6", children: [documentsNeedingReview.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/20 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-pulse", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-3", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertTriangle, { className: "h-5 w-5 text-amber-600 flex-shrink-0" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h4", { className: "text-sm font-semibold text-slate-850 dark:text-amber-400", children: "Review Required" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: ["You have ", documentsNeedingReview.length, " document", documentsNeedingReview.length > 1 ? 's' : '', " awaiting extraction verification."] })] })] }), (0, jsx_runtime_1.jsx)(link_1.default, { href: `/app/documents/${documentsNeedingReview[0].id}/review`, className: "px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors", children: "Verify Now" })] })), (0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-md font-bold text-slate-800 dark:text-slate-200", children: "Recent Medical Events" }), (0, jsx_runtime_1.jsxs)(link_1.default, { href: "/app/timeline", className: "text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center", children: ["View Full Timeline", (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { className: "h-3.5 w-3.5 ml-1" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "relative pl-6 timeline-line space-y-6", children: [recentEvents.map((event, i) => ((0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("span", { className: "absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-teal-600 bg-white dark:bg-slate-900 z-10" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-400 font-bold block", children: (0, utils_1.formatDate)(event.event_date) }), (0, jsx_runtime_1.jsx)("h4", { className: "text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5", children: event.title }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-slate-500 mt-1 leading-relaxed", children: event.summary }), event.hospital_name && ((0, jsx_runtime_1.jsx)("span", { className: "text-[10px] bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-md mt-1.5 inline-block font-semibold", children: event.hospital_name }))] })] }, i))), recentEvents.length === 0 && ((0, jsx_runtime_1.jsx)("div", { className: "text-center py-6 text-slate-400 text-sm", children: "Your health timeline is empty. Upload a medical document to generate events." }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4", children: [(0, jsx_runtime_1.jsxs)(link_1.default, { href: "/app/documents", className: "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center group transition-all", children: [(0, jsx_runtime_1.jsx)("div", { className: "p-3 bg-teal-50 dark:bg-teal-950/20 text-teal-600 rounded-xl mb-3 group-hover:scale-105 transition-transform", children: (0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { className: "h-5 w-5" }) }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm font-bold text-slate-800 dark:text-slate-200", children: "Upload Record" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-400 mt-1", children: "Add files or photos" })] }), (0, jsx_runtime_1.jsxs)(link_1.default, { href: "/app/help", className: "bg-white hover:bg-slate-55 dark:bg-slate-900 dark:hover:bg-slate-800/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center group transition-all", children: [(0, jsx_runtime_1.jsx)("div", { className: "p-3 bg-red-50 dark:bg-red-950/20 text-red-650 rounded-xl mb-3 group-hover:scale-105 transition-transform", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Activity, { className: "h-5 w-5 animate-pulse" }) }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm font-bold text-slate-800 dark:text-slate-200", children: "Get Medical Help" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-400 mt-1", children: "Triage intake summary" })] }), (0, jsx_runtime_1.jsxs)(link_1.default, { href: "/app/doctor-brief", className: "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center group transition-all", children: [(0, jsx_runtime_1.jsx)("div", { className: "p-3 bg-teal-50 dark:bg-teal-950/20 text-teal-650 rounded-xl mb-3 group-hover:scale-105 transition-transform", children: (0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { className: "h-5 w-5" }) }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm font-bold text-slate-800 dark:text-slate-200", children: "Doctor Briefs" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-400 mt-1", children: "Handoff summaries" })] }), (0, jsx_runtime_1.jsxs)(link_1.default, { href: "/app/emergency", className: "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center group transition-all", children: [(0, jsx_runtime_1.jsx)("div", { className: "p-3 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-xl mb-3 group-hover:scale-105 transition-transform", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ShieldAlert, { className: "h-5 w-5" }) }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm font-bold text-slate-800 dark:text-slate-200", children: "Emergency ID" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-400 mt-1", children: "Configure emergency QR" })] }), (0, jsx_runtime_1.jsxs)(link_1.default, { href: "/app/ask", className: "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center group transition-all", children: [(0, jsx_runtime_1.jsx)("div", { className: "p-3 bg-teal-50 dark:bg-teal-950/20 text-teal-600 rounded-xl mb-3 group-hover:scale-105 transition-transform", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Search, { className: "h-5 w-5" }) }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm font-bold text-slate-800 dark:text-slate-200", children: "Ask Records" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-400 mt-1", children: "Grounded RAG QA" })] })] })] })] })] }) }));
}

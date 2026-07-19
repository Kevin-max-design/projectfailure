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
exports.default = DoctorBriefDetailsPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
const AppShell_1 = __importDefault(require("@/components/layout/AppShell"));
const service_1 = require("@/lib/supabase/service");
const utils_1 = require("@/lib/utils");
const mode_1 = require("@/lib/mode");
const brand_1 = require("@/config/brand");
function DoctorBriefDetailsPage() {
    var _a, _b, _c, _d, _e;
    const params = (0, navigation_1.useParams)();
    const router = (0, navigation_1.useRouter)();
    const id = params.id;
    const [brief, setBrief] = (0, react_1.useState)(null);
    const [patient, setPatient] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    // Evidence Modal State
    const [selectedEvidence, setSelectedEvidence] = (0, react_1.useState)(null);
    // Share Modal State
    const [shareModalOpen, setShareModalOpen] = (0, react_1.useState)(false);
    const [shareDuration, setShareDuration] = (0, react_1.useState)(60); // minutes
    const [shareLink, setShareLink] = (0, react_1.useState)('');
    const [shareExpires, setShareExpires] = (0, react_1.useState)(null);
    const [copied, setCopied] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        loadData();
    }, [id]);
    const loadData = async () => {
        if ((0, mode_1.isDemoMode)()) {
            const briefData = service_1.mockDb.query('doctor_briefs').select().eq('id', id).single().data;
            if (!briefData) {
                alert('Brief not found');
                router.push('/app/doctor-brief');
                return;
            }
            setBrief(briefData);
            const storedProfile = localStorage.getItem('medmemory_patient_profile');
            setPatient(storedProfile ? JSON.parse(storedProfile) : service_1.DEMO_PATIENT);
            setLoading(false);
        }
        else {
            try {
                const res = await fetch(`/api/doctor-brief/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setBrief(data);
                    // Get patient info
                    const { createClient } = await Promise.resolve().then(() => __importStar(require('@/lib/supabase/client')));
                    const supabase = createClient();
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: p } = await supabase.from('patients').select('*').eq('user_id', user.id).single();
                        setPatient(p);
                    }
                }
                else {
                    router.push('/app/doctor-brief');
                }
            }
            catch (err) {
                console.error('Error fetching brief details:', err);
            }
            finally {
                setLoading(false);
            }
        }
    };
    const handlePrint = () => {
        window.print();
    };
    const handleGenerateShareLink = async () => {
        if ((0, mode_1.isDemoMode)()) {
            const mockToken = `tok-brf-${Math.random().toString(36).substring(2, 12)}`;
            const link = `${window.location.origin}/share/doctor/${mockToken}`;
            const expires = new Date(Date.now() + shareDuration * 60 * 1000).toISOString();
            service_1.mockDb.query('medical_share_tokens').insert({
                id: `tok-${Math.random().toString(36).substring(7)}`,
                patient_id: patient.id,
                brief_id: id,
                token_hash: mockToken, // simplify matching for demo
                scope: 'read_brief',
                expires_at: expires
            });
            setShareLink(link);
            setShareExpires(expires);
        }
        else {
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
                }
                else {
                    alert('Error generating share link');
                }
            }
            catch (err) {
                console.error('Error creating share token:', err);
            }
        }
    };
    const handleRevokeShares = async () => {
        if ((0, mode_1.isDemoMode)()) {
            service_1.mockDb.query('medical_share_tokens').delete().eq('brief_id', id);
            setShareLink('');
            setShareExpires(null);
            alert('All active share links revoked.');
        }
        else {
            try {
                const res = await fetch(`/api/doctor-brief/${id}/share`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    setShareLink('');
                    setShareExpires(null);
                    alert('All active share links revoked.');
                }
                else {
                    alert('Failed to revoke shares');
                }
            }
            catch (err) {
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
        return ((0, jsx_runtime_1.jsx)(AppShell_1.default, { children: (0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center min-h-[400px]", children: (0, jsx_runtime_1.jsx)("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" }) }) }));
    }
    const content = brief.structured_content;
    const reason = content.currentReason;
    // Calculate age
    const dob = new Date(patient.dateOfBirth);
    const ageDiff = Date.now() - dob.getTime();
    const ageDate = new Date(ageDiff);
    const patientAge = Math.abs(ageDate.getUTCFullYear() - 1970);
    return ((0, jsx_runtime_1.jsxs)(AppShell_1.default, { children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-6 max-w-4xl mx-auto pb-16 print:p-0 print:m-0 print:max-w-full", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between print:hidden", children: [(0, jsx_runtime_1.jsxs)(link_1.default, { href: "/app/doctor-brief", className: "inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ArrowLeft, { className: "h-4 w-4 mr-1" }), "Back to briefs"] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex space-x-2", children: [(0, jsx_runtime_1.jsxs)("button", { onClick: () => setShareModalOpen(true), className: "inline-flex items-center px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Share2, { className: "h-4 w-4 mr-1.5" }), "Share Link"] }), (0, jsx_runtime_1.jsxs)("button", { onClick: handlePrint, className: "inline-flex items-center px-4 py-2 bg-teal-650 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Printer, { className: "h-4 w-4 mr-1.5" }), "Print / Save PDF"] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-8 md:p-12 rounded-3xl shadow-sm print:border-none print:shadow-none print:p-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "border-b-2 border-slate-100 dark:border-slate-800 pb-6 flex flex-col md:flex-row md:justify-between md:items-start space-y-4 md:space-y-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-1", children: [(0, jsx_runtime_1.jsxs)("h2", { className: "text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase", children: [brand_1.BRAND_CONFIG.name, " \u2014 Clinical Doctor Brief"] }), (0, jsx_runtime_1.jsx)("p", { className: "text-[10px] text-slate-400 font-bold uppercase tracking-wider", children: "Temporary Medical History Summary Handoff" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "text-xs md:text-right space-y-1 text-slate-500 dark:text-slate-400", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "font-bold", children: "Generated:" }), " ", (0, utils_1.formatDate)(brief.generated_at)] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "font-bold", children: "Method:" }), " ", brief.generation_method === 'ai_openai' ? 'Verified AI Summary' : 'Deterministic Layout'] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-b border-slate-105 dark:border-slate-800 text-xs", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5", children: "Patient Name" }), (0, jsx_runtime_1.jsx)("span", { className: "font-extrabold text-slate-850 dark:text-white text-sm", children: patient.fullName })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5", children: "Age / DOB" }), (0, jsx_runtime_1.jsxs)("span", { className: "font-semibold text-slate-800 dark:text-slate-205", children: [patientAge, " Years (", (0, utils_1.formatDate)(patient.dateOfBirth), ")"] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5", children: "Blood Group" }), (0, jsx_runtime_1.jsxs)("span", { className: "font-bold text-red-650 text-sm", children: [patient.bloodGroup || 'Unknown', (0, jsx_runtime_1.jsx)("span", { className: "text-[8px] bg-slate-50 text-slate-400 px-1 py-0.5 rounded ml-1 tracking-normal font-normal", children: "PATIENT ENTERED" })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5", children: "Emergency Contact" }), (0, jsx_runtime_1.jsxs)("span", { className: "font-semibold text-slate-800 dark:text-slate-205", children: [patient.emergencyContactName, " (", patient.emergencyContactPhone, ")"] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-8 pt-8", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider", children: "Current Reason for Visit" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[9px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider", children: "PATIENT REPORTED" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-50/50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "font-bold text-slate-400 block mb-0.5", children: "Category:" }), " ", (0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-slate-800 dark:text-slate-200", children: reason.category })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "font-bold text-slate-400 block mb-0.5", children: "Onset:" }), " ", (0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-slate-800 dark:text-slate-200", children: reason.onset })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "font-bold text-slate-400 block mb-0.5", children: "Severity Index:" }), " ", (0, jsx_runtime_1.jsx)("span", { className: "font-bold text-red-600", children: reason.severity })] })] }), ((_a = reason.symptoms) === null || _a === void 0 ? void 0 : _a.length) > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "text-xs", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-bold text-slate-400 block mb-1", children: "Associated Symptoms:" }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-1.5", children: reason.symptoms.map((s, idx) => ((0, jsx_runtime_1.jsx)("span", { className: "px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-semibold text-[10px]", children: s }, idx))) })] })), reason.description && ((0, jsx_runtime_1.jsxs)("div", { className: "text-xs border-t border-slate-100 dark:border-slate-800 pt-3", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-bold text-slate-400 block mb-1", children: "Patient Context Statement:" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-slate-750 leading-relaxed italic", children: ["\"", reason.description, "\""] })] }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider", children: "Relevant Documented History" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[9px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider", children: "DOCUMENT VERIFIED" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [(_b = content.relevantHistory) === null || _b === void 0 ? void 0 : _b.map((h, idx) => ((0, jsx_runtime_1.jsxs)("div", { className: "p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-start justify-between gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-1.5 flex-1", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-bold text-slate-800 dark:text-slate-200 text-xs", children: h.title }), (0, jsx_runtime_1.jsxs)("span", { className: "text-[10px] text-slate-405 font-medium", children: ["(", (0, utils_1.formatDate)(h.date), ")"] })] }), (0, jsx_runtime_1.jsx)("p", { className: "text-[11px] text-slate-500 leading-relaxed", children: h.details }), (0, jsx_runtime_1.jsxs)("p", { className: "text-[10px] text-teal-650 font-bold bg-teal-50/40 dark:bg-teal-950/20 px-2 py-1 rounded inline-block", children: [(0, jsx_runtime_1.jsx)("span", { className: "uppercase text-[8px] mr-1", children: "RELEVANCE:" }), " ", h.relevanceExplanation] })] }), h.sourceDocumentId && ((0, jsx_runtime_1.jsxs)("button", { onClick: () => setSelectedEvidence({
                                                                    title: h.title,
                                                                    snippet: h.sourceText || '',
                                                                    docId: h.sourceDocumentId,
                                                                    page: h.sourcePage
                                                                }), className: "self-start sm:self-center px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center space-x-1 print:hidden", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Eye, { className: "h-3.5 w-3.5" }), (0, jsx_runtime_1.jsx)("span", { children: "View Evidence" })] }))] }, idx))), (!content.relevantHistory || content.relevantHistory.length === 0) && ((0, jsx_runtime_1.jsx)("div", { className: "text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl text-center", children: "No verified prior medical history records matching symptom categories were found in MedMemory." }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider block", children: "Current Medications" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-2", children: [(_c = content.currentMedications) === null || _c === void 0 ? void 0 : _c.map((m, idx) => ((0, jsx_runtime_1.jsxs)("div", { className: "p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-bold text-slate-800 dark:text-slate-200", children: m.name }), (0, jsx_runtime_1.jsx)("span", { className: "text-[8px] bg-teal-50 text-teal-700 px-1 py-0.5 rounded uppercase font-bold", children: "Verified" })] }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-500 mt-1 block", children: m.details })] }, idx))), (!content.currentMedications || content.currentMedications.length === 0) && ((0, jsx_runtime_1.jsx)("div", { className: "text-xs text-slate-400 italic p-3 bg-slate-50/50 rounded-xl text-center", children: "No active daily medications found in available records." }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider block", children: "Known Allergies" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-2", children: [(_d = content.allergies) === null || _d === void 0 ? void 0 : _d.map((a, idx) => ((0, jsx_runtime_1.jsx)("div", { className: "p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-105 dark:border-slate-800 text-xs", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-bold text-slate-800 dark:text-slate-200", children: a.name }), (0, jsx_runtime_1.jsx)("span", { className: "text-[8px] bg-amber-50 text-amber-700 px-1 py-0.5 rounded uppercase font-bold", children: a.provenance.replace('_', ' ') })] }) }, idx))), (!content.allergies || content.allergies.length === 0) && ((0, jsx_runtime_1.jsx)("div", { className: "text-xs text-slate-400 italic p-3 bg-slate-50/50 rounded-xl text-center", children: "No verified allergy information was found." }))] })] })] }), ((_e = content.relevantInvestigations) === null || _e === void 0 ? void 0 : _e.length) > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider block", children: "Relevant Investigations & Labs" }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-2", children: content.relevantInvestigations.map((inv, idx) => ((0, jsx_runtime_1.jsxs)("div", { className: "p-3.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-center", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-bold text-slate-800 dark:text-slate-200", children: inv.title }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-400", children: (0, utils_1.formatDate)(inv.date) })] }), (0, jsx_runtime_1.jsx)("p", { className: "text-[10px] text-slate-500 mt-1 leading-relaxed", children: inv.details })] }, idx))) })] })), (0, jsx_runtime_1.jsxs)("div", { className: "border-t border-slate-100 dark:border-slate-800 pt-6 text-[10px] text-slate-400 font-medium leading-relaxed", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-bold block text-slate-500 mb-1", children: "Disclaimer & Limitations" }), content.limitations] })] })] })] }), selectedEvidence && ((0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl animate-scaleIn", children: [(0, jsx_runtime_1.jsxs)("div", { className: "p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center", children: [(0, jsx_runtime_1.jsx)("h4", { className: "font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider", children: "Provenance Evidence Verification" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setSelectedEvidence(null), className: "text-slate-400 hover:text-slate-600", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-5 w-5" }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "p-6 space-y-4 text-xs", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-400 font-bold uppercase tracking-wider block", children: "Record Name" }), (0, jsx_runtime_1.jsx)("span", { className: "font-bold text-slate-850 dark:text-white", children: selectedEvidence.title })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-400 font-bold uppercase tracking-wider block", children: "Original Source Snippet" }), (0, jsx_runtime_1.jsxs)("div", { className: "p-3.5 bg-slate-50 dark:bg-slate-950 font-mono rounded-xl border border-slate-100 dark:border-slate-850 text-[10px] text-slate-750 dark:text-slate-300 leading-relaxed italic", children: ["\"", selectedEvidence.snippet || 'Referenced document text segment.', "\""] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 gap-4 pt-2", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5", children: "Source Document ID" }), (0, jsx_runtime_1.jsxs)("span", { className: "font-bold text-slate-700 dark:text-slate-300 truncate block", children: [selectedEvidence.docId.substring(0, 12), "..."] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5", children: "Page Number" }), (0, jsx_runtime_1.jsxs)("span", { className: "font-bold text-slate-700 dark:text-slate-300", children: ["Page ", selectedEvidence.page || 1] })] })] })] })] }) })), shareModalOpen && ((0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 max-w-md w-full rounded-2xl overflow-hidden shadow-2xl", children: [(0, jsx_runtime_1.jsxs)("div", { className: "p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center", children: [(0, jsx_runtime_1.jsxs)("h4", { className: "font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Lock, { className: "h-4 w-4 text-teal-650 mr-1.5" }), "Temporary Share Handoff Link"] }), (0, jsx_runtime_1.jsx)("button", { onClick: () => { setShareModalOpen(false); setShareLink(''); }, className: "text-slate-400 hover:text-slate-600", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-5 w-5" }) })] }), (0, jsx_runtime_1.jsx)("div", { className: "p-6 space-y-5 text-xs", children: !shareLink ? ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-slate-500 leading-relaxed text-[11px]", children: "Generate a high-entropy sharing URL. The recipient can view ONLY this specific brief snapshot. The link will automatically deactivate when it expires." }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5", children: "Link Expiry Duration" }), (0, jsx_runtime_1.jsxs)("select", { value: shareDuration, onChange: (e) => setShareDuration(Number(e.target.value)), className: "w-full p-2.5 bg-slate-50 border border-slate-100 dark:bg-slate-850 dark:border-slate-800 rounded-xl font-semibold text-xs", children: [(0, jsx_runtime_1.jsx)("option", { value: 15, children: "15 Minutes" }), (0, jsx_runtime_1.jsx)("option", { value: 60, children: "1 Hour" }), (0, jsx_runtime_1.jsx)("option", { value: 1440, children: "24 Hours" })] })] }), (0, jsx_runtime_1.jsx)("button", { onClick: handleGenerateShareLink, className: "w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors", children: "Generate Secure Link" })] })) : ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-405 font-bold uppercase tracking-wider block", children: "Your Sharing Link" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-mono text-[10px] text-slate-700 dark:text-slate-300 truncate flex-1", children: shareLink }), (0, jsx_runtime_1.jsx)("button", { onClick: handleCopyLink, className: "p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500", title: "Copy to clipboard", children: copied ? (0, jsx_runtime_1.jsx)(lucide_react_1.CheckCircle, { className: "h-4.5 w-4.5 text-teal-600" }) : (0, jsx_runtime_1.jsx)(lucide_react_1.Copy, { className: "h-4.5 w-4.5" }) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "text-[10px] text-slate-400 font-bold bg-amber-50/50 p-3 rounded-lg border border-amber-100", children: ["Expires at: ", new Date(shareExpires).toLocaleString()] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex space-x-2 pt-2", children: [(0, jsx_runtime_1.jsxs)("button", { onClick: handleRevokeShares, className: "flex-1 py-2 border border-red-200 dark:border-red-900 text-red-650 hover:bg-red-50 rounded-xl font-bold flex items-center justify-center space-x-1", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { className: "h-4 w-4" }), (0, jsx_runtime_1.jsx)("span", { children: "Revoke Link" })] }), (0, jsx_runtime_1.jsx)("button", { onClick: () => { setShareModalOpen(false); setShareLink(''); }, className: "flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold", children: "Close" })] })] })) })] }) }))] }));
}

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
exports.default = ProfilePage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const AppShell_1 = __importDefault(require("@/components/layout/AppShell"));
const demo_data_1 = require("@/lib/extraction/demo-data");
const mode_1 = require("@/lib/mode");
const navigation_1 = require("next/navigation");
function ProfilePage() {
    const router = (0, navigation_1.useRouter)();
    const [patient, setPatient] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const loadProfile = async () => {
            if ((0, mode_1.isDemoMode)()) {
                if (typeof window !== 'undefined') {
                    const storedProfile = localStorage.getItem('medmemory_patient_profile');
                    if (storedProfile) {
                        setPatient(JSON.parse(storedProfile));
                    }
                    else {
                        setPatient(demo_data_1.DEMO_PATIENT);
                    }
                }
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
                    const { data: patientData, error } = await supabase
                        .from('patients')
                        .select('*')
                        .eq('user_id', user.id)
                        .single();
                    if (error || !patientData) {
                        console.log('No patient record found for user in profile page, redirecting...');
                        router.push('/app/onboarding');
                        return;
                    }
                    setPatient({
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
                    });
                }
                catch (err) {
                    console.error('Failed to load profile:', err);
                }
            }
        };
        loadProfile();
    }, [router]);
    const handleExportData = () => {
        if (!patient)
            return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(patient, null, 2));
        const downloadAnchor = window.document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `medmemory_export_${patient.fullName.replace(/\s+/g, '_')}.json`);
        window.document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    };
    const handleDeleteAccount = async () => {
        if (confirm('CAUTION: Are you sure you want to delete your MedMemory account? All uploaded medical documents and historical timeline records will be permanently deleted. This action cannot be undone.')) {
            if ((0, mode_1.isDemoMode)()) {
                if (typeof window !== 'undefined') {
                    localStorage.clear();
                    window.location.href = '/register';
                }
            }
            else {
                try {
                    const res = await fetch('/api/profile', { method: 'DELETE' });
                    if (!res.ok) {
                        const errData = await res.json();
                        alert(errData.error || 'Failed to delete account.');
                        return;
                    }
                    if (typeof window !== 'undefined') {
                        localStorage.clear();
                        window.location.href = '/register';
                    }
                }
                catch (err) {
                    console.error('Failed to delete account:', err);
                    alert('Failed to delete account. Please try again.');
                }
            }
        }
    };
    if (!patient) {
        return ((0, jsx_runtime_1.jsx)(AppShell_1.default, { children: (0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center min-h-[400px]", children: (0, jsx_runtime_1.jsx)("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" }) }) }));
    }
    return ((0, jsx_runtime_1.jsx)(AppShell_1.default, { children: (0, jsx_runtime_1.jsxs)("div", { className: "space-y-8", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-3xl font-extrabold text-slate-900 dark:text-white", children: "Profile / Settings" }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-500 dark:text-slate-400 text-sm mt-1", children: "Manage your personal profile, privacy settings, and data exports." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 md:p-8 rounded-2xl shadow-sm space-y-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-4 border-b border-slate-50 dark:border-slate-800 pb-5", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-16 w-16 rounded-2xl bg-teal-50 dark:bg-teal-950/20 text-teal-650 flex items-center justify-center font-bold text-2xl", children: patient.fullName.split(' ').map((n) => n[0]).join('') }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { className: "font-extrabold text-slate-900 dark:text-white text-lg", children: patient.fullName }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5", children: "Patient Owned Digital Record" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 text-xs", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsx)("h4", { className: "text-[10px] text-slate-400 uppercase tracking-wider font-bold", children: "Personal Profile" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-3", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Calendar, { className: "h-4.5 w-4.5 text-slate-400" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-slate-400 block text-[9px] font-semibold uppercase", children: "Date of Birth" }), (0, jsx_runtime_1.jsx)("span", { className: "font-bold text-slate-800 dark:text-slate-200", children: patient.dateOfBirth })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-3", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.User, { className: "h-4.5 w-4.5 text-slate-400" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-slate-400 block text-[9px] font-semibold uppercase", children: "Gender" }), (0, jsx_runtime_1.jsx)("span", { className: "font-bold text-slate-800 dark:text-slate-200", children: patient.gender || 'Not specified' })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-3", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Heart, { className: "h-4.5 w-4.5 text-red-500" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-slate-400 block text-[9px] font-semibold uppercase", children: "Blood Group" }), (0, jsx_runtime_1.jsx)("span", { className: "font-bold text-slate-850 dark:text-white", children: patient.bloodGroup || 'Not specified' })] })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsx)("h4", { className: "text-[10px] text-slate-405 uppercase tracking-wider font-bold", children: "Contact Details" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-3", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Phone, { className: "h-4.5 w-4.5 text-slate-400" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-slate-400 block text-[9px] font-semibold uppercase", children: "Phone Number" }), (0, jsx_runtime_1.jsx)("span", { className: "font-bold text-slate-800 dark:text-slate-200", children: patient.phone || 'Not specified' })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-3", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Mail, { className: "h-4.5 w-4.5 text-slate-400" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-slate-400 block text-[9px] font-semibold uppercase", children: "Registered Email" }), (0, jsx_runtime_1.jsx)("span", { className: "font-bold text-slate-800 dark:text-slate-200", children: "arjun.rao@medmemory.demo" })] })] })] })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 md:p-8 rounded-2xl shadow-sm space-y-6", children: [(0, jsx_runtime_1.jsxs)("h3", { className: "font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ShieldCheck, { className: "h-5 w-5 text-teal-650 mr-2" }), "Data Protection & Control Settings"] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "p-4 border border-slate-100 dark:border-slate-800 rounded-xl space-y-3", children: [(0, jsx_runtime_1.jsx)("h4", { className: "font-bold text-slate-800 dark:text-slate-200 text-xs", children: "Export Complete Health File" }), (0, jsx_runtime_1.jsx)("p", { className: "text-[10px] text-slate-450 leading-relaxed", children: "Download your entire medical timeline, including verified diagnoses, allergies, and patient metadata, as a portable JSON file." }), (0, jsx_runtime_1.jsxs)("button", { onClick: handleExportData, className: "inline-flex items-center px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Download, { className: "h-4 w-4 mr-1.5" }), "Export Medical JSON"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "p-4 border border-red-100 dark:border-red-950/20 rounded-xl space-y-3", children: [(0, jsx_runtime_1.jsx)("h4", { className: "font-bold text-[#ef4444] text-xs", children: "Delete MedMemory Account" }), (0, jsx_runtime_1.jsx)("p", { className: "text-[10px] text-slate-450 leading-relaxed", children: "Deactivate and delete all personal health files, diagnostic summaries, and emergency QR links. This action cannot be reversed." }), (0, jsx_runtime_1.jsxs)("button", { onClick: handleDeleteAccount, className: "inline-flex items-center px-4 py-2 bg-red-50 hover:bg-red-100 text-[#ef4444] dark:bg-red-950/20 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-900/30 text-xs font-semibold rounded-lg transition-colors", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { className: "h-4 w-4 mr-1.5" }), "Delete Account"] })] })] })] })] }) }));
}

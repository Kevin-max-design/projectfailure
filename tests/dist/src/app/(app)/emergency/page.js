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
exports.default = EmergencySummaryPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
const AppShell_1 = __importDefault(require("@/components/layout/AppShell"));
const service_1 = require("@/lib/supabase/service");
const mode_1 = require("@/lib/mode");
function EmergencySummaryPage() {
    var _a, _b, _c, _d, _e, _f;
    const [patient, setPatient] = (0, react_1.useState)(null);
    const [accessEnabled, setAccessEnabled] = (0, react_1.useState)(true);
    const [token, setToken] = (0, react_1.useState)('demo-active-token-12345');
    const [copied, setCopied] = (0, react_1.useState)(false);
    const [lastUpdated, setLastUpdated] = (0, react_1.useState)('');
    // Disclosure config state
    const [config, setConfig] = (0, react_1.useState)({
        show_name: true,
        show_blood_group: true,
        show_allergies: true,
        show_conditions: true,
        show_medications: true,
        show_contact: true,
        show_surgeries: true,
        show_hospitalizations: true
    });
    // Manual inputs state
    const [manualBloodGroup, setManualBloodGroup] = (0, react_1.useState)('');
    const [manualAllergy, setManualAllergy] = (0, react_1.useState)('');
    const [manualCondition, setManualCondition] = (0, react_1.useState)('');
    const [manualMedication, setManualMedication] = (0, react_1.useState)('');
    const [manualContactName, setManualContactName] = (0, react_1.useState)('');
    const [manualContactPhone, setManualContactPhone] = (0, react_1.useState)('');
    // Save alerts
    const [saveSuccess, setSaveSuccess] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        loadEmergencyData();
    }, []);
    const loadEmergencyData = async () => {
        if ((0, mode_1.isDemoMode)()) {
            const storedProfile = localStorage.getItem('medmemory_patient_profile');
            const p = storedProfile ? JSON.parse(storedProfile) : service_1.DEMO_PATIENT;
            setPatient(p);
            // Load manual inputs
            setManualBloodGroup(p.bloodGroup || '');
            setManualContactName(p.emergencyContactName || '');
            setManualContactPhone(p.emergencyContactPhone || '');
            const enabled = localStorage.getItem('medmemory_emergency_enabled') !== 'false';
            setAccessEnabled(enabled);
            const savedToken = localStorage.getItem('medmemory_emergency_token') || 'demo-active-token-12345';
            setToken(savedToken);
            const localConfig = localStorage.getItem('medmemory_emergency_config');
            if (localConfig) {
                setConfig(JSON.parse(localConfig));
            }
            setLastUpdated(new Date().toISOString());
        }
        else {
            try {
                const { createClient } = await Promise.resolve().then(() => __importStar(require('@/lib/supabase/client')));
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: p } = await supabase.from('patients').select('*').eq('user_id', user.id).single();
                    if (p) {
                        setPatient({
                            id: p.id,
                            fullName: p.full_name,
                            dateOfBirth: p.date_of_birth,
                            gender: p.gender,
                            bloodGroup: p.blood_group,
                            phone: p.phone,
                            emergencyContactName: p.emergency_contact_name,
                            emergencyContactPhone: p.emergency_contact_phone,
                            knownAllergies: p.known_allergies || [],
                            knownChronicConditions: p.known_chronic_conditions || [],
                            currentLongTermMedications: p.current_long_term_medications || []
                        });
                        setManualBloodGroup(p.blood_group || '');
                        setManualContactName(p.emergency_contact_name || '');
                        setManualContactPhone(p.emergency_contact_phone || '');
                    }
                    // Load token
                    const { data: tok } = await supabase
                        .from('emergency_access_tokens')
                        .select('*')
                        .eq('patient_id', p.id)
                        .single();
                    if (tok) {
                        setToken(tok.token);
                        setAccessEnabled(tok.is_enabled);
                    }
                    // Load config
                    const { data: cfg } = await supabase
                        .from('emergency_profile_config')
                        .select('*')
                        .eq('patient_id', p.id)
                        .single();
                    if (cfg) {
                        setConfig({
                            show_name: cfg.show_name,
                            show_blood_group: cfg.show_blood_group,
                            show_allergies: cfg.show_allergies,
                            show_conditions: cfg.show_conditions,
                            show_medications: cfg.show_medications,
                            show_contact: cfg.show_contact,
                            show_surgeries: cfg.show_surgeries,
                            show_hospitalizations: cfg.show_hospitalizations
                        });
                    }
                }
            }
            catch (err) {
                console.error('Error loading emergency summary data:', err);
            }
        }
    };
    const handleToggleAccess = async () => {
        const newState = !accessEnabled;
        setAccessEnabled(newState);
        if ((0, mode_1.isDemoMode)()) {
            localStorage.setItem('medmemory_emergency_enabled', newState.toString());
            service_1.mockDb.query('emergency_access_tokens').update({ is_enabled: newState }).eq('token', token);
        }
        else {
            const { createClient } = await Promise.resolve().then(() => __importStar(require('@/lib/supabase/client')));
            const supabase = createClient();
            await supabase
                .from('emergency_access_tokens')
                .update({ is_enabled: newState })
                .eq('token', token);
            // Audit log
            await supabase.from('activity_logs').insert({
                patient_id: patient.id,
                action: newState ? 'emergency_access_enabled' : 'emergency_access_disabled'
            });
        }
    };
    const handleRegenerateToken = async () => {
        const newToken = `tok-${Math.random().toString(36).substring(2, 15)}`;
        setToken(newToken);
        if ((0, mode_1.isDemoMode)()) {
            localStorage.setItem('medmemory_emergency_token', newToken);
            service_1.mockDb.query('emergency_access_tokens').insert({
                id: `tok-${Math.random().toString(36).substring(7)}`,
                patient_id: (patient === null || patient === void 0 ? void 0 : patient.id) || service_1.DEMO_PATIENT.id,
                token: newToken,
                is_enabled: accessEnabled,
                created_at: new Date().toISOString()
            });
        }
        else {
            const { createClient } = await Promise.resolve().then(() => __importStar(require('@/lib/supabase/client')));
            const supabase = createClient();
            await supabase
                .from('emergency_access_tokens')
                .update({ token: newToken })
                .eq('patient_id', patient.id);
            // Audit log
            await supabase.from('activity_logs').insert({
                patient_id: patient.id,
                action: 'emergency_token_regenerated'
            });
        }
        setLastUpdated(new Date().toISOString());
    };
    const handleCopyLink = () => {
        const link = `${window.location.origin}/emergency/${token}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    const handleSaveConfig = async () => {
        if ((0, mode_1.isDemoMode)()) {
            localStorage.setItem('medmemory_emergency_config', JSON.stringify(config));
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        }
        else {
            try {
                const { createClient } = await Promise.resolve().then(() => __importStar(require('@/lib/supabase/client')));
                const supabase = createClient();
                const { error } = await supabase
                    .from('emergency_profile_config')
                    .upsert({
                    patient_id: patient.id,
                    show_name: config.show_name,
                    show_blood_group: config.show_blood_group,
                    show_allergies: config.show_allergies,
                    show_conditions: config.show_conditions,
                    show_medications: config.show_medications,
                    show_contact: config.show_contact,
                    show_surgeries: config.show_surgeries,
                    show_hospitalizations: config.show_hospitalizations
                }, { onConflict: 'patient_id' });
                if (!error) {
                    setSaveSuccess(true);
                    setTimeout(() => setSaveSuccess(false), 2000);
                }
            }
            catch (err) {
                console.error('Error saving emergency config:', err);
            }
        }
    };
    const handleAddManualItem = async (type) => {
        let updatedProfile = Object.assign({}, patient);
        if (type === 'allergy' && manualAllergy.trim()) {
            updatedProfile.knownAllergies = [...(patient.knownAllergies || []), manualAllergy.trim()];
            setManualAllergy('');
        }
        else if (type === 'condition' && manualCondition.trim()) {
            updatedProfile.knownChronicConditions = [...(patient.knownChronicConditions || []), manualCondition.trim()];
            setManualCondition('');
        }
        else if (type === 'medication' && manualMedication.trim()) {
            updatedProfile.currentLongTermMedications = [...(patient.currentLongTermMedications || []), manualMedication.trim()];
            setManualMedication('');
        }
        setPatient(updatedProfile);
        if ((0, mode_1.isDemoMode)()) {
            localStorage.setItem('medmemory_patient_profile', JSON.stringify(updatedProfile));
        }
        else {
            const { createClient } = await Promise.resolve().then(() => __importStar(require('@/lib/supabase/client')));
            const supabase = createClient();
            await supabase
                .from('patients')
                .update({
                known_allergies: updatedProfile.knownAllergies,
                known_chronic_conditions: updatedProfile.knownChronicConditions,
                current_long_term_medications: updatedProfile.currentLongTermMedications
            })
                .eq('id', patient.id);
        }
    };
    const handleUpdateDemographics = async () => {
        let updatedProfile = Object.assign(Object.assign({}, patient), { bloodGroup: manualBloodGroup, emergencyContactName: manualContactName, emergencyContactPhone: manualContactPhone });
        setPatient(updatedProfile);
        if ((0, mode_1.isDemoMode)()) {
            localStorage.setItem('medmemory_patient_profile', JSON.stringify(updatedProfile));
            alert('Demographics updated successfully.');
        }
        else {
            const { createClient } = await Promise.resolve().then(() => __importStar(require('@/lib/supabase/client')));
            const supabase = createClient();
            await supabase
                .from('patients')
                .update({
                blood_group: manualBloodGroup,
                emergency_contact_name: manualContactName,
                emergency_contact_phone: manualContactPhone
            })
                .eq('id', patient.id);
            alert('Demographics updated successfully.');
        }
    };
    const toggleConfig = (key) => {
        setConfig(Object.assign(Object.assign({}, config), { [key]: !config[key] }));
    };
    if (!patient) {
        return ((0, jsx_runtime_1.jsx)(AppShell_1.default, { children: (0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center min-h-[400px]", children: (0, jsx_runtime_1.jsx)("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" }) }) }));
    }
    return ((0, jsx_runtime_1.jsx)(AppShell_1.default, { children: (0, jsx_runtime_1.jsxs)("div", { className: "space-y-8", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0", children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-3xl font-extrabold text-slate-900 dark:text-white", children: "Emergency Medical Identity" }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-500 dark:text-slate-400 text-sm mt-1", children: "Configure critical clinical summary records shared securely via emergency QR codes." })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-4 rounded-2xl flex items-start space-x-3 shadow-sm", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertTriangle, { className: "h-5 w-5 text-red-650 flex-shrink-0 mt-0.5" }), (0, jsx_runtime_1.jsxs)("div", { className: "text-xs text-red-800 dark:text-red-400 leading-relaxed", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-bold", children: "Privacy Guard:" }), " Emergency information is generated from patient-approved critical summaries and may not represent the complete medical history. In an emergency, always consult qualified health professionals."] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-8", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6", children: [(0, jsx_runtime_1.jsxs)("h3", { className: "font-bold text-slate-850 dark:text-slate-200 text-xs flex items-center uppercase tracking-wider", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.QrCode, { className: "h-4.5 w-4.5 text-teal-650 mr-2" }), "Emergency Access"] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-850 rounded-xl", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xs font-bold text-slate-800 dark:text-slate-200 block", children: "Emergency Public Summary" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-400 mt-0.5 block", children: "Allow scan access to emergency details" })] }), (0, jsx_runtime_1.jsx)("button", { onClick: handleToggleAccess, className: `w-12 h-6.5 rounded-full p-1 transition-colors ${accessEnabled ? 'bg-teal-600' : 'bg-slate-300'}`, children: (0, jsx_runtime_1.jsx)("div", { className: `bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform ${accessEnabled ? 'translate-x-5.5' : 'translate-x-0'}` }) })] }), accessEnabled ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center justify-center p-6 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-850", children: [(0, jsx_runtime_1.jsx)("div", { className: "bg-white p-3 rounded-lg shadow-sm border border-slate-200", children: (0, jsx_runtime_1.jsx)("div", { className: "h-36 w-36 bg-slate-100 flex items-center justify-center text-slate-400 relative", children: (0, jsx_runtime_1.jsx)(lucide_react_1.QrCode, { className: "h-28 w-28 text-slate-800" }) }) }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-500 mt-3 font-semibold", children: "Scan to load Emergency Medical ID" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex space-x-2 mt-5 w-full", children: [(0, jsx_runtime_1.jsxs)("button", { onClick: handleCopyLink, className: "flex-1 inline-flex items-center justify-center px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors space-x-1.5", children: [copied ? (0, jsx_runtime_1.jsx)(lucide_react_1.Check, { className: "h-4 w-4 text-teal-650" }) : (0, jsx_runtime_1.jsx)(lucide_react_1.Copy, { className: "h-4 w-4" }), (0, jsx_runtime_1.jsx)("span", { children: copied ? 'Copied' : 'Copy Link' })] }), (0, jsx_runtime_1.jsx)("button", { onClick: handleRegenerateToken, className: "p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-450", title: "Regenerate token (Revokes old QR)", children: (0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { className: "h-4 w-4" }) })] })] })) : ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center justify-center p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center bg-slate-50/50", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ShieldAlert, { className: "h-12 w-12 text-slate-350 dark:text-slate-650 mb-3" }), (0, jsx_runtime_1.jsx)("span", { className: "text-xs font-bold text-slate-800 dark:text-slate-300", children: "Access Deactivated" }), (0, jsx_runtime_1.jsx)("p", { className: "text-[10px] text-slate-400 mt-1 max-w-[200px]", children: "Enable the toggle above to configure public emergency scanning options." })] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4", children: [(0, jsx_runtime_1.jsxs)("h3", { className: "font-bold text-slate-850 dark:text-slate-205 text-xs flex items-center uppercase tracking-wider", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Settings, { className: "h-4.5 w-4.5 text-teal-650 mr-2" }), "Disclosure settings"] }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-3 text-xs", children: Object.keys(config).map((key) => {
                                                const label = key.replace('show_', '').replace('_', ' ');
                                                const checked = config[key];
                                                return ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800 pb-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "capitalize font-semibold text-slate-700 dark:text-slate-300", children: label }), (0, jsx_runtime_1.jsx)("button", { onClick: () => toggleConfig(key), className: `w-9 h-5 rounded-full p-0.5 transition-colors ${checked ? 'bg-teal-600' : 'bg-slate-300'}`, children: (0, jsx_runtime_1.jsx)("div", { className: `bg-white w-4 h-4 rounded-full shadow transform transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}` }) })] }, key));
                                            }) }), (0, jsx_runtime_1.jsx)("button", { onClick: handleSaveConfig, className: "w-full mt-2 py-2 bg-teal-655 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1", children: saveSuccess ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CheckCircle, { className: "h-4.5 w-4.5 mr-1" }), (0, jsx_runtime_1.jsx)("span", { children: "Preferences Saved" })] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Save, { className: "h-4.5 w-4.5 mr-1" }), (0, jsx_runtime_1.jsx)("span", { children: "Save Preferences" })] })) })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "lg:col-span-2 space-y-6", children: (0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-3", children: [(0, jsx_runtime_1.jsxs)("h3", { className: "font-bold text-slate-805 dark:text-slate-200 text-xs flex items-center uppercase tracking-wider", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ShieldAlert, { className: "h-4.5 w-4.5 text-red-600 mr-2 animate-pulse" }), "Active Emergency Card summary"] }), accessEnabled && ((0, jsx_runtime_1.jsxs)(link_1.default, { href: `/emergency/${token}`, target: "_blank", className: "text-[10px] text-teal-650 hover:underline flex items-center font-bold", children: ["Preview Portal", (0, jsx_runtime_1.jsx)(lucide_react_1.ExternalLink, { className: "h-3.5 w-3.5 ml-1" })] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-5 text-xs", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1", children: "Blood Group" }), (0, jsx_runtime_1.jsxs)("select", { value: manualBloodGroup, onChange: (e) => setManualBloodGroup(e.target.value), className: "w-full p-2 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-lg text-xs", children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Unknown" }), (0, jsx_runtime_1.jsx)("option", { value: "A Positive", children: "A+" }), (0, jsx_runtime_1.jsx)("option", { value: "A Negative", children: "A-" }), (0, jsx_runtime_1.jsx)("option", { value: "B Positive", children: "B+" }), (0, jsx_runtime_1.jsx)("option", { value: "B Negative", children: "B-" }), (0, jsx_runtime_1.jsx)("option", { value: "AB Positive", children: "AB+" }), (0, jsx_runtime_1.jsx)("option", { value: "AB Negative", children: "AB-" }), (0, jsx_runtime_1.jsx)("option", { value: "O Positive", children: "O+" }), (0, jsx_runtime_1.jsx)("option", { value: "O Negative", children: "O-" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1", children: "Emergency Contact" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: manualContactName, onChange: (e) => setManualContactName(e.target.value), placeholder: "Name", className: "w-full p-2 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-lg text-xs" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[10px] text-slate-405 font-bold uppercase tracking-wider block mb-1", children: "Phone Number" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: manualContactPhone, onChange: (e) => setManualContactPhone(e.target.value), placeholder: "Phone", className: "w-full p-2 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-lg text-xs" })] })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex justify-end border-b border-slate-50 dark:border-slate-800 pb-4", children: (0, jsx_runtime_1.jsx)("button", { onClick: handleUpdateDemographics, className: "px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-colors", children: "Save Demographics" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-6 text-xs", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-400 font-bold uppercase tracking-wider block", children: "Critical Allergies" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap gap-1.5", children: [(_a = patient.knownAllergies) === null || _a === void 0 ? void 0 : _a.map((alg, i) => ((0, jsx_runtime_1.jsxs)("span", { className: "px-2.5 py-1 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-full font-bold flex items-center", children: [alg, (0, jsx_runtime_1.jsx)("span", { className: "text-[8px] ml-1 bg-slate-100 text-slate-500 dark:bg-slate-800 px-1 py-0.2 rounded font-normal uppercase", children: "Patient Entered" })] }, i))), !((_b = patient.knownAllergies) === null || _b === void 0 ? void 0 : _b.length) && (0, jsx_runtime_1.jsx)("span", { className: "text-slate-400 italic", children: "None reported" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex space-x-2 pt-1 max-w-sm", children: [(0, jsx_runtime_1.jsx)("input", { type: "text", value: manualAllergy, onChange: (e) => setManualAllergy(e.target.value), placeholder: "Add manual allergy...", className: "flex-1 p-2 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-lg text-[10px]" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => handleAddManualItem('allergy'), className: "px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold", children: "Add" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-2 pt-2 border-t border-slate-50 dark:border-slate-800", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-405 font-bold uppercase tracking-wider block", children: "Chronic Conditions" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap gap-1.5", children: [(_c = patient.knownChronicConditions) === null || _c === void 0 ? void 0 : _c.map((cond, i) => ((0, jsx_runtime_1.jsxs)("span", { className: "px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-full font-bold flex items-center", children: [cond, (0, jsx_runtime_1.jsx)("span", { className: "text-[8px] ml-1 bg-slate-100 text-slate-505 dark:bg-slate-800 px-1 py-0.2 rounded font-normal uppercase", children: "Patient Entered" })] }, i))), !((_d = patient.knownChronicConditions) === null || _d === void 0 ? void 0 : _d.length) && (0, jsx_runtime_1.jsx)("span", { className: "text-slate-400 italic", children: "None reported" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex space-x-2 pt-1 max-w-sm", children: [(0, jsx_runtime_1.jsx)("input", { type: "text", value: manualCondition, onChange: (e) => setManualCondition(e.target.value), placeholder: "Add chronic condition...", className: "flex-1 p-2 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-lg text-[10px]" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => handleAddManualItem('condition'), className: "px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold", children: "Add" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-2 pt-2 border-t border-slate-50 dark:border-slate-800", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-400 font-bold uppercase tracking-wider block", children: "Critical Medications" }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2", children: [(_e = patient.currentLongTermMedications) === null || _e === void 0 ? void 0 : _e.map((med, i) => ((0, jsx_runtime_1.jsxs)("div", { className: "p-2 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-lg font-bold text-slate-705 dark:text-slate-350 flex justify-between items-center", children: [(0, jsx_runtime_1.jsx)("span", { children: med }), (0, jsx_runtime_1.jsx)("span", { className: "text-[8px] bg-slate-100 text-slate-500 px-1 rounded font-normal uppercase", children: "Patient Entered" })] }, i))), !((_f = patient.currentLongTermMedications) === null || _f === void 0 ? void 0 : _f.length) && (0, jsx_runtime_1.jsx)("span", { className: "text-slate-400 italic", children: "None reported" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex space-x-2 pt-2 max-w-sm", children: [(0, jsx_runtime_1.jsx)("input", { type: "text", value: manualMedication, onChange: (e) => setManualMedication(e.target.value), placeholder: "Add critical daily medication...", className: "flex-1 p-2 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-lg text-[10px]" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => handleAddManualItem('medication'), className: "px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold", children: "Add" })] })] })] })] }) })] })] }) }));
}

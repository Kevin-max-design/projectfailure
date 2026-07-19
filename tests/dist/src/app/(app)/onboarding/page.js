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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OnboardingPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const lucide_react_1 = require("lucide-react");
const mode_1 = require("@/lib/mode");
function OnboardingPage() {
    const router = (0, navigation_1.useRouter)();
    const [step, setStep] = (0, react_1.useState)(1);
    // Form Fields
    const [fullName, setFullName] = (0, react_1.useState)(typeof window !== 'undefined' ? localStorage.getItem('medmemory_patient_name') || '' : '');
    const [dob, setDob] = (0, react_1.useState)((0, mode_1.isDemoMode)() ? '1985-05-12' : '');
    const [gender, setGender] = (0, react_1.useState)((0, mode_1.isDemoMode)() ? 'Male' : 'Prefer not to say');
    const [bloodGroup, setBloodGroup] = (0, react_1.useState)((0, mode_1.isDemoMode)() ? 'O Positive' : 'Unknown');
    const [phone, setPhone] = (0, react_1.useState)((0, mode_1.isDemoMode)() ? '+1 (555) 019-2834' : '');
    const [emergencyName, setEmergencyName] = (0, react_1.useState)((0, mode_1.isDemoMode)() ? 'Priya Rao' : '');
    const [emergencyPhone, setEmergencyPhone] = (0, react_1.useState)((0, mode_1.isDemoMode)() ? '+1 (555) 019-2835' : '');
    // Multi-value list states
    const [allergies, setAllergies] = (0, react_1.useState)((0, mode_1.isDemoMode)() ? ['Penicillin'] : []);
    const [newAllergy, setNewAllergy] = (0, react_1.useState)('');
    const [chronicConditions, setChronicConditions] = (0, react_1.useState)((0, mode_1.isDemoMode)() ? ['Type 2 Diabetes Mellitus'] : []);
    const [newCondition, setNewCondition] = (0, react_1.useState)('');
    const [medications, setMedications] = (0, react_1.useState)((0, mode_1.isDemoMode)() ? ['Metformin 500mg twice daily'] : []);
    const [newMedication, setNewMedication] = (0, react_1.useState)('');
    const handleAddAllergy = () => {
        if (newAllergy.trim() && !allergies.includes(newAllergy.trim())) {
            setAllergies([...allergies, newAllergy.trim()]);
            setNewAllergy('');
        }
    };
    const handleRemoveAllergy = (index) => {
        setAllergies(allergies.filter((_, i) => i !== index));
    };
    const handleAddCondition = () => {
        if (newCondition.trim() && !chronicConditions.includes(newCondition.trim())) {
            setChronicConditions([...chronicConditions, newCondition.trim()]);
            setNewCondition('');
        }
    };
    const handleRemoveCondition = (index) => {
        setChronicConditions(chronicConditions.filter((_, i) => i !== index));
    };
    const handleAddMedication = () => {
        if (newMedication.trim() && !medications.includes(newMedication.trim())) {
            setMedications([...medications, newMedication.trim()]);
            setNewMedication('');
        }
    };
    const handleRemoveMedication = (index) => {
        setMedications(medications.filter((_, i) => i !== index));
    };
    const [submitting, setSubmitting] = (0, react_1.useState)(false);
    const handleCompleteOnboarding = async () => {
        var _a;
        if (!fullName.trim()) {
            alert('Please enter your Full Name on Step 1.');
            setStep(1);
            return;
        }
        if (!dob) {
            alert('Please select your Date of Birth on Step 1.');
            setStep(1);
            return;
        }
        if (submitting)
            return;
        setSubmitting(true);
        if ((0, mode_1.isDemoMode)()) {
            // Save details locally in mock database format
            if (typeof window !== 'undefined') {
                const patientProfile = {
                    id: '00000000-0000-0000-0000-000000000001',
                    fullName: fullName || 'Arjun Rao',
                    dateOfBirth: dob,
                    gender,
                    bloodGroup,
                    phone,
                    emergencyContactName: emergencyName,
                    emergencyContactPhone: emergencyPhone,
                    knownAllergies: allergies,
                    knownChronicConditions: chronicConditions,
                    currentLongTermMedications: medications,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                localStorage.setItem('medmemory_patient_profile', JSON.stringify(patientProfile));
                localStorage.setItem('medmemory_patient_name', patientProfile.fullName);
                localStorage.setItem('medmemory_onboarded', 'true');
            }
            router.push('/app/dashboard');
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
                // 1. Insert patient profile
                const { data: patient, error: patientError } = await supabase
                    .from('patients')
                    .insert({
                    user_id: user.id,
                    full_name: fullName || ((_a = user.user_metadata) === null || _a === void 0 ? void 0 : _a.full_name) || 'Patient',
                    date_of_birth: dob,
                    gender,
                    blood_group: bloodGroup,
                    phone,
                    emergency_contact_name: emergencyName,
                    emergency_contact_phone: emergencyPhone,
                    known_allergies: allergies,
                    known_chronic_conditions: chronicConditions,
                    current_long_term_medications: medications
                })
                    .select('id')
                    .single();
                if (patientError) {
                    console.error('Error inserting patient profile:', patientError);
                    alert('Failed to save profile: ' + patientError.message);
                    setSubmitting(false);
                    return;
                }
                // 2. Initialize emergency profile configuration in DB
                const { error: configError } = await supabase
                    .from('emergency_profile_config')
                    .insert({
                    patient_id: patient.id,
                    show_name: true,
                    show_blood_group: true,
                    show_allergies: true,
                    show_conditions: true,
                    show_medications: true,
                    show_contact: true,
                    show_surgeries: true,
                    show_hospitalizations: true
                });
                if (configError) {
                    console.error('Error creating emergency profile config:', configError);
                }
                // 3. Save details locally
                if (typeof window !== 'undefined') {
                    localStorage.setItem('medmemory_patient_id', patient.id);
                    localStorage.setItem('medmemory_patient_name', fullName);
                    localStorage.setItem('medmemory_onboarded', 'true');
                }
                router.push('/app/dashboard');
            }
            catch (err) {
                console.error('Onboarding submission error:', err);
                alert('An unexpected error occurred: ' + err.message);
                setSubmitting(false);
            }
        }
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: "min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-8", children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-8 md:p-12 relative overflow-hidden", children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl" }), (0, jsx_runtime_1.jsx)("div", { className: "w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mb-8", children: (0, jsx_runtime_1.jsx)("div", { className: "bg-teal-600 h-1.5 rounded-full transition-all duration-300", style: { width: `${(step / 3) * 100}%` } }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-2 text-teal-600 mb-6", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.HeartPulse, { className: "h-6 w-6" }), (0, jsx_runtime_1.jsxs)("span", { className: "font-bold tracking-wider uppercase text-xs", children: ["Profile Setup \u2014 Step ", step, " of 3"] })] }), step === 1 && ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-6", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-2xl font-bold text-slate-900 dark:text-white", children: "Basic Information" }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-500 text-sm mt-1", children: "Let's start with your standard health profile details." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1", children: "Full Name" }), (0, jsx_runtime_1.jsx)("input", { type: "text", required: true, value: fullName, onChange: (e) => setFullName(e.target.value), className: "block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm transition-all", placeholder: "Arjun Rao" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1", children: "Date of Birth" }), (0, jsx_runtime_1.jsx)("input", { type: "date", required: true, value: dob, onChange: (e) => setDob(e.target.value), className: "block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm transition-all" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1", children: "Gender (Optional)" }), (0, jsx_runtime_1.jsxs)("select", { value: gender, onChange: (e) => setGender(e.target.value), className: "block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm transition-all", children: [(0, jsx_runtime_1.jsx)("option", { value: "Male", children: "Male" }), (0, jsx_runtime_1.jsx)("option", { value: "Female", children: "Female" }), (0, jsx_runtime_1.jsx)("option", { value: "Non-binary", children: "Non-binary" }), (0, jsx_runtime_1.jsx)("option", { value: "Other", children: "Other" }), (0, jsx_runtime_1.jsx)("option", { value: "Prefer not to say", children: "Prefer not to say" })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1", children: "Blood Group (Optional)" }), (0, jsx_runtime_1.jsxs)("select", { value: bloodGroup, onChange: (e) => setBloodGroup(e.target.value), className: "block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm transition-all", children: [(0, jsx_runtime_1.jsx)("option", { value: "A Positive", children: "A+" }), (0, jsx_runtime_1.jsx)("option", { value: "A Negative", children: "A-" }), (0, jsx_runtime_1.jsx)("option", { value: "B Positive", children: "B+" }), (0, jsx_runtime_1.jsx)("option", { value: "B Negative", children: "B-" }), (0, jsx_runtime_1.jsx)("option", { value: "AB Positive", children: "AB+" }), (0, jsx_runtime_1.jsx)("option", { value: "AB Negative", children: "AB-" }), (0, jsx_runtime_1.jsx)("option", { value: "O Positive", children: "O+" }), (0, jsx_runtime_1.jsx)("option", { value: "O Negative", children: "O-" }), (0, jsx_runtime_1.jsx)("option", { value: "Unknown", children: "Unknown" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "md:col-span-2", children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1", children: "Phone Number" }), (0, jsx_runtime_1.jsx)("input", { type: "tel", value: phone, onChange: (e) => setPhone(e.target.value), className: "block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm transition-all", placeholder: "+1 (555) 019-2834" })] })] })] })), step === 2 && ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-6", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-2xl font-bold text-slate-900 dark:text-white", children: "Emergency Contacts" }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-500 text-sm mt-1", children: "This will be prominently displayed on your emergency summary page." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1", children: "Emergency Contact Name" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: emergencyName, onChange: (e) => setEmergencyName(e.target.value), className: "block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm transition-all", placeholder: "Priya Rao" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1", children: "Emergency Contact Phone Number" }), (0, jsx_runtime_1.jsx)("input", { type: "tel", value: emergencyPhone, onChange: (e) => setEmergencyPhone(e.target.value), className: "block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm transition-all", placeholder: "+1 (555) 019-2835" })] })] })] })), step === 3 && ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-6", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-2xl font-bold text-slate-900 dark:text-white", children: "Current Health Conditions" }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-500 text-sm mt-1", children: "Manually entered details are tracked as \"patient_reported\" source type." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1", children: "Known Allergies" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex space-x-2 mb-2", children: [(0, jsx_runtime_1.jsx)("input", { type: "text", value: newAllergy, onChange: (e) => setNewAllergy(e.target.value), onKeyDown: (e) => e.key === 'Enter' && (e.preventDefault(), handleAddAllergy()), className: "block flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm", placeholder: "e.g. Penicillin, Peanuts" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: handleAddAllergy, className: "p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-lg transition-colors", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "h-4 w-4" }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap gap-1.5", children: [allergies.map((allergy, i) => ((0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center px-2.5 py-1 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-full text-xs font-semibold", children: [allergy, (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => handleRemoveAllergy(i), className: "ml-1 text-red-500 hover:text-red-700", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-3.5 w-3.5" }) })] }, i))), allergies.length === 0 && (0, jsx_runtime_1.jsx)("span", { className: "text-xs text-slate-400", children: "No allergies listed." })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1", children: "Chronic/Known Conditions" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex space-x-2 mb-2", children: [(0, jsx_runtime_1.jsx)("input", { type: "text", value: newCondition, onChange: (e) => setNewCondition(e.target.value), onKeyDown: (e) => e.key === 'Enter' && (e.preventDefault(), handleAddCondition()), className: "block flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm", placeholder: "e.g. Hypertension, Asthma" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: handleAddCondition, className: "p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-lg transition-colors", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "h-4 w-4" }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap gap-1.5", children: [chronicConditions.map((cond, i) => ((0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-full text-xs font-semibold", children: [cond, (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => handleRemoveCondition(i), className: "ml-1 text-amber-500 hover:text-amber-700", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-3.5 w-3.5" }) })] }, i))), chronicConditions.length === 0 && (0, jsx_runtime_1.jsx)("span", { className: "text-xs text-slate-400", children: "No chronic conditions listed." })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1", children: "Current Long-term Medications" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex space-x-2 mb-2", children: [(0, jsx_runtime_1.jsx)("input", { type: "text", value: newMedication, onChange: (e) => setNewMedication(e.target.value), onKeyDown: (e) => e.key === 'Enter' && (e.preventDefault(), handleAddMedication()), className: "block flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm", placeholder: "e.g. Metformin 500mg daily" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: handleAddMedication, className: "p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-lg transition-colors", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "h-4 w-4" }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-1", children: [medications.map((med, i) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-slate-800 dark:text-slate-200 font-medium", children: med }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => handleRemoveMedication(i), className: "text-slate-400 hover:text-[#ef4444] transition-colors", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4" }) })] }, i))), medications.length === 0 && (0, jsx_runtime_1.jsx)("span", { className: "text-xs text-slate-400", children: "No long-term medications listed." })] })] })] })] })), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between mt-10 border-t border-slate-100 dark:border-slate-800 pt-6", children: [step > 1 ? ((0, jsx_runtime_1.jsxs)("button", { onClick: () => setStep(step - 1), className: "inline-flex items-center px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ArrowLeft, { className: "mr-2 h-4 w-4" }), "Back"] })) : ((0, jsx_runtime_1.jsx)("div", {})), step < 3 ? ((0, jsx_runtime_1.jsxs)("button", { onClick: () => {
                                if (step === 1) {
                                    if (!fullName.trim()) {
                                        alert('Please enter your Full Name.');
                                        return;
                                    }
                                    if (!dob) {
                                        alert('Please select your Date of Birth.');
                                        return;
                                    }
                                }
                                setStep(step + 1);
                            }, className: "inline-flex items-center px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition-all shadow-md shadow-teal-500/10", children: ["Next Step", (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { className: "ml-2 h-4 w-4" })] })) : ((0, jsx_runtime_1.jsxs)("button", { onClick: handleCompleteOnboarding, disabled: submitting, className: "inline-flex items-center px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition-all shadow-md shadow-teal-500/10 disabled:opacity-50", children: [submitting ? 'Saving...' : 'Complete Setup', !submitting && (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { className: "ml-2 h-4 w-4" })] }))] })] }) }));
}

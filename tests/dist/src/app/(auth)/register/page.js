"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RegisterPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
const mode_1 = require("@/lib/mode");
const client_1 = require("@/lib/supabase/client");
function RegisterPage() {
    const router = (0, navigation_1.useRouter)();
    const [name, setName] = (0, react_1.useState)('');
    const [email, setEmail] = (0, react_1.useState)('');
    const [password, setPassword] = (0, react_1.useState)('');
    const [confirmPassword, setConfirmPassword] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)('');
    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }
        // Artificial delay
        await new Promise((resolve) => setTimeout(resolve, 800));
        if ((0, mode_1.isDemoMode)()) {
            // Save in LocalStorage to simulate registration
            if (typeof window !== 'undefined') {
                localStorage.setItem('medmemory_logged_in', 'true');
                localStorage.setItem('medmemory_patient_name', name);
                localStorage.setItem('medmemory_patient_email', email);
                localStorage.setItem('medmemory_patient_id', 'new-patient-uuid-999');
                localStorage.setItem('medmemory_onboarded', 'false');
            }
            router.push('/app/onboarding');
        }
        else {
            // Real Supabase Auth Registration
            try {
                const supabase = (0, client_1.createClient)();
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: name,
                        },
                    },
                });
                if (error) {
                    setError(error.message);
                    setLoading(false);
                    return;
                }
                if (typeof window !== 'undefined') {
                    localStorage.setItem('medmemory_logged_in', 'true');
                    localStorage.setItem('medmemory_patient_name', name);
                    localStorage.setItem('medmemory_patient_email', email);
                    localStorage.setItem('medmemory_onboarded', 'false');
                }
                router.push('/app/onboarding');
            }
            catch (err) {
                console.error('Registration error:', err);
                setError(err.message || 'An unexpected error occurred during registration.');
                setLoading(false);
            }
        }
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: "min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12", children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "inline-flex items-center justify-center p-3 bg-teal-50 dark:bg-teal-950/30 rounded-2xl text-teal-600 mb-4", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Heart, { className: "h-8 w-8" }) }), (0, jsx_runtime_1.jsx)("h2", { className: "text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white", children: "Create your Health Memory" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-2 text-sm text-slate-500 dark:text-slate-400", children: "A lifetime of medical history starts with one account." })] }), error && ((0, jsx_runtime_1.jsx)("div", { className: "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 text-red-600 p-3 rounded-lg text-sm text-center", children: error })), (0, jsx_runtime_1.jsxs)("form", { className: "mt-8 space-y-4", onSubmit: handleRegister, children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1", children: "Full Name" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("span", { className: "absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400", children: (0, jsx_runtime_1.jsx)(lucide_react_1.User, { className: "h-5 w-5" }) }), (0, jsx_runtime_1.jsx)("input", { type: "text", required: true, value: name, onChange: (e) => setName(e.target.value), className: "block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all", placeholder: "Arjun Rao" })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1", children: "Email Address" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("span", { className: "absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Mail, { className: "h-5 w-5" }) }), (0, jsx_runtime_1.jsx)("input", { type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), className: "block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all", placeholder: "name@example.com" })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1", children: "Password" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("span", { className: "absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Lock, { className: "h-5 w-5" }) }), (0, jsx_runtime_1.jsx)("input", { type: "password", required: true, value: password, onChange: (e) => setPassword(e.target.value), className: "block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1", children: "Confirm Password" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("span", { className: "absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Lock, { className: "h-5 w-5" }) }), (0, jsx_runtime_1.jsx)("input", { type: "password", required: true, value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), className: "block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" })] })] })] }), (0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsxs)("button", { type: "submit", disabled: loading, className: "w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50 mt-6", children: [loading ? 'Creating Account...' : 'Create Account', !loading && (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { className: "ml-2 h-4 w-4" })] }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "text-center text-xs text-slate-400 mt-6 border-t border-slate-100 dark:border-slate-850 pt-4", children: ["Already have an account?", ' ', (0, jsx_runtime_1.jsx)(link_1.default, { href: "/login", className: "text-teal-600 font-semibold hover:text-teal-750", children: "Sign in" })] })] }) }));
}

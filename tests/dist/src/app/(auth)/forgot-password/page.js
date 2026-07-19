"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ForgotPasswordPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const lucide_react_1 = require("lucide-react");
function ForgotPasswordPage() {
    const router = (0, navigation_1.useRouter)();
    const [email, setEmail] = (0, react_1.useState)('');
    const [submitted, setSubmitted] = (0, react_1.useState)(false);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        // Simulate reset request
        await new Promise((resolve) => setTimeout(resolve, 800));
        setSubmitted(true);
        setLoading(false);
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: "min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12", children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "inline-flex items-center justify-center p-3 bg-teal-50 dark:bg-teal-950/30 rounded-2xl text-teal-655 mb-4", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Heart, { className: "h-8 w-8" }) }), (0, jsx_runtime_1.jsx)("h2", { className: "text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white", children: "Reset Password" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-2 text-sm text-slate-500 dark:text-slate-400", children: "We will send you instructions to recover your health account." })] }), submitted ? ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/30 text-teal-700 dark:text-teal-400 p-3 rounded-lg text-sm text-center", children: ["Password reset link has been sent to ", (0, jsx_runtime_1.jsx)("span", { className: "font-bold", children: email }), ". Please check your email inbox."] }), (0, jsx_runtime_1.jsx)(link_1.default, { href: "/login", className: "w-full flex justify-center items-center py-2.5 px-4 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors", children: "Back to Sign In" })] })) : ((0, jsx_runtime_1.jsxs)("form", { className: "mt-8 space-y-6", onSubmit: handleSubmit, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1", children: "Email Address" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("span", { className: "absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Mail, { className: "h-5 w-5" }) }), (0, jsx_runtime_1.jsx)("input", { type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), className: "block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all", placeholder: "name@example.com" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-3", children: [(0, jsx_runtime_1.jsxs)("button", { type: "submit", disabled: loading || !email, className: "w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50", children: [loading ? 'Sending Request...' : 'Send Password Reset Link', !loading && (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { className: "ml-2 h-4 w-4" })] }), (0, jsx_runtime_1.jsxs)(link_1.default, { href: "/login", className: "inline-flex items-center justify-center text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white mt-2 transition-colors", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ArrowLeft, { className: "h-3.5 w-3.5 mr-1" }), "Back to Sign In"] })] })] }))] }) }));
}

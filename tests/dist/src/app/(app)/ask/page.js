"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AskMyRecordsPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
const AppShell_1 = __importDefault(require("@/components/layout/AppShell"));
const engine_1 = require("@/lib/rag/engine");
const mode_1 = require("@/lib/mode");
function AskMyRecordsPage() {
    const [messages, setMessages] = (0, react_1.useState)([]);
    const [input, setInput] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [patientId, setPatientId] = (0, react_1.useState)('00000000-0000-0000-0000-000000000001');
    (0, react_1.useEffect)(() => {
        if (typeof window !== 'undefined') {
            const storedProfile = localStorage.getItem('medmemory_patient_profile');
            if (storedProfile) {
                setPatientId(JSON.parse(storedProfile).id);
            }
        }
    }, []);
    const handleSend = async (textToSend) => {
        if (!textToSend.trim() || loading)
            return;
        const userMsg = {
            id: `msg-user-${Math.random().toString(36).substring(7)}`,
            sender: 'user',
            text: textToSend
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);
        try {
            let answer;
            let citations;
            if ((0, mode_1.isDemoMode)()) {
                const engine = new engine_1.RAGEngine();
                const res = await engine.answerPatientQuestion(patientId, textToSend);
                answer = res.answer;
                citations = res.citations;
            }
            else {
                const res = await fetch('/api/ask', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question: textToSend })
                });
                if (!res.ok) {
                    throw new Error('API request failed');
                }
                const data = await res.json();
                answer = data.answer;
                citations = data.citations;
            }
            const assistantMsg = {
                id: `msg-ai-${Math.random().toString(36).substring(7)}`,
                sender: 'assistant',
                text: answer,
                citations: citations
            };
            setMessages(prev => [...prev, assistantMsg]);
        }
        catch (err) {
            console.error('RAG engine query failed:', err);
            const errorMsg = {
                id: `msg-error-${Math.random().toString(36).substring(7)}`,
                sender: 'assistant',
                text: "I encountered an error querying your medical records. Please try again."
            };
            setMessages(prev => [...prev, errorMsg]);
        }
        finally {
            setLoading(false);
        }
    };
    const sampleQuestions = [
        "What was I diagnosed with during my 2026 hospital admission?",
        "Which medicines was I given for pancreatitis?",
        "What was my last HbA1c result?",
        "When did my doctor change my insulin?",
        "Which hospitals have I visited?"
    ];
    return ((0, jsx_runtime_1.jsx)(AppShell_1.default, { children: (0, jsx_runtime_1.jsxs)("div", { className: "h-[calc(100vh-140px)] flex flex-col justify-between space-y-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex-shrink-0 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-2xl font-extrabold text-slate-900 dark:text-white", children: "Ask My Records" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-slate-500 mt-0.5", children: "Conversational AI trained strictly on your uploaded files." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center text-teal-650 bg-teal-50 dark:bg-teal-950/20 px-3 py-1.5 rounded-lg border border-teal-150/40 text-xs font-semibold", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Sparkles, { className: "h-4 w-4 mr-1.5" }), "Verified Records Only"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex-grow overflow-y-auto space-y-6 pr-2", children: messages.length === 0 ? ((0, jsx_runtime_1.jsxs)("div", { className: "max-w-2xl mx-auto py-12 space-y-8", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-center space-y-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "inline-flex p-4 bg-teal-50 dark:bg-teal-950/20 text-teal-600 rounded-3xl", children: (0, jsx_runtime_1.jsx)(lucide_react_1.MessageSquare, { className: "h-8 w-8 animate-bounce" }) }), (0, jsx_runtime_1.jsx)("h2", { className: "text-lg font-bold text-slate-850 dark:text-slate-200", children: "Interactive Medical Memory" }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-500 dark:text-slate-400 text-xs max-w-md mx-auto leading-relaxed", children: "Ask details about your diagnoses, medications, blood tests, or hospitals. Answers are strictly grounded in your documents with full citations." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4", children: [(0, jsx_runtime_1.jsxs)("h4", { className: "text-xs font-bold text-slate-450 uppercase tracking-wider flex items-center", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.HelpCircle, { className: "h-4 w-4 text-teal-600 mr-2" }), "Suggested Questions"] }), (0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-1 gap-2.5", children: sampleQuestions.map((q, i) => ((0, jsx_runtime_1.jsxs)("button", { onClick: () => handleSend(q), className: "w-full text-left px-4 py-3 bg-slate-50 dark:bg-slate-850 hover:bg-teal-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 hover:border-teal-200 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all flex justify-between items-center group", children: [(0, jsx_runtime_1.jsx)("span", { children: q }), (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { className: "h-3.5 w-3.5 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" })] }, i))) })] })] })) : ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-6 max-w-3xl mx-auto", children: [messages.map((msg) => ((0, jsx_runtime_1.jsx)("div", { className: `flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`, children: (0, jsx_runtime_1.jsxs)("div", { className: `max-w-[85%] p-4 rounded-2xl shadow-sm text-sm ${msg.sender === 'user'
                                        ? 'bg-teal-600 text-white rounded-br-none'
                                        : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'}`, children: [(0, jsx_runtime_1.jsx)("p", { className: "leading-relaxed whitespace-pre-wrap", children: msg.text }), msg.citations && msg.citations.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "border-t border-slate-50 dark:border-slate-800 mt-4 pt-3 space-y-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-400 font-bold block uppercase tracking-wider", children: "Source Citations:" }), (0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2", children: msg.citations.map((cit, i) => ((0, jsx_runtime_1.jsxs)(link_1.default, { href: `/app/documents/${cit.documentId}`, className: "block p-2 bg-slate-50 hover:bg-teal-50 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 hover:border-teal-200 rounded-lg text-[10px] transition-all", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center text-teal-650 font-bold truncate", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { className: "h-3 w-3 mr-1 flex-shrink-0" }), (0, jsx_runtime_1.jsx)("span", { className: "truncate", children: cit.documentTitle })] }), (0, jsx_runtime_1.jsxs)("div", { className: "text-slate-450 mt-1 font-medium", children: ["Page ", cit.pageNumber, " \u2022 ", cit.date] })] }, i))) })] }))] }) }, msg.id))), loading && ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-2 text-slate-400 text-xs", children: [(0, jsx_runtime_1.jsx)("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400" }), (0, jsx_runtime_1.jsx)("span", { children: "Searching your documents for answers..." })] }))] })) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-shrink-0 max-w-3xl w-full mx-auto pb-4", children: [(0, jsx_runtime_1.jsxs)("form", { onSubmit: (e) => { e.preventDefault(); handleSend(input); }, className: "relative flex items-center", children: [(0, jsx_runtime_1.jsx)("input", { type: "text", placeholder: "Ask a question about your health records...", value: input, onChange: (e) => setInput(e.target.value), disabled: loading, className: "block w-full pl-4 pr-12 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs transition-all disabled:opacity-60" }), (0, jsx_runtime_1.jsx)("button", { type: "submit", disabled: loading || !input.trim(), className: "absolute right-2 p-2.5 bg-teal-605 hover:bg-teal-700 text-white rounded-xl shadow-md shadow-teal-500/10 transition-colors disabled:opacity-40 disabled:hover:bg-teal-600", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Send, { className: "h-4 w-4" }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-center space-x-1 text-[10px] text-slate-450 mt-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ShieldAlert, { className: "h-3.5 w-3.5 text-slate-400" }), (0, jsx_runtime_1.jsx)("span", { children: "Answers generated solely from patient-reported and verified document-extracted evidence." })] })] })] }) }));
}

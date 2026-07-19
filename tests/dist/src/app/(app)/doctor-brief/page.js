"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DoctorBriefsListPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
const AppShell_1 = __importDefault(require("@/components/layout/AppShell"));
const service_1 = require("@/lib/supabase/service");
const utils_1 = require("@/lib/utils");
const mode_1 = require("@/lib/mode");
function DoctorBriefsListPage() {
    const [briefs, setBriefs] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        loadBriefs();
    }, []);
    const loadBriefs = async () => {
        if ((0, mode_1.isDemoMode)()) {
            const res = service_1.mockDb.query('doctor_briefs').select().order('generated_at', { ascending: false });
            setBriefs(res.data || []);
            setLoading(false);
        }
        else {
            try {
                const res = await fetch('/api/doctor-brief');
                if (res.ok) {
                    const data = await res.json();
                    setBriefs(data || []);
                }
            }
            catch (err) {
                console.error('Failed to load doctor briefs:', err);
            }
            finally {
                setLoading(false);
            }
        }
    };
    return ((0, jsx_runtime_1.jsx)(AppShell_1.default, { children: (0, jsx_runtime_1.jsxs)("div", { className: "space-y-8 max-w-4xl mx-auto", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-3xl font-extrabold text-slate-900 dark:text-white", children: "Doctor Briefs & Handoffs" }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-500 dark:text-slate-400 text-sm mt-1", children: "Concise summaries of your medical history prepared for new health professionals." })] }), (0, jsx_runtime_1.jsxs)(link_1.default, { href: "/app/help", className: "inline-flex items-center px-4 py-2.5 bg-teal-655 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "h-4 w-4 mr-1.5" }), "New Handoff Brief"] })] }), loading ? ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center min-h-[300px]", children: (0, jsx_runtime_1.jsx)("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" }) })) : ((0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 gap-4", children: [briefs.map((brief) => {
                            var _a;
                            const content = brief.structured_content;
                            const reason = ((_a = content === null || content === void 0 ? void 0 : content.currentReason) === null || _a === void 0 ? void 0 : _a.category) || 'Routine checkup';
                            const date = brief.generated_at || brief.created_at;
                            return ((0, jsx_runtime_1.jsxs)(link_1.default, { href: `/app/doctor-brief/${brief.id}`, className: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl hover:border-teal-500/50 shadow-sm flex items-center justify-between group transition-all", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "p-3 bg-teal-50 dark:bg-teal-950/20 text-teal-650 rounded-xl", children: (0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { className: "h-6 w-6" }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("h3", { className: "font-bold text-slate-800 dark:text-slate-200 group-hover:text-teal-600 transition-colors", children: ["Brief for: ", reason] }), (0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-slate-400 mt-1 flex items-center", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Clock, { className: "h-3.5 w-3.5 mr-1" }), "Generated on ", (0, utils_1.formatDate)(date)] })] })] }), (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { className: "h-5 w-5 text-slate-400 group-hover:translate-x-1 transition-transform" })] }, brief.id));
                        }), briefs.length === 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-12 rounded-3xl text-center space-y-4 shadow-sm", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { className: "h-12 w-12 text-slate-350 dark:text-slate-650 mx-auto" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-1", children: [(0, jsx_runtime_1.jsx)("h3", { className: "font-bold text-slate-800 dark:text-slate-200", children: "No Doctor Briefs yet" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-slate-400 max-w-[280px] mx-auto", children: "Generate a doctor brief by outlining your current symptoms in the help portal." })] }), (0, jsx_runtime_1.jsx)(link_1.default, { href: "/app/help", className: "inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors", children: "Generate First Brief" })] }))] }))] }) }));
}

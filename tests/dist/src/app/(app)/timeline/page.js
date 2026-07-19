"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TimelinePage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
const AppShell_1 = __importDefault(require("@/components/layout/AppShell"));
const service_1 = require("@/lib/supabase/service");
const utils_1 = require("@/lib/utils");
const mode_1 = require("@/lib/mode");
function TimelinePage() {
    const [events, setEvents] = (0, react_1.useState)([]);
    const [search, setSearch] = (0, react_1.useState)('');
    const [filterType, setFilterType] = (0, react_1.useState)('All');
    (0, react_1.useEffect)(() => {
        loadEvents();
    }, []);
    const loadEvents = async () => {
        if ((0, mode_1.isDemoMode)()) {
            const res = service_1.mockDb.query('medical_events').select().order('event_date', { ascending: false });
            setEvents(res.data || []);
        }
        else {
            try {
                const res = await fetch('/api/timeline');
                if (res.ok) {
                    const data = await res.json();
                    // Map backend event_date key to event_date if needed (API route returns formatted camelCase eventDate)
                    // Wait! Let's check what the API route returns:
                    // formattedEvents:
                    // { id: event.id, patientId: event.patient_id, eventDate: event.event_date, eventType: event.event_type, ... }
                    // Ah! The API route returned formattedEvents using camelCase: eventDate, eventType, hospitalName, doctorName, sourceDocumentId, sourceDocumentName, verificationStatus.
                    // Wait! The timeline page frontend code references:
                    // ev.title, ev.summary, ev.hospital_name, ev.doctor_name, ev.event_type, ev.event_date, ev.verification_status, ev.source_document_id.
                    // Ah! So the frontend uses snake_case keys (matching the database columns)!
                    // Let's make sure the GET timeline API route returns the exact same keys:
                    // { id, patient_id, event_date, event_type, title, hospital_name, doctor_name, summary, source_document_id, source_document_name, verification_status }
                    // This way, the frontend works perfectly without rewriting the rendering code!
                    // Let's verify what keys GET /api/timeline returned. It returned eventDate, eventType, etc.
                    // We will update GET /api/timeline to return the snake_case keys, so it works seamlessly!
                    // Let's fetch data and set it to events.
                    setEvents(data || []);
                }
            }
            catch (err) {
                console.error('Failed to load timeline events:', err);
            }
        }
    };
    // Group events by Year
    const getFilteredEvents = () => {
        return events.filter((ev) => {
            const matchesSearch = ev.title.toLowerCase().includes(search.toLowerCase()) ||
                (ev.summary && ev.summary.toLowerCase().includes(search.toLowerCase())) ||
                (ev.hospital_name && ev.hospital_name.toLowerCase().includes(search.toLowerCase())) ||
                (ev.doctor_name && ev.doctor_name.toLowerCase().includes(search.toLowerCase()));
            const matchesFilter = filterType === 'All' ||
                (filterType === 'Diagnoses' && ev.event_type === 'Diagnosis') ||
                (filterType === 'Medications' && ev.event_type.startsWith('Medication')) ||
                (filterType === 'Labs' && ev.event_type === 'Lab Test') ||
                (filterType === 'Hospitalizations' && ev.event_type === 'Hospital Admission') ||
                (filterType === 'Procedures' && (ev.event_type === 'Procedure' || ev.event_type === 'Surgery'));
            return matchesSearch && matchesFilter;
        });
    };
    const filteredEvents = getFilteredEvents();
    // Group by year helper
    const groupedEventsByYear = {};
    filteredEvents.forEach(event => {
        const year = new Date(event.event_date).getFullYear().toString();
        if (!groupedEventsByYear[year]) {
            groupedEventsByYear[year] = [];
        }
        groupedEventsByYear[year].push(event);
    });
    const sortedYears = Object.keys(groupedEventsByYear).sort((a, b) => b.localeCompare(a));
    return ((0, jsx_runtime_1.jsx)(AppShell_1.default, { children: (0, jsx_runtime_1.jsxs)("div", { className: "space-y-8", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0", children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-3xl font-extrabold text-slate-900 dark:text-white", children: "Medical Timeline" }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-500 dark:text-slate-400 text-sm mt-1", children: "Your lifelong medical records synchronized in a verified chronological timeline." })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center", children: [(0, jsx_runtime_1.jsxs)("div", { className: "relative flex-1 w-full", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Search, { className: "absolute inset-y-0 left-3 h-4 w-4 my-auto text-slate-400" }), (0, jsx_runtime_1.jsx)("input", { type: "text", placeholder: "Search diagnoses, medications, hospitals, or doctors...", value: search, onChange: (e) => setSearch(e.target.value), className: "block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex gap-2 w-full md:w-auto overflow-x-auto py-1", children: ['All', 'Diagnoses', 'Medications', 'Labs', 'Hospitalizations', 'Procedures'].map((type) => ((0, jsx_runtime_1.jsx)("button", { onClick: () => setFilterType(type), className: `px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${filterType === type
                                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-500/10'
                                    : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-655 dark:text-slate-300'}`, children: type }, type))) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-12", children: [sortedYears.map((year) => ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-6", children: [(0, jsx_runtime_1.jsxs)("h2", { className: "text-xl font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Calendar, { className: "h-5 w-5 text-teal-650 mr-2" }), year] }), (0, jsx_runtime_1.jsx)("div", { className: "relative pl-6 timeline-line space-y-8", children: groupedEventsByYear[year].map((event, i) => ((0, jsx_runtime_1.jsxs)("div", { className: "relative group", children: [(0, jsx_runtime_1.jsx)("span", { className: "absolute -left-[27px] top-2 h-4 w-4 rounded-full border-2 border-teal-600 bg-white dark:bg-slate-900 group-hover:scale-110 transition-transform z-10" }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl hover:shadow-md transition-shadow", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row justify-between md:items-center gap-2 mb-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-2", children: [(0, jsx_runtime_1.jsx)("span", { className: `px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${event.event_type.startsWith('Medication') ? 'bg-indigo-50 text-indigo-750 dark:bg-indigo-950/20' :
                                                                            event.event_type === 'Diagnosis' ? 'bg-amber-50 text-amber-700' :
                                                                                event.event_type === 'Lab Test' ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'}`, children: event.event_type }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-400 font-semibold", children: (0, utils_1.formatDate)(event.event_date) })] }), event.verification_status === 'verified' ? ((0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center text-[10px] text-teal-650 font-bold bg-teal-50 dark:bg-teal-950/20 px-2.5 py-0.5 rounded-full", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CheckCircle2, { className: "h-3 w-3 mr-1" }), "Verified Fact"] })) : ((0, jsx_runtime_1.jsx)("span", { className: "inline-flex items-center text-[10px] text-amber-650 font-bold bg-amber-50 dark:bg-amber-950/20 px-2.5 py-0.5 rounded-full", children: "Pending Review" }))] }), (0, jsx_runtime_1.jsx)("h3", { className: "font-bold text-slate-800 dark:text-slate-200 text-sm", children: event.title }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-slate-550 dark:text-slate-400 mt-1.5 leading-relaxed", children: event.summary }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-2 mt-4 pt-3.5 border-t border-slate-50 dark:border-slate-800 text-[10px] text-slate-400 font-semibold", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-3", children: [event.hospital_name && ((0, jsx_runtime_1.jsxs)("span", { children: ["Hospital: ", (0, jsx_runtime_1.jsx)("span", { className: "text-slate-655 dark:text-slate-300", children: event.hospital_name })] })), event.doctor_name && ((0, jsx_runtime_1.jsxs)("span", { children: ["Doctor: ", (0, jsx_runtime_1.jsx)("span", { className: "text-slate-655 dark:text-slate-300", children: event.doctor_name })] }))] }), event.source_document_id && ((0, jsx_runtime_1.jsxs)(link_1.default, { href: `/app/documents/${event.source_document_id}`, className: "inline-flex items-center text-teal-600 hover:underline font-bold", children: ["Trace Source File", (0, jsx_runtime_1.jsx)(lucide_react_1.ExternalLink, { className: "h-3 w-3 ml-1" })] }))] })] })] }, event.id))) })] }, year))), sortedYears.length === 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm", children: [(0, jsx_runtime_1.jsx)("div", { className: "inline-flex p-4 bg-slate-50 dark:bg-slate-800 text-slate-450 rounded-2xl mb-4", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Clock, { className: "h-8 w-8" }) }), (0, jsx_runtime_1.jsx)("h3", { className: "font-bold text-slate-850 dark:text-slate-200", children: "No medical events yet" }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-sm mx-auto", children: "Once you verify extracted diagnoses or prescriptions, they will be organized here as a lifelong health memory." })] }))] })] }) }));
}

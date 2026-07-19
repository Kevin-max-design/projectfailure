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
exports.default = AppShell;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const brand_1 = require("@/config/brand");
const mode_1 = require("@/lib/mode");
function AppShell({ children }) {
    const pathname = (0, navigation_1.usePathname)();
    const router = (0, navigation_1.useRouter)();
    const [mobileMenuOpen, setMobileMenuOpen] = (0, react_1.useState)(false);
    const [patientName, setPatientName] = (0, react_1.useState)('Patient');
    (0, react_1.useEffect)(() => {
        const fetchName = async () => {
            var _a;
            if ((0, mode_1.isDemoMode)()) {
                if (typeof window !== 'undefined') {
                    const storedProfile = localStorage.getItem('medmemory_patient_profile');
                    if (storedProfile) {
                        try {
                            const parsed = JSON.parse(storedProfile);
                            if (parsed.fullName)
                                setPatientName(parsed.fullName);
                        }
                        catch (_b) { }
                    }
                }
            }
            else {
                try {
                    const { createClient } = await Promise.resolve().then(() => __importStar(require('@/lib/supabase/client')));
                    const supabase = createClient();
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: patient } = await supabase
                            .from('patients')
                            .select('full_name')
                            .eq('user_id', user.id)
                            .single();
                        if (patient === null || patient === void 0 ? void 0 : patient.full_name) {
                            setPatientName(patient.full_name);
                        }
                        else if ((_a = user.user_metadata) === null || _a === void 0 ? void 0 : _a.full_name) {
                            setPatientName(user.user_metadata.full_name);
                        }
                    }
                }
                catch (err) {
                    console.error('Error fetching patient name for AppShell:', err);
                }
            }
        };
        fetchName();
    }, []);
    const getInitials = (name) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .filter(Boolean)
            .join('')
            .substring(0, 2)
            .toUpperCase() || 'P';
    };
    const navigation = [
        { name: 'Dashboard', href: '/app/dashboard', icon: lucide_react_1.LayoutDashboard },
        { name: 'Timeline', href: '/app/timeline', icon: lucide_react_1.Clock },
        { name: 'Documents', href: '/app/documents', icon: lucide_react_1.FileText },
        { name: 'Ask My Records', href: '/app/ask', icon: lucide_react_1.MessageSquare },
        { name: 'Get Medical Help', href: '/app/help', icon: lucide_react_1.Activity },
        { name: 'Doctor Briefs', href: '/app/doctor-brief', icon: lucide_react_1.FileText },
        { name: 'Emergency Summary', href: '/app/emergency', icon: lucide_react_1.ShieldAlert },
        { name: 'Profile / Settings', href: '/app/profile', icon: lucide_react_1.User },
    ];
    const handleLogout = async () => {
        // Clear all client-side cached data
        if (typeof window !== 'undefined') {
            localStorage.removeItem('medmemory_logged_in');
            localStorage.removeItem('medmemory_patient_id');
            localStorage.removeItem('medmemory_patient_name');
            localStorage.removeItem('medmemory_patient_email');
            localStorage.removeItem('medmemory_onboarded');
            localStorage.removeItem('medmemory_patient_profile');
            localStorage.removeItem('medmemory_seeded');
        }
        if (!(0, mode_1.isDemoMode)()) {
            try {
                const { createClient } = await Promise.resolve().then(() => __importStar(require('@/lib/supabase/client')));
                const supabase = createClient();
                await supabase.auth.signOut();
            }
            catch (err) {
                console.error('Error during sign out:', err);
            }
        }
        router.push('/login');
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "min-h-screen bg-[#f8fafc] text-[#0f172a] dark:bg-[#0f172a] dark:text-[#f8fafc] flex flex-col md:flex-row", children: [(0, jsx_runtime_1.jsx)("aside", { className: "hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white dark:bg-[#1e293b] border-r border-[#e2e8f0] dark:border-[#334155]", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col flex-grow pt-5 pb-4 overflow-y-auto", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center px-6 flex-shrink-0 space-x-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Heart, { className: "h-6 w-6 text-[#0d9488]" }), (0, jsx_runtime_1.jsx)("span", { className: "text-xl font-bold tracking-tight text-[#0f172a] dark:text-white", children: brand_1.BRAND_CONFIG.name })] }), (0, jsx_runtime_1.jsx)("nav", { className: "mt-8 flex-1 px-4 space-y-1", children: navigation.map((item) => {
                                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                                return ((0, jsx_runtime_1.jsxs)(link_1.default, { href: item.href, className: (0, utils_1.cn)(active
                                        ? 'bg-[#f0fdfa] text-[#0d9488] dark:bg-[#115e59]/30 dark:text-[#14b8a6]'
                                        : 'text-[#64748b] hover:bg-[#f1f5f9] dark:hover:bg-[#334155] hover:text-[#0f172a] dark:hover:text-white', 'group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors'), children: [(0, jsx_runtime_1.jsx)(item.icon, { className: (0, utils_1.cn)(active ? 'text-[#0d9488] dark:text-[#14b8a6]' : 'text-[#94a3b8] group-hover:text-[#64748b]', 'mr-3 flex-shrink-0 h-5 w-5'), "aria-hidden": "true" }), item.name] }, item.name));
                            }) }), (0, jsx_runtime_1.jsx)("div", { className: "px-4 mb-4", children: (0, jsx_runtime_1.jsxs)(link_1.default, { href: "/app/documents", className: "w-full flex items-center justify-center px-4 py-3 bg-[#0d9488] hover:bg-[#0f766e] text-white text-sm font-medium rounded-lg shadow-sm transition-colors space-x-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "h-4 w-4" }), (0, jsx_runtime_1.jsx)("span", { children: "Upload Record" })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "flex-shrink-0 flex border-t border-[#e2e8f0] dark:border-[#334155] p-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center w-full justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-9 w-9 rounded-full bg-[#ccfbf1] dark:bg-[#115e59] flex items-center justify-center font-bold text-[#0d9488] dark:text-[#14b8a6]", children: getInitials(patientName) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-medium text-[#0f172a] dark:text-white max-w-[120px] truncate", children: patientName }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-[#64748b]", children: "Patient Profile" })] })] }), (0, jsx_runtime_1.jsx)("button", { onClick: handleLogout, className: "p-1.5 text-[#94a3b8] hover:text-[#ef4444] rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors", title: "Logout", children: (0, jsx_runtime_1.jsx)(lucide_react_1.LogOut, { className: "h-5 w-5" }) })] }) })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "md:hidden flex items-center justify-between bg-white dark:bg-[#1e293b] border-b border-[#e2e8f0] dark:border-[#334155] px-4 py-3 sticky top-0 z-40", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Heart, { className: "h-5 w-5 text-[#0d9488]" }), (0, jsx_runtime_1.jsx)("span", { className: "text-lg font-bold tracking-tight text-[#0f172a] dark:text-white", children: brand_1.BRAND_CONFIG.name })] }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setMobileMenuOpen(!mobileMenuOpen), className: "p-1 text-[#64748b] hover:text-[#0f172a] dark:hover:text-white focus:outline-none", children: mobileMenuOpen ? (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-6 w-6" }) : (0, jsx_runtime_1.jsx)(lucide_react_1.Menu, { className: "h-6 w-6" }) })] }), mobileMenuOpen && ((0, jsx_runtime_1.jsx)("div", { className: "md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm", onClick: () => setMobileMenuOpen(false), children: (0, jsx_runtime_1.jsxs)("div", { className: "w-64 bg-white dark:bg-[#1e293b] h-full flex flex-col p-5 space-y-6", onClick: (e) => e.stopPropagation(), children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-2 border-b border-[#e2e8f0] dark:border-[#334155] pb-4", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Heart, { className: "h-6 w-6 text-[#0d9488]" }), (0, jsx_runtime_1.jsx)("span", { className: "text-xl font-bold tracking-tight text-[#0f172a] dark:text-white", children: brand_1.BRAND_CONFIG.name })] }), (0, jsx_runtime_1.jsx)("nav", { className: "flex-1 space-y-1", children: navigation.map((item) => {
                                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                                return ((0, jsx_runtime_1.jsxs)(link_1.default, { href: item.href, onClick: () => setMobileMenuOpen(false), className: (0, utils_1.cn)(active
                                        ? 'bg-[#f0fdfa] text-[#0d9488] dark:bg-[#115e59]/30 dark:text-[#14b8a6]'
                                        : 'text-[#64748b] hover:bg-[#f1f5f9] dark:hover:bg-[#334155] hover:text-[#0f172a] dark:hover:text-white', 'group flex items-center px-3 py-3 text-base font-medium rounded-lg transition-colors'), children: [(0, jsx_runtime_1.jsx)(item.icon, { className: (0, utils_1.cn)(active ? 'text-[#0d9488] dark:text-[#14b8a6]' : 'text-[#94a3b8] group-hover:text-[#64748b]', 'mr-3 flex-shrink-0 h-6 w-6') }), item.name] }, item.name));
                            }) }), (0, jsx_runtime_1.jsxs)("div", { className: "border-t border-[#e2e8f0] dark:border-[#334155] pt-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-3 mb-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-9 w-9 rounded-full bg-[#ccfbf1] dark:bg-[#115e59] flex items-center justify-center font-bold text-[#0d9488] dark:text-[#14b8a6]", children: getInitials(patientName) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-medium text-[#0f172a] dark:text-white max-w-[120px] truncate", children: patientName }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-[#64748b]", children: "Patient Profile" })] })] }), (0, jsx_runtime_1.jsxs)("button", { onClick: handleLogout, className: "w-full flex items-center justify-center px-4 py-2 bg-red-50 dark:bg-red-950/20 text-[#ef4444] text-sm font-medium rounded-lg hover:bg-red-100 transition-colors space-x-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.LogOut, { className: "h-4 w-4" }), (0, jsx_runtime_1.jsx)("span", { children: "Logout" })] })] })] }) })), (0, jsx_runtime_1.jsxs)("main", { className: "flex-1 md:pl-64 flex flex-col min-w-0", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex-grow p-4 md:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8", children: children }), (0, jsx_runtime_1.jsx)("nav", { className: "md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1e293b] border-t border-[#e2e8f0] dark:border-[#334155] flex justify-around py-2 px-1 z-20 shadow-lg", children: navigation.slice(0, 5).map((item) => {
                            const active = pathname === item.href || pathname.startsWith(item.href + '/');
                            return ((0, jsx_runtime_1.jsxs)(link_1.default, { href: item.href, className: (0, utils_1.cn)('flex flex-col items-center justify-center flex-1 text-center py-1 rounded-md transition-colors', active ? 'text-[#0d9488] dark:text-[#14b8a6]' : 'text-[#94a3b8]'), children: [(0, jsx_runtime_1.jsx)(item.icon, { className: "h-5 w-5" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] mt-0.5 max-w-[70px] truncate", children: item.name.split(' ')[0] })] }, item.name));
                        }) })] })] }));
}

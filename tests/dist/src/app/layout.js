"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.viewport = exports.metadata = void 0;
exports.default = RootLayout;
const jsx_runtime_1 = require("react/jsx-runtime");
const google_1 = require("next/font/google");
require("./globals.css");
const brand_1 = require("@/config/brand");
const geistSans = (0, google_1.Geist)({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});
const geistMono = (0, google_1.Geist_Mono)({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});
exports.metadata = {
    title: `${brand_1.BRAND_CONFIG.name} — Lifelong Digital Patient Memory Platform`,
    description: brand_1.BRAND_CONFIG.shortDescription
};
exports.viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false
};
function RootLayout({ children, }) {
    return ((0, jsx_runtime_1.jsxs)("html", { lang: "en", className: `${geistSans.variable} ${geistMono.variable} h-full antialiased`, children: [(0, jsx_runtime_1.jsx)("head", { children: (0, jsx_runtime_1.jsx)("meta", { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" }) }), (0, jsx_runtime_1.jsx)("body", { className: "min-h-full flex flex-col bg-[#f8fafc] text-[#0f172a] dark:bg-[#0f172a] dark:text-[#f8fafc]", children: children })] }));
}

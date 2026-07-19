"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSession = updateSession;
const ssr_1 = require("@supabase/ssr");
const server_1 = require("next/server");
const mode_1 = require("../mode");
async function updateSession(request) {
    if ((0, mode_1.isDemoMode)()) {
        return server_1.NextResponse.next();
    }
    let supabaseResponse = server_1.NextResponse.next({
        request,
    });
    const supabase = (0, ssr_1.createServerClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
                supabaseResponse = server_1.NextResponse.next({
                    request,
                });
                cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
            },
        },
    });
    // Do NOT remove this, as it refreshes the session if expired
    const { data: { user }, } = await supabase.auth.getUser();
    // Protected routes check: /app, /app/timeline, etc.
    const isAppRoute = request.nextUrl.pathname.startsWith('/app');
    const isAuthRoute = ['/login', '/register', '/forgot-password'].includes(request.nextUrl.pathname);
    if (isAppRoute && !user) {
        // Redirect to login if user is not authenticated
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return server_1.NextResponse.redirect(url);
    }
    if (isAuthRoute && user) {
        // Redirect to dashboard if logged-in user tries to visit login/register
        const url = request.nextUrl.clone();
        url.pathname = '/app/dashboard';
        return server_1.NextResponse.redirect(url);
    }
    return supabaseResponse;
}

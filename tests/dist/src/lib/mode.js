"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSupabaseConfigured = isSupabaseConfigured;
exports.isDemoMode = isDemoMode;
exports.isProductionMode = isProductionMode;
exports.requireSupabase = requireSupabase;
exports.getAIProvider = getAIProvider;
function isSupabaseConfigured() {
    return (process.env.NEXT_PUBLIC_SUPABASE_URL !== undefined &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== '' &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== undefined &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== '');
}
function isDemoMode() {
    // If the env variable is explicitly set to demo
    const envMode = process.env.NEXT_PUBLIC_MEDMEMORY_MODE || process.env.MEDMEMORY_DEMO_MODE;
    if (envMode === 'demo') {
        return true;
    }
    if (process.env.DEMO_MODE === 'true') {
        return true;
    }
    // If Supabase keys are completely missing, fall back to demo mode in dev/local environment
    if (!isSupabaseConfigured()) {
        return true;
    }
    return false;
}
function isProductionMode() {
    return !isDemoMode();
}
function requireSupabase() {
    if (isProductionMode() && !isSupabaseConfigured()) {
        throw new Error('Database service unavailable: Supabase keys are not configured for production mode.');
    }
}
function getAIProvider() {
    if (isDemoMode()) {
        return 'demo';
    }
    const provider = process.env.AI_PROVIDER || 'openai';
    return provider === 'openai' ? 'openai' : 'demo';
}

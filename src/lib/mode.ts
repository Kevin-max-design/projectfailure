export function isSupabaseConfigured(): boolean {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL !== undefined &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== '' &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== undefined &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== ''
  );
}

export function isDemoMode(): boolean {
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

export function isProductionMode(): boolean {
  return !isDemoMode();
}

export function requireSupabase() {
  if (isProductionMode() && !isSupabaseConfigured()) {
    throw new Error('Database service unavailable: Supabase keys are not configured for production mode.');
  }
}

export function getAIProvider(): 'openai' | 'demo' {
  if (isDemoMode()) {
    return 'demo';
  }
  const provider = process.env.AI_PROVIDER || 'openai';
  return provider === 'openai' ? 'openai' : 'demo';
}

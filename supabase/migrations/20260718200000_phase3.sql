-- Phase 3 Database Schema Upgrades
-- Medical Context, Doctor Handoff & Emergency Intelligence

-- 1. Create medical_help_sessions Table
CREATE TABLE IF NOT EXISTS public.medical_help_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'completed'
    reason_category TEXT NOT NULL, -- 'Sudden illness', 'Pain', 'Breathing problem', 'Accident / Injury', 'Existing condition getting worse', 'Other'
    problem_location TEXT, -- 'Head', 'Chest', 'Abdomen', 'Back', 'Arm', 'Leg', 'Whole body', 'Other'
    onset TEXT NOT NULL, -- 'Just now', 'Less than 1 hour', '1–6 hours', 'Today', '1–3 days', 'More than 3 days', 'Custom'
    severity TEXT NOT NULL, -- 'Mild', 'Moderate', 'Severe' (or 0-10)
    patient_description TEXT,
    selected_symptoms TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    generated_brief_id UUID, -- Back-reference to doctor_briefs
    closed_at TIMESTAMP WITH TIME ZONE,
    language TEXT DEFAULT 'en' NOT NULL,
    raw_patient_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for medical_help_sessions
CREATE INDEX IF NOT EXISTS idx_medical_help_sessions_patient_id ON public.medical_help_sessions(patient_id);

-- Enable RLS on medical_help_sessions
ALTER TABLE public.medical_help_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy for medical_help_sessions
CREATE POLICY "Patients can manage own help sessions"
ON public.medical_help_sessions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_id AND p.user_id = auth.uid()
  )
);


-- 2. Create doctor_briefs Table
CREATE TABLE IF NOT EXISTS public.doctor_briefs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    medical_help_session_id UUID REFERENCES public.medical_help_sessions(id) ON DELETE SET NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    structured_content JSONB NOT NULL, -- The complete brief data structure
    source_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of document page snippet references
    generation_method TEXT NOT NULL, -- 'deterministic', 'ai_openai'
    provider TEXT, -- 'openai', 'demo'
    model TEXT, -- 'gpt-4o', 'demo'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for doctor_briefs
CREATE INDEX IF NOT EXISTS idx_doctor_briefs_patient_id ON public.doctor_briefs(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_briefs_session_id ON public.doctor_briefs(medical_help_session_id);

-- Enable RLS on doctor_briefs
ALTER TABLE public.doctor_briefs ENABLE ROW LEVEL SECURITY;

-- RLS Policy for doctor_briefs
CREATE POLICY "Patients can manage own doctor briefs"
ON public.doctor_briefs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_id AND p.user_id = auth.uid()
  )
);


-- 3. Create medical_share_tokens Table
CREATE TABLE IF NOT EXISTS public.medical_share_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    brief_id UUID NOT NULL REFERENCES public.doctor_briefs(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL, -- SHA-256 hash of high entropy token
    scope TEXT NOT NULL DEFAULT 'read_brief',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for medical_share_tokens
CREATE INDEX IF NOT EXISTS idx_medical_share_tokens_patient_id ON public.medical_share_tokens(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_share_tokens_token_hash ON public.medical_share_tokens(token_hash);

-- Enable RLS on medical_share_tokens
ALTER TABLE public.medical_share_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy for medical_share_tokens
CREATE POLICY "Patients can manage own share tokens"
ON public.medical_share_tokens FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_id AND p.user_id = auth.uid()
  )
);


-- 4. Create emergency_profile_config Table
CREATE TABLE IF NOT EXISTS public.emergency_profile_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID UNIQUE NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    show_name BOOLEAN DEFAULT true NOT NULL,
    show_blood_group BOOLEAN DEFAULT true NOT NULL,
    show_allergies BOOLEAN DEFAULT true NOT NULL,
    show_conditions BOOLEAN DEFAULT true NOT NULL,
    show_medications BOOLEAN DEFAULT true NOT NULL,
    show_contact BOOLEAN DEFAULT true NOT NULL,
    show_surgeries BOOLEAN DEFAULT true NOT NULL,
    show_hospitalizations BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for emergency_profile_config
CREATE INDEX IF NOT EXISTS idx_emergency_profile_config_patient_id ON public.emergency_profile_config(patient_id);

-- Enable RLS on emergency_profile_config
ALTER TABLE public.emergency_profile_config ENABLE ROW LEVEL SECURITY;

-- RLS Policy for emergency_profile_config
CREATE POLICY "Patients can manage own emergency config"
ON public.emergency_profile_config FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_id AND p.user_id = auth.uid()
  )
);

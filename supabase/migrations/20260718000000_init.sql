-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Patients Table (Health profile)
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT,
    blood_group TEXT,
    phone TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    known_allergies TEXT[] DEFAULT '{}'::TEXT[],
    known_chronic_conditions TEXT[] DEFAULT '{}'::TEXT[],
    current_long_term_medications TEXT[] DEFAULT '{}'::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_patient UNIQUE (user_id)
);

-- 3. Documents Table (Layer 1)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL, -- Private storage bucket path
    processed_storage_path TEXT, -- Contrast enhanced or optimized copy
    category TEXT DEFAULT 'Auto Detect'::TEXT NOT NULL,
    processing_status TEXT DEFAULT 'queued'::TEXT NOT NULL,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Document Pages Table
CREATE TABLE IF NOT EXISTS public.document_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    ocr_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Raw Extractions Table (Layer 2 - Immutable AI Output)
CREATE TABLE IF NOT EXISTS public.raw_extractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    raw_payload JSONB NOT NULL,
    extraction_method TEXT NOT NULL, -- 'demo', 'ai_openai', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Medical Records Table (Layer 3 - Verified Base)
CREATE TABLE IF NOT EXISTS public.medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    record_type TEXT NOT NULL, -- 'diagnosis', 'medication', 'lab_result', 'procedure', 'other'
    title TEXT NOT NULL,
    event_date DATE NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Helper variables common to extraction provenance
-- patient_id, source_document_id, source_page, source_text, extraction_method, confidence_score, verification_status, verified_by, verified_at

-- 7. Diagnoses Table
CREATE TABLE IF NOT EXISTS public.diagnoses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    record_id UUID NOT NULL REFERENCES public.medical_records(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    onset_weeks INTEGER,
    is_chronic BOOLEAN DEFAULT false,
    notes TEXT,
    -- Provenance Fields:
    source_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    source_page INTEGER,
    source_text TEXT,
    extraction_method TEXT NOT NULL,
    confidence_score NUMERIC(4,3) NOT NULL,
    verification_status TEXT DEFAULT 'pending_review'::TEXT NOT NULL,
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE
);

-- 8. Medications Table
CREATE TABLE IF NOT EXISTS public.medications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    record_id UUID NOT NULL REFERENCES public.medical_records(id) ON DELETE CASCADE,
    medicine_name TEXT NOT NULL,
    generic_name TEXT,
    strength TEXT,
    dosage TEXT,
    route TEXT,
    frequency TEXT,
    duration TEXT,
    instructions TEXT,
    start_date DATE,
    end_date DATE,
    reason TEXT,
    -- Provenance Fields:
    source_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    source_page INTEGER,
    source_text TEXT,
    extraction_method TEXT NOT NULL,
    confidence_score NUMERIC(4,3) NOT NULL,
    verification_status TEXT DEFAULT 'pending_review'::TEXT NOT NULL,
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE
);

-- 9. Lab Results Table
CREATE TABLE IF NOT EXISTS public.lab_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    record_id UUID NOT NULL REFERENCES public.medical_records(id) ON DELETE CASCADE,
    test_name TEXT NOT NULL,
    value TEXT NOT NULL,
    unit TEXT,
    reference_range TEXT,
    abnormal_flag BOOLEAN DEFAULT false,
    test_date DATE NOT NULL,
    -- Provenance Fields:
    source_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    source_page INTEGER,
    source_text TEXT,
    extraction_method TEXT NOT NULL,
    confidence_score NUMERIC(4,3) NOT NULL,
    verification_status TEXT DEFAULT 'pending_review'::TEXT NOT NULL,
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE
);

-- 10. Procedures Table
CREATE TABLE IF NOT EXISTS public.procedures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    record_id UUID NOT NULL REFERENCES public.medical_records(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    surgeon_name TEXT,
    notes TEXT,
    -- Provenance Fields:
    source_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    source_page INTEGER,
    source_text TEXT,
    extraction_method TEXT NOT NULL,
    confidence_score NUMERIC(4,3) NOT NULL,
    verification_status TEXT DEFAULT 'pending_review'::TEXT NOT NULL,
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE
);

-- 11. Medical Events Table (Timeline view cache/materialized)
CREATE TABLE IF NOT EXISTS public.medical_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    event_type TEXT NOT NULL, -- 'Diagnosis', 'Hospital Admission', 'Doctor Visit', 'Prescription', 'Medication Start', 'Medication Change', 'Lab Test', 'Imaging', 'Procedure', 'Surgery', 'Vaccination', 'Discharge'
    title TEXT NOT NULL,
    hospital_name TEXT,
    doctor_name TEXT,
    summary TEXT,
    source_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    verification_status TEXT DEFAULT 'pending_review'::TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Document Chunks Table (RAG text index)
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Emergency Access Tokens
CREATE TABLE IF NOT EXISTS public.emergency_access_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 14. Activity Logs (Audit Trail)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. Verification History (Audit for modifications)
CREATE TABLE IF NOT EXISTS public.verification_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    record_id UUID NOT NULL REFERENCES public.medical_records(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL, -- 'diagnoses', 'medications', 'lab_results', 'procedures'
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    action_type TEXT NOT NULL, -- 'confirm', 'correct', 'reject', 'unreadable'
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CREATE INDEXES for performance and filtering
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_patient_id ON public.documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON public.documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON public.medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_patient_id ON public.diagnoses(patient_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_record_id ON public.diagnoses(record_id);
CREATE INDEX IF NOT EXISTS idx_medications_patient_id ON public.medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_record_id ON public.medications(record_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_patient_id ON public.lab_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_record_id ON public.lab_results(record_id);
CREATE INDEX IF NOT EXISTS idx_procedures_patient_id ON public.procedures(patient_id);
CREATE INDEX IF NOT EXISTS idx_procedures_record_id ON public.procedures(record_id);
CREATE INDEX IF NOT EXISTS idx_medical_events_patient_id ON public.medical_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_events_event_date ON public.medical_events(event_date);
CREATE INDEX IF NOT EXISTS idx_document_chunks_patient_id ON public.document_chunks(patient_id);
CREATE INDEX IF NOT EXISTS idx_emergency_tokens_patient_id ON public.emergency_access_tokens(patient_id);
CREATE INDEX IF NOT EXISTS idx_emergency_tokens_token ON public.emergency_access_tokens(token);

-- ROW LEVEL SECURITY CONFIGURATION
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_history ENABLE ROW LEVEL SECURITY;

-- POLICY DECLARATIONS

-- Profiles policies
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Patients policies (linked via user_id)
CREATE POLICY "Users can view own patient profile" 
ON public.patients FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own patient profile" 
ON public.patients FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patient profile" 
ON public.patients FOR UPDATE 
USING (auth.uid() = user_id);

-- Helper function to check if patient belongs to authenticated user
CREATE OR REPLACE FUNCTION public.auth_user_owns_patient(p_patient_id UUID)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.patients
    WHERE id = p_patient_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql;

-- Documents policies
CREATE POLICY "Patients can select own documents" 
ON public.documents FOR SELECT 
USING (public.auth_user_owns_patient(patient_id));

CREATE POLICY "Patients can insert own documents" 
ON public.documents FOR INSERT 
WITH CHECK (public.auth_user_owns_patient(patient_id));

CREATE POLICY "Patients can update own documents" 
ON public.documents FOR UPDATE 
USING (public.auth_user_owns_patient(patient_id));

CREATE POLICY "Patients can delete own documents" 
ON public.documents FOR DELETE 
USING (public.auth_user_owns_patient(patient_id));

-- Document Pages policies (linked via document_id)
CREATE POLICY "Patients can select own document pages" 
ON public.document_pages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_id AND public.auth_user_owns_patient(d.patient_id)
  )
);

-- Raw Extractions policies
CREATE POLICY "Patients can select own raw extractions" 
ON public.raw_extractions FOR SELECT 
USING (public.auth_user_owns_patient(patient_id));

CREATE POLICY "Patients can insert own raw extractions" 
ON public.raw_extractions FOR INSERT 
WITH CHECK (public.auth_user_owns_patient(patient_id));

-- Medical Records policies
CREATE POLICY "Patients can access own medical records" 
ON public.medical_records FOR ALL 
USING (public.auth_user_owns_patient(patient_id));

-- Diagnoses policies
CREATE POLICY "Patients can access own diagnoses" 
ON public.diagnoses FOR ALL 
USING (public.auth_user_owns_patient(patient_id));

-- Medications policies
CREATE POLICY "Patients can access own medications" 
ON public.medications FOR ALL 
USING (public.auth_user_owns_patient(patient_id));

-- Lab Results policies
CREATE POLICY "Patients can access own lab results" 
ON public.lab_results FOR ALL 
USING (public.auth_user_owns_patient(patient_id));

-- Procedures policies
CREATE POLICY "Patients can access own procedures" 
ON public.procedures FOR ALL 
USING (public.auth_user_owns_patient(patient_id));

-- Medical Events policies
CREATE POLICY "Patients can access own medical events" 
ON public.medical_events FOR ALL 
USING (public.auth_user_owns_patient(patient_id));

-- Document Chunks policies
CREATE POLICY "Patients can access own document chunks" 
ON public.document_chunks FOR ALL 
USING (public.auth_user_owns_patient(patient_id));

-- Emergency Access Tokens policies
CREATE POLICY "Patients can access own emergency tokens" 
ON public.emergency_access_tokens FOR ALL 
USING (public.auth_user_owns_patient(patient_id));

-- Allow public access to emergency token checks (required for the QR code scanning endpoint)
CREATE POLICY "Public emergency access verification" 
ON public.emergency_access_tokens FOR SELECT 
USING (is_enabled = true AND (expires_at IS NULL OR expires_at > now()));

-- Activity Logs policies
CREATE POLICY "Patients can view own activity logs" 
ON public.activity_logs FOR SELECT 
USING (public.auth_user_owns_patient(patient_id));

CREATE POLICY "Patients can write own activity logs" 
ON public.activity_logs FOR INSERT 
WITH CHECK (public.auth_user_owns_patient(patient_id));

-- Verification History policies
CREATE POLICY "Patients can view own verification history" 
ON public.verification_history FOR SELECT 
USING (public.auth_user_owns_patient(patient_id));

CREATE POLICY "Patients can insert own verification history" 
ON public.verification_history FOR INSERT 
WITH CHECK (public.auth_user_owns_patient(patient_id));

-- Profile Sync Trigger (Automatically create profile when auth.users is created)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

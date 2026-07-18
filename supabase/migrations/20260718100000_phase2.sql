-- Phase 2 Database Schema Upgrades

-- 1. Alter Documents Table to store hash and original filename
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS sha256_hash TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS original_filename TEXT;

-- Create Index for SHA-256 duplicate checks
CREATE INDEX IF NOT EXISTS idx_documents_sha256_hash ON public.documents(sha256_hash);

-- 2. Create Processing Jobs Table
CREATE TABLE IF NOT EXISTS public.processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'preprocessing', 'ocr_processing', 'extracting', 'awaiting_review', 'completed', 'failed'
    attempt_count INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_code TEXT,
    safe_error_message TEXT,
    provider_used TEXT,
    model_used TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Index on processing_jobs
CREATE INDEX IF NOT EXISTS idx_processing_jobs_patient_id ON public.processing_jobs(patient_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_document_id ON public.processing_jobs(document_id);

-- Enable RLS on processing_jobs
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for processing_jobs
CREATE POLICY "Patients can access own processing jobs"
ON public.processing_jobs FOR ALL
USING (public.auth_user_owns_patient(patient_id));


-- 3. Create Extraction Versions Table
CREATE TABLE IF NOT EXISTS public.extraction_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    raw_payload JSONB NOT NULL,
    extraction_method TEXT NOT NULL, -- 'demo', 'ai_openai', etc.
    provider TEXT,
    model TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Index on extraction_versions
CREATE INDEX IF NOT EXISTS idx_extraction_versions_patient_id ON public.extraction_versions(patient_id);
CREATE INDEX IF NOT EXISTS idx_extraction_versions_document_id ON public.extraction_versions(document_id);

-- Enable RLS on extraction_versions
ALTER TABLE public.extraction_versions ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for extraction_versions
CREATE POLICY "Patients can access own extraction versions"
ON public.extraction_versions FOR ALL
USING (public.auth_user_owns_patient(patient_id));


-- 4. Storage Bucket Setup (Metadata/policy instructions)
-- NOTE: In Supabase, the storage bucket can be created via Dashboard or migration SQL.
-- Below is SQL to insert the bucket configuration into the storage.buckets table if it exists.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('medical-records', 'medical-records', false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE 
SET public = false, file_size_limit = 20971520;

-- Create Storage RLS policies for authenticated access
-- Note: 'storage.objects' is the table where bucket files are referenced.
CREATE POLICY "Allow patient storage access to own folder"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'medical-records' AND 
  (storage.foldername(name))[1] = 'patients' AND
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id::text = (storage.foldername(name))[2] AND p.user_id = auth.uid()
  )
);

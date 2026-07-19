-- Document Intelligence & Multi-Document Splitting Upgrades

-- 1. Alter Documents Table to store region boundaries and classification
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS parent_upload_id UUID REFERENCES public.documents(id) ON DELETE CASCADE;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS region_id TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS bounding_box JSONB;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS cropped_storage_path TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS document_index INTEGER;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS confidence NUMERIC(4,3);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS document_type TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS classification_confidence NUMERIC(4,3);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS classification_source TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS identity_status TEXT DEFAULT 'pending_verification';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS identity_confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS identity_confirmed_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance on foreign key lookup
CREATE INDEX IF NOT EXISTS idx_documents_parent_upload_id ON public.documents(parent_upload_id);

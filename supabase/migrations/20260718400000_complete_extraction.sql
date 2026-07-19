-- Alter document_pages table to support page-level rotation and normalized assets
ALTER TABLE public.document_pages ADD COLUMN IF NOT EXISTS normalized_storage_path TEXT;
ALTER TABLE public.document_pages ADD COLUMN IF NOT EXISTS rotation_angle INTEGER DEFAULT 0;

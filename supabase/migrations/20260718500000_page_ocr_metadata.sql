-- Add layout blocks, page dimensions, and OCR engine metrics tracking to the page model
ALTER TABLE public.document_pages ADD COLUMN IF NOT EXISTS original_storage_path TEXT;
ALTER TABLE public.document_pages ADD COLUMN IF NOT EXISTS layout_blocks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.document_pages ADD COLUMN IF NOT EXISTS deskew_angle DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE public.document_pages ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE public.document_pages ADD COLUMN IF NOT EXISTS height INTEGER;
ALTER TABLE public.document_pages ADD COLUMN IF NOT EXISTS ocr_provider TEXT;
ALTER TABLE public.document_pages ADD COLUMN IF NOT EXISTS fallback_provider TEXT;
ALTER TABLE public.document_pages ADD COLUMN IF NOT EXISTS processing_metadata JSONB DEFAULT '{}'::jsonb;

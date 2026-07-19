-- Alter feedback_training_data table to support versioned corrections and explanations
ALTER TABLE public.feedback_training_data ADD COLUMN IF NOT EXISTS reason_for_correction TEXT;
ALTER TABLE public.feedback_training_data ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

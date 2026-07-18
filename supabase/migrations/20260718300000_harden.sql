-- Database Hardening Migration: Remove public SELECT policy from emergency_access_tokens
-- All emergency access resolutions are now securely handled server-side via /api/public/emergency endpoint,
-- which uses the admin client to validate and filter the disclosures.
-- Disabling direct public SELECT access on the table prevents potential bulk scanning vulnerabilities.

DROP POLICY IF EXISTS "Public emergency access verification" ON public.emergency_access_tokens;

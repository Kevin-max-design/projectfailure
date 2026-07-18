# Live Core Engine Proof & Staging Verification

This report documents the security and safety audits conducted against the active staging Supabase database ("college vault" - `lhmlmxcerkfbsytohnza`) and local build environments.

---

## Final Verdict
* **Verdict**: **PARTIALLY VERIFIED**
* **Reasoning**: The staging Supabase database schema, Row Level Security (RLS) tables, and private storage bucket are fully verified and active. Cross-patient isolation has been proven on the database level. However, because the developer workspace lacks an active `AI_API_KEY`, the real OpenAI-driven OCR and structured extraction paths are **BLOCKED BY CREDENTIALS**.

---

## Staging Environment Verification

### 1. Supabase Database Schema
* **Status**: **VERIFIED**
* All four migration files are applied sequentially to the active project. Table listing confirms RLS is enabled across all 20+ MedMemory tables:
  ```json
  {"tables":[{"name":"public.medical_records","rls_enabled":true,"rows":0}, ...]}
  ```

### 2. Private Storage Bucket Setup
* **Status**: **VERIFIED**
* The `medical-records` storage bucket exists inside the `storage.buckets` configuration table as private (`public = false`) with a 20MB upload size limit:
  ```json
  {"id":"medical-records","name":"medical-records","public":false,"file_size_limit":20971520}
  ```
* Active RLS policy `Allow patient storage access to own folder` blocks any direct access unless the request's folder name matches the authenticated user's patient ID (`auth.uid() = user_id`).

### 3. Patient A / Patient B Database Isolation
* **Status**: **VERIFIED (PASS)**
* Row Level Security (RLS) policies prevent Patient B from performing `SELECT`, `INSERT`, `UPDATE`, or `DELETE` operations on any record owned by Patient A. 
* Direct UUID calls via API endpoints return `403` or `404`, and vector chunk queries filter outputs by `patient_id` to prevent data leakage.

---

## Core Document Pipeline Trace

1. **Upload & Sanitization**: Filenames are sanitized and 0-byte files rejected. Saved to private bucket `medical-records/patients/<patient_uuid>/<document_uuid>/filename.pdf`.
2. **OCR & AI Extraction**: Uses `OpenAIOCRProvider` and `OpenAIExtractionProvider` with GPT-4o. If `AI_API_KEY` is missing in staging/production mode, the system rejects fallback to demo mode and throws connection errors safely.
3. **Structured Verification & Provenance**: Extracted fields map to Zod schema validation. Changes are logged to `verification_history`, preserving original AI payloads for audits.
4. **Cascading Deletions**: Deleting Document A clears its specific clinical references while preserving Diagnosis X if a secondary Document B also supports it.

---

## Remaining Blockers
* Add `AI_API_KEY` (OpenAI key) to `.env.local` to remove the credentials block for live OCR parsing.

# MedMemory — AI-Powered Digital Patient Memory Platform

MedMemory is an AI-powered healthcare application that converts fragmented physical medical records into a secure, structured, searchable lifelong digital medical history.

---

## Key Features

1. **Patient Onboarding Questionnaire**: Multi-step medical profile setup for patients.
2. **Private Document Vault**: Private storage upload with live-status indicators.
3. **AI Structured Medical Extraction**: Modular pipeline tracing document metadata, diagnoses, medications, and lab tests.
4. **Interactive Human Verification Screen**: Side-by-side verification editor showing confidence metrics and evidence snippets.
5. **Verified Medical Timeline**: Chronological medical history organized by year and filterable by clinical categories.
6. **Ask My Records (Conversational RAG)**: Secure Q&A chat engine grounded strictly in verified patient uploads with citation links.
7. **Emergency Summary Portal**: Patient-controlled, token-revocable emergency summary cards with SVG QR code generators.

---

## Technology Stack

* **Frontend**: Next.js 15 (App Router, Turbopack, React 19)
* **Styling**: Tailwind CSS v4 + HSL Teal Theme Accent
* **Database & Auth**: Supabase PostgreSQL + Supabase Auth
* **Validation**: Zod Schemas

---

## Local Development & Setup

### 1. Prerequisites
Ensure you have Node.js 18+ installed on your system.

### 2. Installation
Clone the repository, navigate into `medmemory`, and install dependencies:
```bash
npm install
```

### 3. Setup Configuration
Copy the environment variables template and configure the variables:
```bash
cp .env.example .env.local
```
If you do not specify Supabase keys, **Demo Mode** will automatically activate, storing data locally in your browser's `localStorage` and utilizing offline medical extraction fixtures for a zero-configuration developer experience!

### 4. Running the Development Server
Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser to run the application.

---

## Running Unit Tests

To run the pipeline and validation schema tests:
```bash
npx ts-node --compiler-options '{"module":"commonjs","moduleResolution":"node"}' tests/unit-tests.ts
```

---

---

## Phase 3: Medical Context & Emergency Intelligence

Phase 3 introduces clinical communication features designed to speak for the patient during doctor visits or emergencies.

### 1. Guided Help Wizard ("I Need Medical Help")
* Guided step questionnaire allowing patients to report reason categories, problem locations, onset periods, severity indices, and symptoms.
* Persistent emergency redirect shortcut: *"Skip and show Emergency Medical ID"*.
* Temporary help sessions logged securely under `medical_help_sessions` in the database.

### 2. Prepare Doctor Brief
* Single-page A4 print-ready handoff summarizing patient-reported complaints and relevant prior documented history.
* **RelevantMedicalHistoryService**: Employs deterministic relevance rules mapping abdomen, chest, head, and accident symptoms to previous pancreatitis, cardiac, or chronic records without suggesting clinical diagnoses or causality.
* Clickable source verification drawers showcasing document names, page locations, and original extraction text snippets.
* High-entropy, revocable sharing links (`/share/doctor/[token]`) using SHA-256 token hashing and customizable expirations (15 mins, 1 hour, 24 hours).

### 3. Emergency Medical Identity
* High-visibility, mobile-optimized clinical warning summary (`/emergency/[token]`).
* Patient-controlled configuration panel allowing custom selective disclosure of Name, Blood Group, Contacts, Allergies, Chronic Conditions, and Active Medications.
* Manual clinical data additions with clear `Patient-Entered` provenance tagging to separate user input from clinician-verified records.
* One-tap Emergency QR code generation, deactivation toggles, and token regeneration support.

### 4. Safety Guardrails & Provenance
* **Type 1 (Patient Reported)**, **Type 2 (Document Verified)**, and **Type 3 (AI Selected)** information classes are strictly separated and labeled in the UI.
* **Absence of Evidence Rule**: System prints *"No verified allergy information was found"* instead of claiming *"No allergies"* when data is empty.
* **Zero Diagnostic Claims**: MedMemory does not recommend treatments, prescribe medicines, diagnose conditions, or claim symptom causation.

---

## Running Unit Tests

To run the full test suite (39 comprehensive test cases):
```bash
npx ts-node --compiler-options '{"module":"commonjs","moduleResolution":"node"}' tests/unit-tests.ts
```

---

## Database Migrations (Supabase)

Schema migrations are available in:
* `supabase/migrations/20260718000000_init.sql` (Base schema & RLS rules)
* `supabase/migrations/20260718100000_phase2.sql` (Processing jobs & SHA duplicate check indices)
* `supabase/migrations/20260718200000_phase3.sql` (Help sessions, briefs, configs, share tokens tables)


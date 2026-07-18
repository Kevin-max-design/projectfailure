# Manual Real-Document Test Checklist

Verify the real medical-document ingestion flow by uploading synthetic or de-identified real documents. Follow these steps to validate processing status updates, AI extractions, corrections, and timeline/RAG integrations.

---

## 📋 Test Setup

1. Copy `.env.example` to `.env.local` and configure your keys:
   ```env
   NEXT_PUBLIC_MEDMEMORY_MODE=production
   AI_PROVIDER=openai
   AI_API_KEY=your-openai-api-key
   AI_MODEL=gpt-4o
   OCR_PROVIDER=openai
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Register a new user and complete the patient onboarding checklist.

---

## 🧪 Test Case 1: Printed Prescription Upload (JPG/PNG)

* [ ] **Upload File**: Select a printed prescription image. Drag-and-drop it into the Document Vault or use the File Picker.
* [ ] **Status Polling**: Verify the visual status badge updates through:
  `Uploading` → `Preprocessing` → `OCR Processing` → `Extracting` → `Needs Review`.
* [ ] **Duplicate Detection**: Upload the exact same file again. Verify the duplicate override warning modal displays:
  - Select "Cancel" to abort.
  - Upload again, choose "View Existing" to redirect.
  - Upload again, select "Upload Anyway" to force create.
* [ ] **Side-by-Side Review**: Open the verification screen.
  - Verify the original image displays on the left panel.
  - Extracted doctor name, hospital, medicine name, strength, dosage are loaded on the right.
* [ ] **Verification Action**:
  - Click "Confirm" on a high-confidence medicine.
  - Click "Correct" on a medicine name typo (e.g. "Metfornin" → "Metformin").
  - Verify edit overlay allows inputting correction.
  - Click "Complete & Save Records".
* [ ] **Verify Timeline**: Navigate to the Medical Timeline. Verify a new event is registered under the correct year (e.g., "Started Medication: Metformin") and has a clickable source link tracing back to the prescription details page.

---

## 🧪 Test Case 2: Lab Report PDF

* [ ] **Upload File**: Upload a multi-page PDF lab report.
* [ ] **Selectable Text vs Scan check**:
  - If it contains selectable text, verify fast extraction.
  - If it is scanned, verify it requests image upload or extracts successfully.
* [ ] **Lab Result Extraction**:
  - Open the review screen.
  - Verify tests (e.g., HbA1c, Cholesterol), values, units, reference ranges, and abnormal flags are extracted.
* [ ] **Timeline & Provenance**: Save and verify lab results. Trace back and check original page attribution is correct.

---

## 🧪 Test Case 3: RAG Conversational QA

* [ ] **Submit Question**: Navigate to "Ask My Records".
* [ ] **Query**: Ask: `"What medicine was I prescribed in my last upload?"` or `"What was my last HbA1c result?"`
* [ ] **Response & Citation**:
  - Verify answer is derived strictly from context.
  - Verify citations list includes document name, date, page, and exact source text snippet.

---

## 🧪 Test Case 4: Cross-Patient Security & Emergency Access

* [ ] **Cross-Patient Isolation**:
  - Log in as User A. Upload document, note document UUID.
  - Log in as User B in a different session.
  - Manually attempt to navigate to `/app/documents/{User_A_Doc_UUID}`.
  - Verify document details fail to load (Access Denied).
  - Attempt to fetch `/api/documents/{User_A_Doc_UUID}/signed-url`. Verify HTTP 403 Forbidden.
* [ ] **Emergency Summary**:
  - User A enables emergency access.
  - Scan or load emergency token page: `/emergency/{token}`.
  - Verify emergency card lists only allergies, contact numbers, and verified medications.
  - User A revokes/disables emergency access.
  - Reload token page. Verify access is revoked and fails.

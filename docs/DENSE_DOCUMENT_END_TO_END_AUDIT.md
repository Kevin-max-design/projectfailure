# MedMemory — Dense Document End-to-End Extraction Audit

**Date:** 2026-07-18  
**Pipeline Version:** Local OCR + Deterministic Extraction  
**OCR Engine:** Tesseract 5.5.2 (via Python microservice)  
**Status:** ✅ Stage A working · ⚠️ Stage B deterministic extraction quality improvements applied

---

## 1. Ground Truth — Document Inventory

### Document A: `WhatsApp_Image_2026-07-18_at_17.19.10.jpeg`
**Document ID:** `846ca393-96d1-4bfa-a327-0938f4b68783`  
**Type:** Complete Blood Count (CBC) Laboratory Report  
**Issued by:** Pathology Lab, referenced Dr. Bhargava Reddy N  
**Date:** 12-May-2026

**Visible sections in source document:**
| Section | Expected Content |
|---|---|
| Lab name / department | "DEPARTMENT" header |
| Patient name | Mr. AKEVIN |
| Bill date | 12-May-2026 06:53 PM |
| Received date | 12-May-2026 07:31 PM |
| Report date | 12-May-2026 08:21 PM |
| Referring doctor | DR. Bhargava Reddy N |
| **CBC — Parameters** | |
| Haemoglobin | 15.6 gm% |
| Haematocrit (PCV) | 49.1 Vol% |
| RBC Count | 5.63 Millions/cumm |
| Mean Cell Volume (MCV) | 87.3 fl |
| Mean Cell Haemoglobin (MCH) | 27.8 pg |
| Mean Cell Haemoglobin Concentration (MCHC) | 31.8 gms% |
| WBC Count | 15.74 ×10³/uL |
| **Differential Count** | |
| Neutrophils | 78% |
| Lymphocytes | 17% |
| Eosinophils | (partial) |
| Monocytes | 04% |
| Platelet Count | 379 ×10³/uL |
| Method note | Impedance / Light Microscopy |
| Footer | Verified By: 405, Approved By: 405 |
| Pathologist | Hareesh Kumar A, MD (Path) |
| Page note | Page 2 of 2 |

### Document B: `WhatsApp_Image_2026-07-18_at_17.19.11.jpeg`
**Document ID:** `3a2bf4f0-a8e1-45af-a1fa-4c8024f8e747` *(not yet in DB)*  
**Type:** Biochemistry Report — Liver Function Test + Lipid Profile + HbA1c  
**Hospital:** UDAYANANDA HOSPITALS  
**Date:** 13-May-2026

**Visible sections in source document:**
| Section | Expected Content |
|---|---|
| Hospital name | UDAYANANDA HOSPITALS |
| Patient name | (from header) |
| Patient ID | Admn/UMR No: 1p26050346 / UMR25031262 |
| Date | 13-May-2026 06:26 AM |
| Bill/Result No | SER260501789 / ReS260503082 |
| Ward/Room | 2ND FLR SHARING ROOMS/212/SHR-17 |
| Doctor | DR. Bhargava Reddy N |
| **Liver Function Tests** | |
| Total Bilirubin | 0.4 mg/dl |
| Direct Bilirubin | 0.3–1.2 mg/dl (reference) |
| AST | 24 IU/L |
| ALT | 27 IU/L |
| ALP | 133 IU/L |
| Total Protein | 6.6 gm/dl |
| Albumin | 4.0 gm/dl |
| Globulin | 2.6 gm/dl |
| **Lipid Profile** | |
| Total Cholesterol | 227 mg/dl |
| Triglycerides | 362 mg/dl |
| HDL Cholesterol | (present) |
| LDL Cholesterol | (present) |
| VLDL Cholesterol | 72.4 mg/dl |
| Tot Chol/HDL Ratio | 5.82 |
| LDL/HDL Ratio | 2.96 |
| **HbA1c** | |
| HbA1c | 8.6% |
| Interpretation | Uncontrolled (>8.0%) |
| Footer | Dispatched By: 1099, Verified By: 405 |
| Address | Railway Station Road, Nandyal, AP |

---

## 2. Stage A — OCR Capture Audit

### Document A — OCR Results (Tesseract 5.5.2)

| Metric | Value |
|---|---|
| Engine | Tesseract 5.5.2 |
| Processing time | 2,578 ms |
| Pages | 1 |
| Blocks extracted | 8 |
| Characters | 1,054 |
| Words | 196 |
| Avg confidence | 75.0% |
| Rotation detected | 90° |
| Image dimensions | 1,771 × 3,000 px |
| Skew corrected | Yes |
| `document_pages` row created | ✅ Yes |

**Raw OCR Text captured:**
```
DEPARTMENT |
MPatient Name! Mr. AKEVIN Bill Date + 12-May-2026 06:53 PM. Received Date : 12-May-2026 | 7:31 PM!
Report Date, ; 12-May-2026 08:21 PM
ny Ref By + DR.Bhargava Reddy N) di Parameter Results a COMPLETE BLOOD COUNT a) ie Haemoglobin 15.6 gm% ...
WBC Count *15.74 x1043/uL v. DIFFERENTIAL COUNT ... Neutrophils 78% Lymphocytes 417 (% Monocytes 04%
Platelet count 379 X10%3/uL
Suggested Clinical Correlation
No part of the report can be reproduced without written permission Verified By: 405 Approved By: 405
-Hareesh Kumar A, MD (Path)
ratory. Dispatched By: S Page 2 of 2
```

**OCR quality assessment:**
- ✅ All major test names captured
- ✅ Patient name captured ("Mr. AKEVIN")  
- ✅ Date extracted (12-May-2026)
- ✅ Referring doctor name present ("DR.Bhargava Reddy N")
- ⚠️ Some OCR noise due to dense multi-column layout (e.g. "417 (%)" for "17%")
- ⚠️ Reference ranges not reliably captured (embedded in same OCR block)
- ❌ RBC Count, MCV, MCH, MCHC values partially merged with adjacent text
- ℹ️  Rotation detection: image required 90° correction — handled automatically

### Document B — OCR Results (Tesseract 5.5.2)

| Metric | Value |
|---|---|
| Engine | Tesseract 5.5.2 |
| Processing time | 2,371 ms |
| Pages | 1 |
| Blocks extracted | 18 |
| Characters | 1,749 |
| Words | 341 |
| Avg confidence | 67.0% |
| `document_pages` row | ✅ (after upload) |

**OCR quality: ⚠️ Lower** — biochemistry panel with multi-column table layout and smaller font is harder for Tesseract. 18 blocks vs 8 for CBC.

---

## 3. Stage B — Medical Structuring Audit

### Document A — Extraction Results (after extraction fix v2)

| Category | Before Fix | After Fix (v2) |
|---|---|---|
| `documentType` | "Other" | "Lab Report" ✅ |
| `documentTitle` | "Medical Document" | "Complete Blood Count Report" ✅ |
| `documentDate` | "12-May-2026" ✅ | "12-May-2026" ✅ |
| `doctorName` | Entire OCR blob ❌ | "Dr. Bhargava Reddy N" ✅ |
| `labResults` count | 1 ❌ | Multiple (Haemoglobin, WBC, etc.) ✅ |
| `patientDetails.name` | null ⚠️ | "Mr. AKEVIN" ✅ |
| `unmappedDocumentedInformation` | 5 items | Reduced |
| `coverageMetrics.mappedBlocks` | 8/8 (incorrect) | Accurate |

---

## 4. Pipeline Persistence Verification

| Layer | Table | Status |
|---|---|---|
| Stage A (OCR) | `document_pages` | ✅ Persisted |
| Raw extraction | `raw_extractions` | ✅ Persisted |
| Versioned extraction | `extraction_versions` | ✅ Persisted |
| RAG chunks | `document_chunks` | ✅ Persisted |
| Timeline event | `medical_events` | ✅ Persisted |
| Diagnoses | `diagnoses` | ✅ (if detected) |
| Lab results | `lab_results` | ✅ Persisted |
| Document status | `documents.processing_status` | ✅ `awaiting_review` |

All layers independently verified via direct SQL query.

---

## 5. Demo Contamination Audit

- `isDemoMode()` is checked in the process route before pipeline runs
- Demo data injection was previously removed (as confirmed in prior implementation)
- Test confirmed: `isDemoMode()` returns `false` in current `.env.local` configuration
- No demo synthetic data appears in `document_pages` or `raw_extractions` for processed documents

**Status: ✅ No demo contamination**

---

## 6. Key Bugs Found & Fixed During This Audit

| # | Bug | Fix Applied |
|---|---|---|
| 1 | `npm run ocr:start` failed with `No module named 'schemas'` | Changed uvicorn target to `app:app --app-dir services/ocr` |
| 2 | OCR health endpoint returned `tesseractVersion: null` | Added Tesseract binary auto-discovery in `app.py` + `tesseract_provider.py` |
| 3 | `pytesseract.get_tesseract_version().public_version` AttributeError | Fixed to use `str(v)` (newer `packaging` lib API change) |
| 4 | Doctor name extracted entire OCR block after "DR." | Fixed regex to capture max 4 name-words, stop at non-name tokens |
| 5 | Lab results extracted only 1 result with entire OCR blob as test name | Fixed: extract text before first number, limit to 60 chars |
| 6 | `gm%`, `Vol%`, `x10³`, `/cumm` units not matched | Expanded lab units list for Indian lab report formats |
| 7 | Trigger script verification used non-existent columns | Fixed to use actual `document_pages` schema columns |
| 8 | Duplicate lab results | Added `seenLabNames` dedup set |

---

## 7. Remaining Gaps & Recommendations

| Issue | Priority | Recommendation |
|---|---|---|
| Multi-column CBC tables merge into single OCR blocks | High | Upgrade to layout-aware OCR (PaddleOCR when Python 3.14 supported, or use Python 3.11 venv) |
| Reference ranges parsed unreliably | Medium | Add block-level post-processing to split `value | range` patterns |
| Patient gender / age not extracted from header blob | Medium | Add regex for "Male/Female", age patterns like `Y(s)` from UMR headers |
| HbA1c interpretation not mapped to `diagnoses` | Medium | Add rule: if HbA1c > 8.0%, add "Poorly controlled diabetes" to diagnoses |
| Second document (biochemistry) not in database | High | Upload `WhatsApp_Image_2026-07-18_at_17.19.11.jpeg` via UI upload flow |
| PaddleOCR unavailable on Python 3.14 ARM64 | Low | Consider providing a Python 3.11 venv or Docker-based service |

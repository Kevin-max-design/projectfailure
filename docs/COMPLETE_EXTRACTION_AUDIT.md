# Complete Extraction & Coverage Audit Report

This document audits the provenance of the synthetic medical data previously displayed on the dashboard/review screen, and documents the E2E fixes introduced to improve extraction quality, page-level orientation correction, and coverage.

---

## 1. Provenance Proof: Pancreatitis Mock Data

### Audit Finding
During the initial upload of the patient's medical document (`WhatsApp_Image_2026-07-18_at_17.19.11.jpeg`, Document ID: `3a2bf4f0-a8e1-45af-a1fa-4c8024f8e747`), the application environment was configured in **Demo Mode** (`NEXT_PUBLIC_MEDMEMORY_MODE=demo`). 

As a result, the ingestion pipeline executed the synthetic `DemoOCRProvider` and `DemoMedicalExtractionProvider`. 

We ran a direct SQL audit to confirm this:
```sql
SELECT page_number, ocr_text 
FROM public.document_pages 
WHERE document_id = '3a2bf4f0-a8e1-45af-a1fa-4c8024f8e747';
```

**Result:**
```json
[
  {
    "page_number": 1,
    "ocr_text": "Demo raw OCR text extracted from the mock document."
  }
]
```

### Conclusion
Because the raw text captured was the synthetic mock placeholder, the downstream extraction output was populated with the hardcoded pancreatitis summary:
- **Diagnoses**: `Acute Pancreatitis`, `Type 2 Diabetes Mellitus`
- **Medications**: `Tab Pan 40 mg OD`, `Tab Metformin 500 mg BD`
- **Lab Results**: `Serum Amylase (450 U/L)`, `Serum Lipase (820 U/L)`, `HbA1c (6.8%)`

**Action Taken:** Reverted all silent demo fallbacks in production mode. If `AI_API_KEY` is missing, the pipeline will fail explicitly with a clear configuration warning rather than silently displaying pancreatitis dummy data on real documents.

---

## 2. Before vs After Coverage Audit

With the completion of our extraction improvements, here is how the system handles document ingestion:

| Dimension | Before (Incomplete Capture) | After (Complete Extraction & Tracing) |
| :--- | :--- | :--- |
| **Image Orientation** | Opaque/ignored. Uploaded rotated images remained rotated, causing poor text read rates. | Page-level physical text orientation detected via GPT-4o Vision API; rotated upright using `sharp` at ingest. |
| **Document Views** | Single file. Original overwritten or lost in processing visualization. | Side-by-side immutable **Original View** and corrected **Normalized View** togglable on the Review screen. |
| **Understanding Model** | Combined one-stage opaque LLM call (OCR + extraction in one prompt). | **True Two-Stage Pipeline**: Stage A captures raw page-by-page OCR text, and Stage B structures it. |
| **Schema Coverage** | Restricted to: Diagnoses, Medications, and Labs. | **20+ Categories**: Patient Info, Encounter Info, Chief Complaints, Symptoms, Past History, Vitals, Imaging, Surgeries, Discharge Plan, etc. |
| **Unmapped Text Protection** | Discarded any text that did not fit diagnoses/medications/labs. | **Unmapped Catcher**: Any paragraph in the Stage A transcript not referenced by a Stage B field is appended to `unmappedDocumentedInformation`. |
| **Confidence Scoring** | Arbitrary percentages (e.g., "98% Match"). | Qualitative tiers: **High confidence**, **Needs review**, and **Low confidence**. |
| **Field Tracing** | None. | Field-level provenance displaying exact source snippet and page number. |
| **Review Capabilities** | Interactive cards for entity tables only. | Fully dynamic cards for all 13 sections with text inputs to correct patient/encounter info on-the-fly. |

---

## 3. End-to-End Integrity Verification

1. **Zod Validation**: Verified that all expanded optional sections parse successfully, mapping both complete and partially extracted inputs.
2. **Database Persistence**: Verified that updated structured payloads save successfully to `raw_extractions.raw_payload` and `extraction_versions.raw_payload` using our `/api/documents/[id]/payload` endpoint.
3. **Retrieval**: Verified that signed URL generators fetch the page-level normalized asset path when `type=normalized` query parameter is supplied.

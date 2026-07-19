# MedMemory — Decision Log

> Every significant design decision, why it was made, and what alternatives were considered.
> Future agents: read this before proposing changes that conflict with established decisions.

---

## DL-001: Hybrid AI Architecture (LLM + Deterministic)

**Date:** 2026-07-19
**Status:** Implemented

**Decision:** Split the extraction pipeline into two complementary engines:
- **LLM** handles semantic understanding (classification, extraction, context)
- **Deterministic code** handles safety (validation, normalization, rules)

**Why:**
- LLMs hallucinate. Medical values cannot be hallucinated.
- LLMs cannot reliably do arithmetic or unit conversions.
- Deterministic validation catches errors that LLMs introduce silently.
- Separation of concerns makes each layer independently testable.

**Alternatives Considered:**
1. *LLM-only pipeline* — Rejected. Too many silent errors in unit normalization and date calculations.
2. *Rules-only pipeline* — Rejected. Cannot understand document semantics, layout, or context.
3. *Hybrid with LLM validation* — Rejected. LLM validation is non-deterministic and non-reproducible.

**Files:** `classifier.ts`, `extractors.ts`, `validator.ts`, `pipeline.ts`

---

## DL-002: Safe OCR Unit Normalization

**Date:** 2026-07-19
**Status:** Implemented

**Decision:** Never silently simplify or repair uncertain medical units. Store raw and normalized values separately.

**Why:**
- Original OCR text `15.74 x10^3/uL` was being simplified to `15.74 /uL` — a 1000x magnitude error.
- `5.63 Millions/cumm` was becoming `5.63 /cumm` — medically dangerous.
- Medical units carry magnitude. Stripping multipliers changes clinical meaning.

**Rule:**
- If the transformation is deterministic and medically equivalent → normalize.
- If the OCR unit is uncertain, corrupted, or ambiguous → `normalized_value = null`, `normalization_status = needs_review`.

**Fields stored:** `raw_value`, `raw_unit`, `normalized_value`, `normalized_unit`, `normalization_status`, `source_text`

**Files:** `validator.ts`, `local-extraction-provider.ts`, `pipeline.ts`

---

## DL-003: Semantic Classification Over Keywords

**Date:** 2026-07-19
**Status:** Implemented

**Decision:** Classify documents using LLM-based semantic reasoning, not keyword matching.

**Why:**
- A billing receipt containing "CBC Test ₹300" is NOT a lab report.
- A pharmacy invoice listing "Metformin" is NOT a prescription.
- A diagnostic bill is NOT a laboratory report.
- Keywords like "CBC", "Hb", "MRI" appear in billing, ordering, and result contexts.

**Approach:**
- LLM analyzes the entire document's layout, title, tables, and context.
- Returns document type + confidence + explanation.
- Fallback: deterministic rule-based classification when LLM is offline.

**Files:** `classifier.ts`

---

## DL-004: Specialized Extractors Per Document Type

**Date:** 2026-07-19
**Status:** Implemented

**Decision:** Each document type has its own extraction schema and logic.

**Why:**
- A generic extractor tries to extract medications from invoices, diagnoses from bills, and lab results from prescriptions — all incorrect.
- Pharmacy invoices need: medicine name, quantity, batch, expiry, GST, totals.
- Lab reports need: test name, value, unit, reference range, abnormal flag.
- These are fundamentally different schemas.

**Files:** `extractors.ts`

---

## DL-005: Dynamic Review UI

**Date:** 2026-07-19
**Status:** Implemented

**Decision:** The review screen renders sections based ONLY on `documentType`.

**Why:**
- Billing documents were showing HPI, Chief Complaint, and Discharge sections — confusing and incorrect.
- Lab reports were showing GST and invoice total fields — irrelevant.
- Users should only see fields relevant to the document they are reviewing.

**Rule:**
- `PHARMACY_INVOICE` shows: medicines, quantities, batch, expiry, totals.
- `LAB_REPORT` shows: test results with values, units, ranges.
- `PRESCRIPTION` shows: medicines, dosage, frequency, instructions.
- `DISCHARGE_SUMMARY` shows: admission, discharge, diagnoses, treatment, follow-up.
- `OP_BILL_RECEIPT` shows: service charges, consultation fees.

**Files:** `review/page.tsx`

---

## DL-006: Billing Documents Excluded from Timeline

**Date:** 2026-07-19
**Status:** Implemented

**Decision:** `PHARMACY_INVOICE` and `OP_BILL_RECEIPT` documents must never generate timeline events.

**Why:**
- Invoices are financial records, not clinical events.
- A pharmacy bill for "Paracetamol ₹15" should not create a medication event.
- A hospital consultation fee of "₹500" should not create a procedure event.
- Only clinically meaningful facts belong in the patient timeline.

**Files:** `generator.ts`, `server-generator.ts`

---

## DL-007: Local-First OCR

**Date:** 2026-07-18
**Status:** Implemented

**Decision:** Use a local Python + Tesseract OCR service instead of cloud OCR APIs.

**Why:**
- Medical documents contain highly sensitive patient data (PII, PHI).
- Sending documents to external cloud APIs raises HIPAA / privacy concerns.
- Local OCR gives full control over data residency.
- Tesseract is free, fast, and sufficient for typed medical documents.

**Trade-off:** Tesseract struggles with handwritten text and low-quality images. Future improvement: add handwriting detection and route those to a more capable model.

**Files:** `services/ocr/app.py`, `local-ocr-provider.ts`

---

## DL-008: Zod Schema Validation

**Date:** 2026-07-18
**Status:** Implemented

**Decision:** Use Zod schemas to validate every extraction result at runtime.

**Why:**
- LLM outputs are unpredictable. They may return malformed JSON, missing fields, or wrong types.
- Zod provides runtime type safety that TypeScript alone cannot enforce.
- Failed Zod validation catches corrupted extractions before they reach the database.

**Files:** `medical-extraction-provider.ts` (MedicalExtractionSchema)

---

## DL-009: Patient Identity Verification

**Date:** 2026-07-19
**Status:** Implemented

**Decision:** Compare the patient name on the document against the logged-in patient profile. Show a warning if they differ.

**Why:**
- Users may accidentally upload another person's medical document.
- Storing another person's medical data under the wrong patient is a critical safety violation.
- The system warns but does not block — the user can override with confirmation.

**Files:** `validator.ts`, `review/page.tsx`

---

## DL-010: Deterministic Regex Fallback

**Date:** 2026-07-18
**Status:** Implemented

**Decision:** When the LLM is offline or unavailable, fall back to a deterministic regex-based extraction engine.

**Why:**
- The system must work offline and without API keys.
- Demo mode and local development require extraction without cloud dependencies.
- Regex-based extraction is less accurate but deterministic, reproducible, and auditable.

**Files:** `local-extraction-provider.ts`

---

## Template for Future Decisions

```markdown
## DL-NNN: [Title]

**Date:** YYYY-MM-DD
**Status:** Proposed / Implemented / Deprecated

**Decision:** What was decided.

**Why:** The reasoning behind the decision.

**Alternatives Considered:**
1. Alternative A — why rejected
2. Alternative B — why rejected

**Files:** affected files
```

# MedMemory — Roadmap

> Current state → Near-term → Long-term vision
> Last Updated: 2026-07-19

---

## Current State (v0.1 — Alpha)

### ✅ Completed

| Feature | Status | Notes |
|---------|--------|-------|
| Local OCR (Tesseract via Python) | ✅ Done | `services/ocr/app.py` on port 8001 |
| LLM-based Document Classification | ✅ Done | `classifier.ts` — semantic, not keyword-based |
| Specialized Extractors per document type | ✅ Done | `extractors.ts` — 5 document types |
| Deterministic Validator | ✅ Done | `validator.ts` — dates, dosages, units, identity |
| Safe OCR Unit Normalization | ✅ Done | raw/normalized separation, `needs_review` flag |
| Hybrid Pipeline Integration | ✅ Done | `pipeline.ts` — Classify → Extract → Validate |
| Dynamic Review UI | ✅ Done | Sections filtered by `documentType` |
| Timeline Integrity | ✅ Done | Billing docs excluded from timeline |
| Patient Identity Warning | ✅ Done | Name mismatch triggers review banner |
| Deterministic Regex Fallback | ✅ Done | Works offline without LLM |
| Zod Schema Validation | ✅ Done | Runtime type safety on all extractions |
| 70 Unit Tests Passing | ✅ Done | Full local test suite |
| Zero TypeScript Compilation Errors | ✅ Done | `npx tsc --noEmit` clean |

---

## Phase 1 — Stabilization & Polish (v0.2)

**Timeline:** 2–4 weeks

| Feature | Priority | Description |
|---------|----------|-------------|
| Multi-document boundary detection | P0 | Detect multiple physical documents in a single photo, crop each region, process independently |
| Handwriting detection | P1 | Detect handwritten vs typed content, route handwritten to more capable OCR |
| Confidence-based auto-review threshold | P1 | Documents with confidence < 0.7 auto-route to `awaiting_review` |
| Extraction coverage audit UI | P2 | Show mapped / unmapped / unreadable block counts in review screen |
| Reprocessing with different provider | P2 | Allow user to reprocess a document with a different OCR/extraction provider |
| Error recovery and retry | P2 | Graceful retry on LLM timeout, OCR failure, or network issues |

---

## Phase 2 — Medical Intelligence (v0.3)

**Timeline:** 1–2 months

| Feature | Priority | Description |
|---------|----------|-------------|
| Medical Fact Store | P0 | Convert extracted entities into permanent, deduplicated medical facts |
| Longitudinal Patient Profile | P0 | Active problems, resolved problems, medication history, allergy list |
| Lab Trend Analysis | P1 | Track lab values over time, detect trends (improving / worsening) |
| Clinical Reasoning Engine | P1 | After each upload: "What changed? Does this contradict prior records?" |
| Doctor Brief v2 | P1 | AI-generated summary using verified facts, not raw OCR |
| Medication Reconciliation | P2 | Detect medication conflicts, duplicates, and discontinuations |
| Allergy Cross-Check | P2 | Warn if prescribed medication conflicts with known allergies |

---

## Phase 3 — RAG & Knowledge (v0.4)

**Timeline:** 2–3 months

| Feature | Priority | Description |
|---------|----------|-------------|
| Verified Knowledge RAG | P0 | Answer questions from verified medical facts, not raw OCR text |
| Citation-backed Answers | P0 | Every RAG answer cites source document + page + evidence |
| Temporal Reasoning | P1 | "What medications was I on in March 2024?" |
| Comparative Reasoning | P1 | "How has my HbA1c changed over the last 2 years?" |
| Multi-patient Isolation | P0 | Strict RLS: Patient A's RAG never retrieves Patient B's data |
| Conversation Memory | P2 | Follow-up questions within a RAG session |

---

## Phase 4 — Advanced Document Understanding (v0.5)

**Timeline:** 3–6 months

| Feature | Priority | Description |
|---------|----------|-------------|
| Table Structure Detection | P1 | Parse tabular lab reports, itemized invoices |
| Multi-page Document Stitching | P1 | Stitch multi-page PDFs into coherent documents |
| Imaging Report Intelligence | P2 | Parse radiology findings, impressions, recommendations |
| Handwritten Prescription OCR | P2 | Specialized model for doctor handwriting |
| Document Deduplication | P2 | Detect same document uploaded twice (different scans) |
| Language Detection & Translation | P3 | Support regional language medical documents |

---

## Phase 5 — Patient Medical Brain (v1.0)

**Timeline:** 6–12 months

| Feature | Priority | Description |
|---------|----------|-------------|
| Complete Patient Knowledge Graph | P0 | Diseases ↔ Medications ↔ Labs ↔ Procedures ↔ Doctors |
| 15-Year Medical Summary | P0 | "What happened to me over the last 15 years?" — answered from knowledge |
| Proactive Health Insights | P1 | "Your HbA1c has been rising for 3 consecutive tests" |
| Emergency Medical Summary | P1 | One-page critical info for emergency situations |
| Family Medical History | P2 | Track hereditary conditions across family members |
| Doctor Collaboration | P2 | Share verified medical history with healthcare providers |
| FHIR/HL7 Export | P3 | Export patient data in healthcare interoperability standards |
| Mobile App | P3 | iOS/Android native experience |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Classification accuracy | > 95% |
| Extraction coverage (no silent drops) | 100% |
| Unit normalization safety | 0 magnitude errors |
| Test pass rate | 100% (all 70+ tests) |
| TypeScript compilation | 0 errors |
| Patient data isolation | 100% RLS enforcement |
| Time to first review | < 30 seconds per document |

---

## Non-Goals (Explicitly Out of Scope)

- ❌ Real-time clinical decision support (not a diagnostic tool)
- ❌ Direct EHR/EMR integration (until Phase 5)
- ❌ Medical image analysis (CT/MRI interpretation)
- ❌ Drug interaction database (use external APIs)
- ❌ Insurance claim processing

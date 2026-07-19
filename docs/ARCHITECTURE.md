# MedMemory — System Architecture

> Version: 1.0
> Last Updated: 2026-07-19

---

## High-Level Pipeline

```
┌──────────────────────────────────────────────────────────────────┐
│                        PATIENT UPLOAD                           │
│                    (Image / PDF / Multi-doc)                    │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  STAGE A — Document Capture & OCR                               │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ MIME Valid.  │→ │ Orientation  │→ │ OCR Engine             │  │
│  │ Magic Bytes  │  │ Detection    │  │ (Tesseract / LLM)      │  │
│  │ SHA256 Hash  │  │ Auto-Rotate  │  │ Raw Text Capture       │  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
└──────────────────────┬───────────────────────────────────────────┘
                       │ rawText
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  STAGE B — Semantic Understanding (LLM)                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ DocumentClassifier                                      │    │
│  │  → Reads full OCR text                                  │    │
│  │  → Analyzes layout, context, workflow                   │    │
│  │  → Returns: documentType, confidence, reasoning         │    │
│  │  → Detects: patient, hospital, doctor, sections         │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ SpecializedExtractors                                   │    │
│  │  → Dispatches to type-specific extractor                │    │
│  │  → LAB_REPORT → lab values, units, ranges               │    │
│  │  → PRESCRIPTION → medicines, dosages, frequency         │    │
│  │  → DISCHARGE_SUMMARY → admission, discharge, treatment  │    │
│  │  → PHARMACY_INVOICE → items, quantities, GST, totals    │    │
│  │  → OP_BILL_RECEIPT → service charges, consultation fees │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────┬───────────────────────────────────────────┘
                       │ extraction
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  STAGE C — Deterministic Validation (Code)                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ DeterministicValidator                                  │    │
│  │  → Patient name matching                                │    │
│  │  → Date / age sanity                                    │    │
│  │  → Dosage range checks                                  │    │
│  │  → Safe unit normalization (WBC, RBC, Platelets)        │    │
│  │  → Preserves: raw_value, raw_unit, source_text          │    │
│  │  → Flags uncertain units as needs_review                │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────┬───────────────────────────────────────────┘
                       │ validatedExtraction
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  STAGE D — Storage & Structured Records                         │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ raw_extract  │  │ medical_     │  │ diagnoses          │    │
│  │ ions         │  │ records      │  │ medications        │    │
│  │ (full JSON)  │  │ (per entity) │  │ lab_results        │    │
│  └──────────────┘  └──────────────┘  │ procedures         │    │
│                                       └────────────────────┘    │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  STAGE E — Human Review                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Review UI (Dynamic per documentType)                    │    │
│  │  → Shows only relevant sections                         │    │
│  │  → Confirm / Edit / Reject per entity                   │    │
│  │  → Patient identity mismatch warnings                   │    │
│  │  → Validation error display                             │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────┬───────────────────────────────────────────┘
                       │ verified facts
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  STAGE F — Intelligence Layer                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ Timeline     │  │ RAG Engine   │  │ Doctor Brief       │    │
│  │ Generator    │  │ (Verified    │  │ Generator          │    │
│  │              │  │  knowledge)  │  │                    │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Component Map

### Core Extraction Pipeline

| File | Responsibility |
|------|----------------|
| `src/lib/extraction/pipeline.ts` | Orchestrates all stages A→F |
| `src/lib/extraction/classifier.ts` | LLM-based document classification |
| `src/lib/extraction/extractors.ts` | Type-specific specialized extraction |
| `src/lib/extraction/validator.ts` | Deterministic validation engine |
| `src/lib/extraction/demo-data.ts` | Demo mode mock data |

### Providers

| File | Responsibility |
|------|----------------|
| `src/lib/providers/ocr-provider.ts` | OCR abstraction interface |
| `src/lib/providers/local-ocr-provider.ts` | Local Tesseract OCR via Python service |
| `src/lib/providers/medical-extraction-provider.ts` | Extraction schema (Zod) & interface |
| `src/lib/providers/local-extraction-provider.ts` | Deterministic regex fallback extractor |
| `src/lib/providers/openai-extraction-provider.ts` | OpenAI-based LLM extraction |
| `src/lib/providers/provider-factory.ts` | Factory: selects OCR + extraction provider |

### Intelligence Layer

| File | Responsibility |
|------|----------------|
| `src/lib/timeline/generator.ts` | Client-side timeline generation |
| `src/lib/timeline/server-generator.ts` | Server-side timeline sync |
| `src/lib/rag/engine.ts` | RAG question answering (client) |
| `src/lib/rag/server-engine.ts` | RAG question answering (server) |
| `src/lib/providers/doctor-brief-provider.ts` | Doctor brief generation |
| `src/lib/services/medical-context-service.ts` | Relevant medical history service |

### Backend Services

| File | Responsibility |
|------|----------------|
| `services/ocr/app.py` | Python FastAPI OCR service (Tesseract) |
| `src/lib/supabase/service.ts` | Supabase admin client |
| `src/app/api/documents/[id]/process/route.ts` | Document processing API |
| `src/app/api/documents/[id]/reprocess/route.ts` | Reprocessing API |
| `src/app/api/ask/route.ts` | RAG Q&A API |

### Frontend

| File | Responsibility |
|------|----------------|
| `src/app/(app)/documents/[id]/review/page.tsx` | Document review UI (dynamic per type) |
| `src/app/(app)/documents/[id]/page.tsx` | Document detail page |
| `src/app/(app)/documents/page.tsx` | Documents list page |

---

## Hybrid Architecture Principle

```
┌─────────────────────────────┐     ┌─────────────────────────────┐
│       LLM (Semantic)        │     │   Deterministic (Safety)    │
│                             │     │                             │
│  • Document classification  │     │  • Unit normalization       │
│  • Section detection        │     │  • Date validation          │
│  • Entity extraction        │     │  • Dosage range checks      │
│  • Context understanding    │     │  • Patient identity match   │
│  • Relationship mapping     │     │  • Impossible value detect  │
│                             │     │  • Duplicate detection      │
│  NEVER:                     │     │                             │
│  • Calculate                │     │  NEVER:                     │
│  • Normalize units          │     │  • Classify documents       │
│  • Validate dates           │     │  • Understand context       │
│  • Enforce medical rules    │     │  • Extract semantics        │
└─────────────────────────────┘     └─────────────────────────────┘
```

---

## Database Schema (Supabase / PostgreSQL)

### Core Tables

| Table | Purpose |
|-------|---------|
| `patients` | Patient profiles (linked to auth user) |
| `documents` | Uploaded document metadata + processing status |
| `raw_extractions` | Full raw extraction JSON payload |
| `medical_records` | Per-entity records (diagnosis, medication, lab, procedure) |
| `diagnoses` | Structured diagnosis entities |
| `medications` | Structured medication entities |
| `lab_results` | Structured lab results with raw + normalized fields |
| `procedures` | Structured procedure entities |
| `timeline_events` | Patient timeline (only verified clinical facts) |
| `verification_history` | Audit trail for confirm / edit / reject actions |

### Security

- Row-Level Security (RLS) on all patient-facing tables
- `user_id` ownership check on every query
- Service role key used only server-side
- Signed URLs for document access (time-limited)

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + React 19 + TypeScript |
| Styling | Tailwind CSS 4 |
| Backend | Next.js API Routes (serverless) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (medical-records bucket) |
| OCR | Python FastAPI + Tesseract (local) |
| LLM | OpenAI API (GPT-4o) or local Ollama |
| Validation | Zod schemas + custom deterministic rules |

---

## Environment Modes

| Mode | OCR Provider | Extraction Provider | Database |
|------|-------------|---------------------|----------|
| **Demo** | Mock | Demo data fixtures | In-memory |
| **Local** | Local Tesseract (port 8001) | Deterministic regex | Supabase |
| **Production** | Local Tesseract | LLM (GPT-4o) + Validator | Supabase |

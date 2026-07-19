# MedMemory — Medical Data Model

> Complete medical ontology: entities, attributes, relationships, and lifecycle rules.
> This is the canonical reference for how medical knowledge is structured in MedMemory.
> Last Updated: 2026-07-19

---

## Core Concept: Facts Over Documents

```
Document (temporary)  →  Extraction  →  Validation  →  Fact (permanent)
                                                         ↓
                                                    Patient Knowledge
```

A document is a carrier. A **medical fact** is what the patient's record is built from.

---

## Entity: Patient

The central entity. All facts belong to a patient.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Auth user (owner) |
| `full_name` | string | Legal name |
| `date_of_birth` | date | DOB |
| `gender` | string | Male / Female / Other |
| `blood_group` | string | A+ / B- / O+ / etc. |
| `phone` | string | Contact number |
| `emergency_contact_name` | string | Emergency contact |
| `emergency_contact_phone` | string | Emergency phone |

### Derived Knowledge (Longitudinal)

| Knowledge Area | Description |
|----------------|-------------|
| Active Problems | Currently active diagnoses |
| Resolved Problems | Past diagnoses that have been resolved |
| Medication History | Current + past medications with durations |
| Allergy List | Known allergies with reactions |
| Surgical History | Past procedures and surgeries |
| Vaccination Record | Immunization history |
| Lab Trends | Historical lab values with trend analysis |
| Vital Baselines | Typical vital sign ranges for this patient |
| Risk Factors | Smoking, diabetes, hypertension, family history |
| Doctor Visit History | Timeline of healthcare encounters |

---

## Entity: Document

A scanned/photographed/uploaded medical record.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `patient_id` | UUID | FK → Patient |
| `file_name` | string | Original filename |
| `file_size` | integer | Bytes |
| `mime_type` | string | `image/jpeg`, `application/pdf`, etc. |
| `storage_path` | string | Supabase storage path |
| `sha256_hash` | string | Content hash for deduplication |
| `category` | DocumentCategory | User-selected category |
| `document_type` | string | AI-classified type (e.g. `LAB_REPORT`) |
| `classification_confidence` | float | 0.0 – 1.0 |
| `classification_source` | string | `llm` / `rule_engine` / `user_selection` |
| `processing_status` | string | `queued` / `processing` / `extracting` / `awaiting_review` / `completed` / `failed` |
| `parent_upload_id` | UUID | If this doc was split from a multi-doc image |

### Document Lifecycle

```
queued → processing (OCR) → extracting (LLM) → awaiting_review → completed
                                                    ↑
                                               validation failed
                                               or low confidence
```

---

## Entity: Diagnosis

A medical condition identified from a clinical document.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `patient_id` | UUID | FK → Patient |
| `record_id` | UUID | FK → MedicalRecord |
| `name` | string | Diagnosis name (e.g. "Dengue fever") |
| `icd_code` | string | ICD-10 code (if available) |
| `diagnosis_type` | string | `provisional` / `final` / `differential` |
| `diagnosed_date` | date | When diagnosed |
| `resolved_date` | date | When resolved (null if active) |
| `status` | string | `active` / `resolved` / `chronic` |
| `source_document_id` | UUID | Which document this came from |
| `source_page` | integer | Page number |
| `source_text` | string | Original OCR text |
| `confidence_score` | float | Extraction confidence |
| `verification_status` | string | `pending_review` / `verified` / `corrected` / `rejected` |

---

## Entity: Medication

A prescribed or dispensed medicine.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `patient_id` | UUID | FK → Patient |
| `record_id` | UUID | FK → MedicalRecord |
| `medicine_name` | string | Drug name |
| `generic_name` | string | Generic / salt name |
| `strength` | string | e.g. "500 mg" |
| `dosage` | string | e.g. "1 tablet" |
| `frequency` | string | e.g. "twice daily" |
| `route` | string | Oral / IV / Topical / etc. |
| `duration` | string | e.g. "7 days" |
| `instructions` | string | e.g. "after food" |
| `start_date` | date | When started |
| `end_date` | date | When stopped |
| `status` | string | `active` / `discontinued` / `completed` |
| `prescribed_by` | string | Doctor name |
| `source_document_id` | UUID | Source document |
| `source_text` | string | Original OCR text |
| `confidence_score` | float | Extraction confidence |
| `verification_status` | string | Review status |

### Pharmacy Invoice Extensions

| Field | Type | Description |
|-------|------|-------------|
| `quantity` | integer | Number dispensed |
| `batch_no` | string | Manufacturing batch |
| `expiry_date` | date | Expiry date |
| `unit_price` | decimal | Price per unit |
| `gst_percentage` | float | GST applied |
| `total_amount` | decimal | Line item total |

---

## Entity: Lab Result

A laboratory test result with full provenance.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `patient_id` | UUID | FK → Patient |
| `record_id` | UUID | FK → MedicalRecord |
| `test_name` | string | e.g. "Haemoglobin" |
| `test_category` | string | e.g. "Haematology", "Biochemistry" |
| `raw_value` | string | Exact OCR value (immutable) |
| `raw_unit` | string | Exact OCR unit (immutable) |
| `normalized_value` | string | Standardized value (or null) |
| `normalized_unit` | string | Standardized unit (or null) |
| `normalization_status` | string | `normalized` / `needs_review` / `raw` |
| `reference_range` | string | e.g. "13.0 – 17.0" |
| `abnormal_flag` | boolean | Above/below reference range |
| `test_date` | date | When the test was performed |
| `source_document_id` | UUID | Source document |
| `source_page` | integer | Page number |
| `source_text` | string | Original OCR text (immutable) |
| `extraction_method` | string | `llm` / `local_deterministic` / `user_override` |
| `confidence_score` | float | Extraction confidence |
| `verification_status` | string | Review status |

### Normalization Safety Rules

| Test | OCR Unit | Safe Normalization | Unsafe (needs_review) |
|------|----------|--------------------|-----------------------|
| WBC | `x10^3/uL` | `x10³/µL` | `/uL` (magnitude drop) |
| RBC | `Millions/cumm` | `×10⁶/µL` | `/cumm` (magnitude drop) |
| Platelets | `X10^3/uL` | `x10³/µL` | `/uL` (magnitude drop) |
| Hemoglobin | `g/dl` | `g/dL` | ✅ safe (case only) |
| HbA1c | `%` | `%` | ✅ safe (no change) |

---

## Entity: Procedure

A medical or surgical procedure.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `patient_id` | UUID | FK → Patient |
| `record_id` | UUID | FK → MedicalRecord |
| `name` | string | Procedure name |
| `procedure_type` | string | `surgical` / `diagnostic` / `therapeutic` |
| `date` | date | When performed |
| `surgeon_name` | string | Operating surgeon |
| `anesthesia_type` | string | General / Local / Spinal |
| `notes` | string | Operative notes |
| `outcome` | string | Successful / Complications / etc. |
| `source_document_id` | UUID | Source document |
| `source_text` | string | Original OCR text |
| `confidence_score` | float | Extraction confidence |
| `verification_status` | string | Review status |

---

## Entity: Encounter

A healthcare visit or hospitalization episode.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `patient_id` | UUID | FK → Patient |
| `encounter_type` | string | `outpatient` / `inpatient` / `emergency` / `telehealth` |
| `hospital_name` | string | Facility name |
| `department` | string | e.g. "Cardiology" |
| `doctor_name` | string | Attending physician |
| `doctor_specialization` | string | Specialty |
| `admission_date` | date | Start date |
| `discharge_date` | date | End date |
| `chief_complaint` | string | Primary reason for visit |
| `discharge_diagnosis` | string | Final diagnosis at discharge |
| `source_document_id` | UUID | Source document |

---

## Entity: Allergy

A known allergy or adverse reaction.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `patient_id` | UUID | FK → Patient |
| `allergen` | string | e.g. "Penicillin" |
| `allergen_type` | string | `drug` / `food` / `environmental` |
| `reaction` | string | e.g. "Rash", "Anaphylaxis" |
| `severity` | string | `mild` / `moderate` / `severe` / `life_threatening` |
| `onset_date` | date | When first observed |
| `source_document_id` | UUID | Source document |
| `verification_status` | string | Review status |

---

## Entity: Vaccination

An immunization record.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `patient_id` | UUID | FK → Patient |
| `vaccine_name` | string | e.g. "Covishield" |
| `disease` | string | e.g. "COVID-19" |
| `dose_number` | integer | 1st, 2nd, booster |
| `date_administered` | date | When given |
| `administered_by` | string | Facility / provider |
| `batch_number` | string | Vaccine lot number |
| `next_due_date` | date | When next dose is due |
| `source_document_id` | UUID | Source document |

---

## Entity: Vital

A vital sign measurement.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `patient_id` | UUID | FK → Patient |
| `vital_type` | string | `bp` / `hr` / `temp` / `rr` / `spo2` / `weight` / `height` / `bmi` |
| `value` | string | Measured value |
| `unit` | string | Unit of measurement |
| `measured_date` | date | When measured |
| `source_document_id` | UUID | Source document |

---

## Entity: Timeline Event

A chronological event in the patient's medical history.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `patient_id` | UUID | FK → Patient |
| `event_type` | string | `diagnosis` / `medication` / `lab` / `procedure` / `hospitalization` / `vaccination` |
| `event_date` | date | When it occurred |
| `title` | string | Short description |
| `description` | string | Detailed description |
| `source_document_id` | UUID | Source document |
| `source_entity_id` | UUID | FK → the specific entity |
| `verification_status` | string | Only `verified` events appear |

### Timeline Exclusion Rules

| Document Type | Creates Timeline Events? |
|---------------|-------------------------|
| `PRESCRIPTION` | ✅ Yes — medication events |
| `LAB_REPORT` | ✅ Yes — lab result events |
| `DISCHARGE_SUMMARY` | ✅ Yes — hospitalization + diagnosis events |
| `IMAGING_REPORT` | ✅ Yes — investigation events |
| `PHARMACY_INVOICE` | ❌ No — billing only |
| `OP_BILL_RECEIPT` | ❌ No — billing only |
| `MEDICAL_CERTIFICATE` | ✅ Yes — certification event |

---

## Relationships

```
Patient
  ├── Documents (1:N)
  │     ├── Raw Extractions (1:1)
  │     └── Medical Records (1:N)
  │           ├── Diagnoses (1:N)
  │           ├── Medications (1:N)
  │           ├── Lab Results (1:N)
  │           └── Procedures (1:N)
  ├── Encounters (1:N)
  ├── Allergies (1:N)
  ├── Vaccinations (1:N)
  ├── Vitals (1:N)
  └── Timeline Events (1:N)
```

---

## Verification Lifecycle

Every extracted entity follows this lifecycle:

```
pending_review  →  verified    (user confirmed)
                →  corrected   (user edited value)
                →  rejected    (user rejected as incorrect)
                →  unreadable  (source text not legible)
```

Only `verified` and `corrected` entities contribute to:
- Patient knowledge graph
- Timeline events
- RAG retrieval
- Doctor briefs

---

## Provenance Chain

Every fact in the system must be traceable:

```
Source Document (JPEG/PDF)
  → OCR Text (raw, immutable)
    → Extraction (LLM or rule engine)
      → Validation (deterministic checks)
        → Human Review (confirm/edit/reject)
          → Medical Fact (verified knowledge)
            → Timeline / RAG / Doctor Brief
```

No step in this chain may be skipped or bypassed.

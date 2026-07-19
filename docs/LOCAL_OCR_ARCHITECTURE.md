# MedMemory Local OCR & Extraction Architecture

This document describes the design, setup, and execution of MedMemory's **local and free document intelligence pipeline**. 

With this architecture, MedMemory processes images and PDF documents entirely offline on local hardware, removing any mandatory dependency on paid cloud APIs (like OpenAI).

---

## 1. Pipeline Overview

```
                        +----------------------------+
                        |   Uploaded Medical File    |
                        |      (JPG, PNG, PDF)       |
                        +--------------+-------------+
                                       |
                                       v
                        +--------------+-------------+
                        |  PDF Native Text Bypass    |
                        +--------------+-------------+
                                       |
                    +------------------+------------------+
                    |                                     | (Scanned PDF or Image)
                    | (Selectable text exists)            v
                    |                      +--------------+-------------+
                    |                      |  Python Local OCR Service  |
                    |                      |   (FastAPI on Port 8001)   |
                    |                      +--------------+-------------+
                    |                                     |
                    |                                     v
                    |                      +--------------+-------------+
                    |                      | Image Preprocessing:       |
                    |                      | - EXIF & Rotation          |
                    |                      | - OpenCV Contours Deskew   |
                    |                      | - CLAHE & Denoise          |
                    |                      +--------------+-------------+
                    |                                     |
                    |                                     v
                    |                      +--------------+-------------+
                    |                      |   Local OCR Processing     |
                    |                      |   (Tesseract / Paddle)     |
                    |                      +--------------+-------------+
                    |                                     |
                    +------------------+------------------+
                                       |
                                       v
                        +--------------+-------------+
                        |    Stage A Complete:       |
                        |  - Full Page-Level Text    |
                        |  - Upright Normalized Image|
                        +--------------+-------------+
                                       |
                                       v
                        +--------------+-------------+
                        |   Stage B Medical Structuring: |
                        |   (LocalExtractionProvider)|
                        +--------------+-------------+
                                       |
                    +------------------+------------------+
                    | (Local LLM Active)                  | (Ollama Offline)
                    v                                     v
      +-------------+-------------+         +-------------+-------------+
      | Ollama Llama3 / Qwen2     |         |  Deterministic Fallback:  |
      | chat/completions endpoint |         |  Regex, patterns, layouts |
      +-------------+-------------+         +-------------+-------------+
                    |                                     |
                    +------------------+------------------+
                                       |
                                       v
                        +--------------+-------------+
                        |  Deterministic Coverage &   |
                        |      Unmapped Catcher       |
                        +--------------+-------------+
                                       |
                                       v
                        +--------------+-------------+
                        |   Persist to Supabase DB:   |
                        |   - raw_extractions         |
                        |   - document_pages          |
                        |   - clinical tables         |
                        +----------------------------+
```

---

## 2. Ingestion Stages

### Stage A: Faithful Document Capture
1. **PDF Text Bypass**: When a PDF is uploaded, MedMemory checks for selectable text. If present, it extracts it directly to avoid unnecessary OCR overhead.
2. **Local Preprocessing**: For scanned PDFs and images, the Python OCR service:
   - Evaluates EXIF metadata orientation tags.
   - Leverages Tesseract OSD (Orientation and Script Detection) to auto-rotate pages to an upright read direction.
   - straightens skewed pages (deskewing) using OpenCV contour bounds.
   - Enhances contrast (CLAHE), filters noise, and sharpens text to optimize OCR accuracy.
3. **Local OCR Engine**: Performs text recognition using **Tesseract** (default) or **PaddleOCR**. Bounding boxes and confidence are calculated per block.

### Stage B: Medical Structuring & Normalization
Once the raw text is captured, `LocalExtractionProvider` structures it:
1. **Tier 1 (Ollama Local LLM)**: If a local model runner (like Ollama) is active, MedMemory posts the transcription to its OpenAI-compatible completions API using the local model (e.g., `llama3` or `qwen2:7b-instruct`).
2. **Tier 2 (Deterministic Fallback)**: If Ollama is offline or unconfigured, the system executes a rule-based regex parser. It safely extracts clinical dates, vitals, patient profiles, doctor details, medications, and labs.
3. **Unmapped Content Catcher**: To satisfy the safety invariant that **no readable text is ever lost**, any paragraphs in the raw text not explicitly matched by structured fields are grouped and preserved under `unmappedDocumentedInformation`.
4. **Qualitative Confidence Tiers**: Numeric OCR confidence is converted to qualitative labels in the UI:
   - Confidence $\ge 0.90$ $\rightarrow$ **High confidence**
   - Confidence $0.65 - 0.89$ $\rightarrow$ **Needs review**
   - Confidence $< 0.65$ $\rightarrow$ **Low confidence**

---

## 3. Installation & Run Instructions

To install and run the local OCR service, see:
1. Prerequisite Tesseract binary installation: [README.md](../services/ocr/README.md)
2. Setup and run commands:
   ```bash
   # Terminal 1: Setup and start Python OCR service
   npm run ocr:setup
   npm run ocr:start

   # Terminal 2: Start Next.js App
   npm run dev
   ```

---

## 4. Environment Configuration (`.env.local`)
Configure these keys in your `.env.local` file to select the local pipeline:
```env
OCR_PROVIDER=local
LOCAL_OCR_URL=http://127.0.0.1:8001
MEDICAL_EXTRACTION_PROVIDER=local
LOCAL_LLM_BASE_URL=http://127.0.0.1:11434
LOCAL_LLM_MODEL=
ENABLE_PAID_AI_FALLBACK=false
```

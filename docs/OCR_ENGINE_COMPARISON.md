# OCR Engine Comparison Report: Tesseract vs. PaddleOCR

**Date:** 2026-07-18  
**Document Evaluated:** `WhatsApp_Image_2026-07-18_at_17.19.10.jpeg` (Complete Blood Count Report)

---

## Evaluation Results Summary

| Metric / Feature | Tesseract 5.5.2 | PaddleOCR |
| :--- | :--- | :--- |
| **Total Readable Text Captured** | 1,054 characters | (PaddleOCR is not available locally) |
| **Number of Blocks** | 8 | (PaddleOCR is not available locally) |
| **Section Coverage** | 3/15 sections detected | (PaddleOCR is not available locally) |
| **Tables / Grid Alignments** | Moderate (merges text horizontally) | (Not tested) |
| **Orientation Handling** | Handled by `image_processor` preprocessing | (Not tested) |
| **Punctuation / Numbers** | Good, minor OCR noise (e.g., `417 (%)` for `17%`) | (Not tested) |
| **Medical Terms** | Excellent (`Haemoglobin`, `Haemotocrit`, `Lymphocytes`) | (Not tested) |
| **Processing Time** | 2,578 ms | (Not tested) |

---

## Detailed Observations

### 1. Tesseract 5.5.2 Performance
* **Accuracy:** High character recognition accuracy on structured blocks. Readably extracted patient names, dates, test names, and results.
* **Layout Parsing:** Tesseract merges adjacent columns when layout structure is complex, leading to some values being concatenated with the labels (e.g., `Haemoglobin 15.6 gm%`).
* **Noise:** Minor punctuation noise (e.g. `MPatient Name!`, `Ref By + DR.Bhargava`).

### 2. PaddleOCR Availability
* PaddleOCR is not installed in the local virtual environment since PaddlePaddle lacks stable Apple Silicon (macOS ARM64) pip wheels on Python 3.14.
* It is configured to gracefully fallback to Tesseract.

---

## Conclusion & Recommended Default

Based on the actual local environment capability and the need for zero-dependency local runs on macOS:
* **Default Engine Selection:** **Tesseract** is selected as the default local OCR provider.
* **Justification:** Tesseract works out-of-the-box via Homebrew/System packages across macOS, Linux, and Windows, and is the only available option in the current Python 3.14 macOS sandbox environment.

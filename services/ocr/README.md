# MedMemory Local OCR Service

A lightweight local Python microservice powered by **FastAPI**, **PyMuPDF**, and **Tesseract** (with optional **PaddleOCR** support) to provide a fully local, offline, and free document transcription pipeline.

## System Prerequisites

To run Tesseract locally, you must install the Tesseract binary:

### macOS (using Homebrew)
```bash
brew install tesseract
```

### Ubuntu / Debian
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr libtesseract-dev
```

### Windows
Download and run the installer from [UB Mannheim](https://github.com/UB-Mannheim/tesseract/wiki). Add the Tesseract directory to your System PATH variables.

---

## Installation & Setup

Set up a Python virtual environment and install the required dependencies:

```bash
# 1. Navigate to the service directory
cd services/ocr

# 2. Create virtual environment
python3 -m venv .venv

# 3. Activate virtual environment
# On macOS / Linux:
source .venv/bin/activate
# On Windows:
.venv\Scripts\activate

# 4. Install requirements
pip install -r requirements.txt
```

---

## Running the Service

Start the FastAPI local server:

```bash
uvicorn app:app --host 127.0.0.1 --port 8001
```

The service will bind to `http://127.0.0.1:8001` and expose:
- `GET /health`: Health status checks
- `POST /ocr`: Ingestion and OCR processing endpoint

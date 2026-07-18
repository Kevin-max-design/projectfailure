# Manual Trust Validation Checklist

This document details the step-by-step manual verification procedures for testing the security, safety, and isolation controls in MedMemory.

---

### TEST A: Real/Synthetic Prescription Upload
1. Log in to the application and navigate to **Upload Document** page.
2. Select a synthetic/de-identified prescription PDF or image file (e.g. containing *Metformin 500mg* daily).
3. Verify that the upload completes and the processing job status indicator progresses through the `queued`, `processing`, and `awaiting_review` stages.
4. **Expected Result**: The file name is sanitized and saved to the private bucket, the processing job completes, and the document details are registered in the DB.

---

### TEST B: Damaged/Corrupted Prescription Upload
1. Attempt to upload a 0-byte file or a corrupted PDF.
2. **Expected Result**: The API rejects the upload immediately with a `400 Bad Request` and shows the message *"File is empty"* or *"Unsupported file format."* No database records are created.

---

### TEST C: Multi-Page Discharge Summary
1. Upload a 3-page synthetic discharge summary where a diagnosis is on page 1 and a daily medication is on page 3.
2. Navigate to the review screen.
3. **Expected Result**: Page numbers are preserved accurately. The extracted diagnosis lists page 1 as its source, and the medication lists page 3 as its source. Flat flattening is avoided.

---

### TEST D: Patient A vs Patient B Isolation
1. Authenticate as **Patient A** and upload a document. Record the document's UUID.
2. Authenticate as **Patient B** (non-owner).
3. Attempt to fetch Patient A's document details or download the file by guessing the UUID.
4. **Expected Result**: The server returns `403 Forbidden` or `404 Not Found`. Signed URL generation fails, and RLS blocks access.

---

### TEST E: RAG Question with Evidence
1. Ask the chatbot: *"What strength of Metformin was I prescribed?"*
2. **Expected Result**: The RAG engine returns the exact dosage grounded in the verified record and provides a citation card referencing the document title and page number.

---

### TEST F: RAG Question with No Evidence
1. Ask the chatbot: *"When was I diagnosed with kidney disease?"* (assuming no kidney records exist).
2. **Expected Result**: The chatbot replies: *"I couldn't find a verified record documenting kidney disease in the records currently available."* The model does not make assumptions or invent dates.

---

### TEST G: New Doctor Abdominal Pain Scenario
1. Triage a patient reporting *severe abdominal pain* and *vomiting*.
2. Generate the Doctor Brief.
3. **Expected Result**: The Doctor Brief displays the complaint as `Patient-Reported`. Under documented history, it retrieves the prior verified pancreatitis record. The system does not suggest a diagnosis for the current symptoms.

---

### TEST H: Zero-History Patient
1. Create a new patient with no uploaded records.
2. Report chest pain and generate the Doctor Brief.
3. **Expected Result**: The brief displays the chest pain under `Patient-Reported` and outputs *"No verified prior medical records are currently available."* in the history section.

---

### TEST I: Accident Emergency QR
1. Go to the Emergency configuration page.
2. Disclose *Blood Group* and *Critical Allergies*, but hide *Name* and *Chronic Conditions*.
3. Generate the Emergency QR code.
4. Scan the QR code anonymously.
5. **Expected Result**: The anonymous summary loads without requiring a login, disclosing only the approved fields. Hidden fields display *Redacted* or are omitted.

---

### TEST J: QR Revoke and Regenerate
1. From the Emergency portal, click **Regenerate Token** or toggle the status to **Deactivated**.
2. Refresh the old public URL.
3. **Expected Result**: Access is denied with a `403 Forbidden` or `404 Not Found` response. The old token is invalid.

---

### TEST K: Historical Medication Safety
1. Add a medication to the patient profile with an end date in the past (e.g. expired in 2023).
2. Generate the Emergency ID summary.
3. **Expected Result**: The expired medication is filtered out and does not appear under the active daily medications list.

---

### TEST L: Missing Allergy Information
1. Delete all allergy records from the patient profile.
2. Open the Emergency ID summary.
3. **Expected Result**: The summary outputs *"No verified allergy information was found."* rather than claiming *"No allergies"*.

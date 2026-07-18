import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/mode';
import crypto from 'crypto';

// Supported MIME types and their magic bytes
const MIME_MAGIC_BYTES: Record<string, number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  'image/jpeg': [0xFF, 0xD8, 0xFF],            // JPEG start
  'image/png': [0x89, 0x50, 0x4E, 0x47],       // PNG start
  'image/webp': [0x52, 0x49, 0x46, 0x46]        // RIFF (WEBP contains WEBP at byte 8)
};

function detectMimeType(buffer: Buffer): string | null {
  for (const [mime, magic] of Object.entries(MIME_MAGIC_BYTES)) {
    let match = true;
    for (let i = 0; i < magic.length; i++) {
      if (buffer[i] !== magic[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      if (mime === 'image/webp') {
        // Double check byte 8-11 is WEBP
        const webpHeader = buffer.slice(8, 12).toString('ascii');
        if (webpHeader === 'WEBP') return 'image/webp';
      } else {
        return mime;
      }
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  // If in demo mode, uploads are handled client-side in the page
  if (isDemoMode()) {
    return NextResponse.json({ error: 'Demo mode is active' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting check: 10 uploads per 15 mins
    const { checkRateLimit } = await import('@/lib/rate-limit');
    const rateLimit = checkRateLimit(user.id, 'upload', 10, 15 * 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too Many Requests', message: `Upload rate limit exceeded. Please try again in ${rateLimit.retryAfterSeconds} seconds.` },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string) || 'Auto Detect';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate that file is not empty (0-bytes)
    if (buffer.length === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    // 1. File size check (20MB limit)
    const maxSize = 20 * 1024 * 1024;
    if (buffer.length > maxSize) {
      return NextResponse.json({ error: 'File size exceeds the 20MB limit' }, { status: 400 });
    }

    // 2. MIME validation using magic bytes
    const mimeType = detectMimeType(buffer);
    if (!mimeType) {
      return NextResponse.json({ error: 'Unsupported file format. Please upload PDF, JPEG, PNG, or WEBP' }, { status: 400 });
    }

    // Get the patient record for this user
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Patient profile not found. Please complete onboarding first' }, { status: 404 });
    }

    const patientId = patient.id;

    // 3. Calculate SHA-256 hash for duplicate check
    const sha256Hash = crypto.createHash('sha256').update(buffer).digest('hex');

    const bypassDuplicate = formData.get('bypass_duplicate') === 'true';

    // Sanitize the filename to prevent directory traversal and name pollution
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Check for duplicate document in DB for the same patient
    const { data: existingDoc } = await supabase
      .from('documents')
      .select('id, file_name')
      .eq('patient_id', patientId)
      .eq('sha256_hash', sha256Hash)
      .eq('is_deleted', false)
      .single();

    // If duplicate exists, return 409 Conflict with the metadata of existing document
    if (existingDoc && !bypassDuplicate) {
      return NextResponse.json({
        error: 'Duplicate detected',
        message: `This document appears to have already been uploaded as "${existingDoc.file_name}".`,
        existingDocumentId: existingDoc.id
      }, { status: 409 });
    }

    // 4. Upload file to private Storage
    const adminSupabase = createAdminClient();
    const documentId = crypto.randomUUID();
    const storagePath = `patients/${patientId}/documents/${documentId}/${sanitizedFilename}`;

    const { error: storageError } = await adminSupabase.storage
      .from('medical-records')
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false
      });

    if (storageError) {
      console.error('Storage upload error:', storageError);
      return NextResponse.json({ error: 'Failed to upload file to secure storage' }, { status: 500 });
    }

    // 5. Create Documents DB record
    const { data: document, error: docDbError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        patient_id: patientId,
        file_name: sanitizedFilename,
        file_size: buffer.length,
        mime_type: mimeType,
        storage_path: storagePath,
        category: category,
        processing_status: 'queued',
        sha256_hash: sha256Hash,
        original_filename: sanitizedFilename
      })
      .select()
      .single();

    if (docDbError || !document) {
      console.error('Document insert error:', docDbError);
      // Clean up uploaded file
      await adminSupabase.storage.from('medical-records').remove([storagePath]);
      return NextResponse.json({ error: 'Failed to register document in database' }, { status: 500 });
    }

    // 6. Create Processing Job
    const { data: job, error: jobError } = await supabase
      .from('processing_jobs')
      .insert({
        patient_id: patientId,
        document_id: documentId,
        status: 'queued',
        attempt_count: 0
      })
      .select()
      .single();

    if (jobError) {
      console.error('Job registration error:', jobError);
    }

    return NextResponse.json({
      success: true,
      documentId: document.id,
      jobId: job?.id || null
    });

  } catch (err: any) {
    console.error('Upload handler crashed:', err);
    return NextResponse.json({ error: 'Internal server error during upload' }, { status: 500 });
  }
}

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import crypto from 'crypto';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function run() {
  console.log('Testing Multi-Document splitting...');
  
  const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  const { data: patient } = await adminSupabase.from('patients').select('id, user_id').limit(1).single();
  if (!patient) {
    throw new Error('No patient found to run test');
  }

  const patientId = patient.id;

  const docPath = path.join(process.cwd(), 'tests/fixtures/WhatsApp_Image_2026-07-18_at_17.19.13.jpeg');
  const buffer = fs.readFileSync(docPath);
  const documentId = crypto.randomUUID();
  const storagePath = `patients/${patientId}/documents/${documentId}/WhatsApp_Image_2026-07-18_at_17.19.13.jpeg`;

  console.log('Uploading original multi-doc image...');
  await adminSupabase.storage.from('medical-records').upload(storagePath, buffer, {
    contentType: 'image/jpeg',
    upsert: true
  });

  console.log('Registering document in DB...');
  await adminSupabase.from('documents').insert({
    id: documentId,
    patient_id: patientId,
    file_name: 'WhatsApp_Image_2026-07-18_at_17.19.13.jpeg',
    file_size: buffer.length,
    mime_type: 'image/jpeg',
    storage_path: storagePath,
    category: 'Auto Detect',
    processing_status: 'queued',
    sha256_hash: 'test-hash-multi-doc-' + Date.now(),
    original_filename: 'WhatsApp_Image_2026-07-18_at_17.19.13.jpeg'
  });

  console.log('Triggering document processing...');
  const { DocumentProcessingPipeline } = require('../src/lib/extraction/pipeline');
  const pipeline = new DocumentProcessingPipeline();
  
  await pipeline.processDocument(documentId, buffer, 'image/jpeg', adminSupabase);

  console.log('Waiting for child documents to process (8 seconds)...');
  await new Promise(r => setTimeout(r, 8000));

  const { data: children } = await adminSupabase
    .from('documents')
    .select('id, file_name, category, processing_status, document_type, confidence')
    .eq('parent_upload_id', documentId);

  console.log('Child documents created:');
  console.log(JSON.stringify(children, null, 2));

  if (!children || children.length < 2) {
    console.error('FAIL: Less than 2 child documents detected!');
  } else {
    console.log('SUCCESS: Split into separate documents successfully!');
  }
}

run().catch(console.error);

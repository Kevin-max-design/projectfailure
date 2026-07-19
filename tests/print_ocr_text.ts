import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function printOcrText() {
  const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  // Query latest documents
  const { data: docs } = await adminSupabase
    .from('documents')
    .select('id, file_name')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('Latest documents:', docs);

  for (const doc of docs || []) {
    const { data: pages } = await adminSupabase
      .from('document_pages')
      .select('page_number, ocr_text')
      .eq('document_id', doc.id);

    console.log(`Document: ${doc.file_name} (${doc.id})`);
    for (const p of pages || []) {
      console.log(`--- Page ${p.page_number} OCR text: ---`);
      console.log(p.ocr_text);
    }
  }
}

printOcrText();

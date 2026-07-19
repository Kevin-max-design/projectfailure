import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local manually
const envLocal = fs.readFileSync('.env.local', 'utf-8');
const env: Record<string, string> = {};
envLocal.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing credentials in .env.local:', { supabaseUrl: !!supabaseUrl, serviceKey: !!serviceKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function download() {
  const files = [
    {
      path: 'patients/e0102339-16ad-455e-ab8e-f49c0b7ecf67/documents/846ca393-96d1-4bfa-a327-0938f4b68783/WhatsApp_Image_2026-07-18_at_17.19.10.jpeg',
      dest: 'tests/fixtures/WhatsApp_Image_2026-07-18_at_17.19.10.jpeg'
    },
    {
      path: 'patients/e0102339-16ad-455e-ab8e-f49c0b7ecf67/documents/3a2bf4f0-a8e1-45af-a1fa-4c8024f8e747/WhatsApp_Image_2026-07-18_at_17.19.11.jpeg',
      dest: 'tests/fixtures/WhatsApp_Image_2026-07-18_at_17.19.11.jpeg'
    },
    {
      path: 'patients/e0102339-16ad-455e-ab8e-f49c0b7ecf67/documents/a2f1bf62-3964-4391-b445-b7573e8743f7/WhatsApp_Image_2026-07-18_at_17.19.13.jpeg',
      dest: 'tests/fixtures/WhatsApp_Image_2026-07-18_at_17.19.13.jpeg'
    }
  ];

  for (const file of files) {
    console.log(`Downloading ${file.path}...`);
    const { data, error } = await supabase.storage.from('medical-records').download(file.path);
    if (error) {
      console.error(`Failed to download ${file.path}:`, error.message);
    } else if (data) {
      const buffer = Buffer.from(await data.arrayBuffer());
      fs.writeFileSync(file.dest, buffer);
      console.log(`Saved to ${file.dest}`);
    }
  }
}

download();

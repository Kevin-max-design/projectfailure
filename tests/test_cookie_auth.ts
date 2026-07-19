import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const PROJECT_REF = 'lhmlmxcerkfbsytohnza';
const COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`;

async function testCookieFormat() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
  const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  const email = 'cookie_test@medmemory.test';
  const password = 'Password123!';

  // Clean up existing user if any
  const { data: users } = await adminSupabase.auth.admin.listUsers();
  const existingUser = users.users.find(u => u.email === email);
  if (existingUser) {
    await adminSupabase.auth.admin.deleteUser(existingUser.id);
  }

  // Create user
  const { data: { user }, error: createErr } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (createErr || !user) {
    console.error('Failed to create test user:', createErr);
    return;
  }

  // Create patient profile (otherwise /api/documents fails)
  const { error: patientErr } = await adminSupabase.from('patients').insert({
    user_id: user.id,
    full_name: 'Cookie Test User',
    date_of_birth: '1990-01-01',
    gender: 'Other'
  });

  if (patientErr) {
    console.error('Failed to create patient profile:', patientErr);
    return;
  }

  // Sign in
  const { data: { session }, error: loginErr } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (loginErr || !session) {
    console.error('Failed to sign in:', loginErr);
    return;
  }

  // Construct cookie value
  const cookieValue = encodeURIComponent(JSON.stringify(session));
  const cookieHeader = `${COOKIE_NAME}=${cookieValue}`;

  console.log('Sending request to /api/timeline with cookie...');
  const res = await fetch('http://localhost:3000/api/timeline', {
    method: 'GET',
    headers: {
      'Cookie': cookieHeader
    }
  });

  console.log('Response status:', res.status);
  const json = await res.json().catch(() => ({}));
  console.log('Response body:', JSON.stringify(json));
}

testCookieFormat();

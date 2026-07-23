import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  try {
    if (fs.existsSync('.env.local')) {
      const env = fs.readFileSync('.env.local', 'utf-8');
      env.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!supabaseUrl && trimmed.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = trimmed.split('=')[1].trim();
        if (!supabaseAnonKey && trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseAnonKey = trimmed.split('=')[1].trim();
      });
    }
  } catch (e) {
    console.warn("Could not read .env.local file:", e.message);
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function ping() {
  const start = Date.now();
  console.log(`Pinging Supabase at ${supabaseUrl}...`);
  try {
    const { data, error, status } = await supabase.from('users').select('id').limit(1);
    const duration = Date.now() - start;
    if (error) {
      console.error(`[FAIL] Supabase returned status ${status}:`, error.message);
      process.exit(1);
    }
    console.log(`[SUCCESS] Supabase is ACTIVE and ONLINE! (Response time: ${duration}ms, Status: ${status})`);
  } catch (err) {
    console.error("[ERROR] Connection failed:", err.message);
    process.exit(1);
  }
}

ping();

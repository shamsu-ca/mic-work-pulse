import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl = '';
let supabaseAnonKey = '';
let supabaseServiceKey = '';

env.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = trimmed.split('=')[1].trim();
  if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseAnonKey = trimmed.split('=')[1].trim();
  if (trimmed.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseServiceKey = trimmed.split('=')[1].trim();
});

console.log("=== SUPABASE DIAGNOSTIC TEST ===");
console.log("Target URL:", supabaseUrl);
console.log("Anon Key Length:", supabaseAnonKey ? supabaseAnonKey.length : 0);
console.log("Service Key Length:", supabaseServiceKey ? supabaseServiceKey.length : 0);

async function runDiagnostics() {
  // Test 1: Direct HTTP fetch to REST root
  try {
    const startTime = Date.now();
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    const latency = Date.now() - startTime;
    console.log(`\n[1] REST Root HTTP Status: ${res.status} ${res.statusText} (${latency}ms)`);
    if (!res.ok) {
      const text = await res.text();
      console.log("REST Root Error Body:", text);
    }
  } catch (err) {
    console.error("\n[1] REST Root HTTP Fetch Failed:", err.message);
  }

  // Test 2: Anon Client Select
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  try {
    const startTime = Date.now();
    const { data, error, status, statusText } = await anonClient.from('users').select('id, username, role').limit(3);
    const latency = Date.now() - startTime;
    console.log(`\n[2] Anon Client Query 'users': Status ${status} (${latency}ms)`);
    if (error) {
      console.error("Anon Query Error:", error);
    } else {
      console.log(`Anon Query Success! Returned ${data ? data.length : 0} rows:`, data);
    }
  } catch (err) {
    console.error("\n[2] Anon Client Exception:", err.message);
  }

  // Test 3: Admin Client Select & Operations
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);
  try {
    const startTime = Date.now();
    const { data, error, status } = await adminClient.from('users').select('id, username, role').limit(3);
    const latency = Date.now() - startTime;
    console.log(`\n[3] Admin Client Query 'users': Status ${status} (${latency}ms)`);
    if (error) {
      console.error("Admin Query Error:", error);
    } else {
      console.log(`Admin Query Success! Returned ${data ? data.length : 0} rows:`, data);
    }
  } catch (err) {
    console.error("\n[3] Admin Client Exception:", err.message);
  }

  // Test 4: Check Table Counts
  const tables = ['users', 'work_items', 'leave_requests', 'containers', 'archives', 'notifications', 'announcements'];
  console.log("\n[4] Table Row Counts (via Admin):");
  for (const table of tables) {
    try {
      const { count, error } = await adminClient.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`  - ${table}: ERROR (${error.message})`);
      } else {
        console.log(`  - ${table}: ${count} rows`);
      }
    } catch (err) {
      console.log(`  - ${table}: EXCEPTION (${err.message})`);
    }
  }

  // Test 5: Ping write test (Upsert dummy/heartbeat into notifications or check RPC)
  console.log("\n[5] Database Keep-Alive / Heartbeat Check:");
  try {
    const { data: pingData, error: pingErr } = await adminClient.rpc('version');
    if (pingErr) {
      // Version RPC might not exist, test select simple
      const { data, error } = await adminClient.from('users').select('count', { count: 'exact', head: true });
      if (!error) console.log("  Heartbeat SELECT successful! DB is active and responding.");
      else console.error("  Heartbeat SELECT failed:", error.message);
    } else {
      console.log("  Postgres Version:", pingData);
    }
  } catch (err) {
    console.error("  Heartbeat Exception:", err.message);
  }
}

runDiagnostics();

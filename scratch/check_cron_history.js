import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = trimmed.split('=')[1].trim();
  if (trimmed.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = trimmed.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkCronHistory() {
  console.log("=== CHECKING PG_CRON JOB & HISTORY ===");

  // Query pg_cron tables via rpc or raw query if possible, or RPC
  const { data: cronJobs, error: errCron } = await supabaseAdmin
    .from('saved_tasks')
    .select('id, title, last_generated_at, updated_at')
    .order('last_generated_at', { ascending: false });

  console.log("Recent last_generated_at values on saved_tasks:");
  const dateCounts = {};
  (cronJobs || []).forEach(st => {
    const d = st.last_generated_at || 'Never';
    dateCounts[d] = (dateCounts[d] || 0) + 1;
  });
  console.log(dateCounts);

  // Check work_items created dates in the last 7 days
  const { data: recentWorkItems, error: errWi } = await supabaseAdmin
    .from('work_items')
    .select('id, title, expected_date, created_at, source_template_item_id')
    .not('source_template_item_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);

  console.log("\nLast 50 spawned recurring work_items:");
  const spawnedByDate = {};
  (recentWorkItems || []).forEach(wi => {
    const ed = wi.expected_date;
    spawnedByDate[ed] = (spawnedByDate[ed] || 0) + 1;
  });
  console.log("Spawned count by expected_date:", spawnedByDate);

  if (recentWorkItems && recentWorkItems.length > 0) {
    console.log("\nSample recent spawned items:");
    recentWorkItems.slice(0, 10).forEach(wi => {
      console.log(`- Expected: ${wi.expected_date} | CreatedAt: ${wi.created_at} | Title: "${wi.title}"`);
    });
  }
}

checkCronHistory();

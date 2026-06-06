import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function verifySpawn() {
  const templateId = '3d2e52d5-585c-4931-90f0-b00e0e2bd45d';
  console.log(`Checking work_items for source_template_item_id = ${templateId}...`);
  const { data, error } = await supabaseAdmin
    .from('work_items')
    .select('*')
    .eq('source_template_item_id', templateId);

  if (error) {
    console.error("Error fetching work items:", error);
    return;
  }

  console.log(`Found ${data.length} spawned work items:`);
  data.forEach((item, i) => {
    console.log(`  [${i + 1}] ID: ${item.id} | Title: "${item.title}" | Expected Date: ${item.expected_date} | Created At: ${item.created_at}`);
  });

  // Cleanup: delete the test work item and test saved task
  console.log("\nCleaning up test entries...");
  await supabaseAdmin.from('work_items').delete().eq('source_template_item_id', templateId);
  await supabaseAdmin.from('saved_tasks').delete().eq('id', templateId);
  console.log("Cleanup complete.");
}

verifySpawn().catch(console.error);

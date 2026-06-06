import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
  const { data: workItems, error } = await supabaseAdmin
    .from('work_items')
    .select('id, title, expected_date, source_template_item_id, created_at')
    .not('source_template_item_id', 'is', null);

  if (error) {
    console.error("Error fetching work items:", error);
    return;
  }

  console.log(`Total spawned work items: ${workItems.length}`);
  
  // Group by template_id and expected_date
  const groups = {};
  workItems.forEach(item => {
    const key = `${item.source_template_item_id}_${item.expected_date}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  let duplicateCount = 0;
  console.log("\n=== DUPLICATE SPAWNED TASKS ===");
  Object.keys(groups).forEach(key => {
    if (groups[key].length > 1) {
      duplicateCount++;
      const items = groups[key];
      console.log(`Template: "${items[0].title}" | Expected Date: ${items[0].expected_date} | Count: ${items.length}`);
      items.forEach(it => {
        console.log(`  - ID: ${it.id} | Created At: ${it.created_at}`);
      });
    }
  });

  console.log(`\nFound ${duplicateCount} instances of duplicate spawns.`);
}

checkDuplicates().catch(console.error);

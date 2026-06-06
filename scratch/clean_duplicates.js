import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function cleanDuplicates() {
  const { data: workItems, error } = await supabaseAdmin
    .from('work_items')
    .select('id, title, expected_date, source_template_item_id, created_at')
    .not('source_template_item_id', 'is', null);

  if (error) {
    console.error("Error fetching work items:", error);
    return;
  }

  // Group by template_id and expected_date
  const groups = {};
  workItems.forEach(item => {
    const key = `${item.source_template_item_id}_${item.expected_date}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  const idsToDelete = [];
  Object.keys(groups).forEach(key => {
    if (groups[key].length > 1) {
      // Sort by created_at ascending
      const items = groups[key].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      // Keep the first one, delete all subsequent ones (duplicates)
      for (let i = 1; i < items.length; i++) {
        idsToDelete.push(items[i].id);
        console.log(`Will delete duplicate: "${items[i].title}" | Date: ${items[i].expected_date} | ID: ${items[i].id} | Created At: ${items[i].created_at}`);
      }
    }
  });

  if (idsToDelete.length === 0) {
    console.log("No duplicates found to delete.");
    return;
  }

  console.log(`Deleting ${idsToDelete.length} duplicate work items...`);
  const { error: delError } = await supabaseAdmin
    .from('work_items')
    .delete()
    .in('id', idsToDelete);

  if (delError) {
    console.error("Error deleting duplicates:", delError);
  } else {
    console.log("Successfully cleaned up duplicates.");
  }
}

cleanDuplicates().catch(console.error);

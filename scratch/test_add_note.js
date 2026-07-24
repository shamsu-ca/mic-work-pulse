import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function testAddNote() {
  console.log("=== TESTING ADD WORK ITEM NOTE ===");

  const payload = {
    title: "Test Planning Note",
    description: "Testing note insertion",
    in_planning_pool: true,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabaseAdmin.from('work_items').insert([payload]).select();
  if (error) {
    console.error("Error inserting basic note:", error);
  } else {
    console.log("Successfully inserted basic note:", data[0]);
    // Clean up
    await supabaseAdmin.from('work_items').delete().eq('id', data[0].id);
  }

  // Now test with extra fields (tags, color, is_pinned, is_favorite, is_archived, updated_at)
  const fullPayload = {
    title: "Test Note with Extra Fields",
    description: "Testing extra fields",
    in_planning_pool: true,
    tags: ['#Test'],
    color: 'yellow',
    is_pinned: true,
    is_favorite: false,
    is_archived: false,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  const { data: dataFull, error: errorFull } = await supabaseAdmin.from('work_items').insert([fullPayload]).select();
  if (errorFull) {
    console.error("Error inserting note with extra fields:", errorFull.message);
  } else {
    console.log("Successfully inserted note with extra fields!", dataFull[0]);
    await supabaseAdmin.from('work_items').delete().eq('id', dataFull[0].id);
  }
}

testAddNote();

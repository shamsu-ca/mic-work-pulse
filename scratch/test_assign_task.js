import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function testAssignTask() {
  console.log("Attempting to insert a task with assignee...");
  const testId = crypto.randomUUID();
  const { data, error } = await supabaseAdmin.from('work_items').insert([{
    id: testId,
    title: 'Test Assignment Trigger ' + Date.now(),
    type: 'Task',
    assignee_id: '2f2f223f-ec90-4d1a-9c27-3354492f7d0b', // Shamsuddin
    status: 'Assigned'
  }]).select();
  
  if (error) {
    console.error("Task insertion FAILED:", error.message, error);
  } else {
    console.log("Task insertion SUCCEEDED:", data);
    
    // Clean up
    console.log("Cleaning up test task...");
    await supabaseAdmin.from('work_items').delete().eq('id', testId);
  }
}

testAssignTask().catch(console.error);

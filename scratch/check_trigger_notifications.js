import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function testTrigger() {
  // Clear any existing notifications first
  await supabaseAdmin.from('notifications').delete().eq('user_id', '2f2f223f-ec90-4d1a-9c27-3354492f7d0b');

  console.log("Inserting task with assignee to trigger notification...");
  const testId = crypto.randomUUID();
  const { error: insertErr } = await supabaseAdmin.from('work_items').insert([{
    id: testId,
    title: 'Trigger Test Task',
    type: 'Task',
    assignee_id: '2f2f223f-ec90-4d1a-9c27-3354492f7d0b', // Shamsuddin
    status: 'Assigned'
  }]);

  if (insertErr) {
    console.error("Task insert failed:", insertErr);
    return;
  }

  console.log("Checking if a notification was created...");
  const { data: notifs, error: fetchErr } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('user_id', '2f2f223f-ec90-4d1a-9c27-3354492f7d0b');

  if (fetchErr) {
    console.error("Fetch notifications failed:", fetchErr);
  } else {
    console.log(`Found ${notifs.length} notifications:`, notifs);
  }

  // Clean up
  await supabaseAdmin.from('work_items').delete().eq('id', testId);
  await supabaseAdmin.from('notifications').delete().eq('user_id', '2f2f223f-ec90-4d1a-9c27-3354492f7d0b');
}

testTrigger().catch(console.error);

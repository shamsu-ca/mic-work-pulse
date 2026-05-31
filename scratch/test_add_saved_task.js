import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const taskData = {
    title: 'Test Recurring Task ' + Date.now(),
    description: 'Testing save flow',
    type: 'Task',
    status: 'Assigned',
    priority: 'Medium',
    is_recurring: true,
    is_active: true,
    recurrence_rule: { type: 'daily' },
    created_by: '3be276e8-3837-43eb-b21e-3f7dbbbdbc05', // Use a valid user ID or select one
  };

  // Find a valid user id first
  const { data: users } = await supabaseAdmin.from('users').select('id').limit(1);
  if (users && users.length > 0) {
    taskData.created_by = users[0].id;
    taskData.assignee_id = users[0].id;
  }

  console.log('Inserting taskData:', taskData);
  const { data, error } = await supabaseAdmin.from('saved_tasks').insert([taskData]).select();
  if (error) {
    console.error('INSERT ERROR:', error);
  } else {
    console.log('INSERT SUCCESS:', data);
  }
}

testInsert().catch(console.error);

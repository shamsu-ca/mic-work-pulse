import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseAnonKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseAnonKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRLS() {
  console.log('Testing select on saved_tasks with anon client...');
  const { data: selectData, error: selectError } = await supabase.from('saved_tasks').select('*').limit(1);
  if (selectError) {
    console.error('Select Error:', selectError.message);
  } else {
    console.log('Select Success, read items count:', selectData.length);
  }

  console.log('Testing insert on saved_tasks with anon client...');
  const taskData = {
    title: 'Anon Test ' + Date.now(),
    type: 'Task',
    is_recurring: true,
    is_active: true,
  };
  const { data: insertData, error: insertError } = await supabase.from('saved_tasks').insert([taskData]).select();
  if (insertError) {
    console.error('Insert Error:', insertError.message);
  } else {
    console.log('Insert Success:', insertData);
  }
}

testRLS().catch(console.error);

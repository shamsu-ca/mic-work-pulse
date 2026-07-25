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

async function checkUserCategories() {
  const { data: users, error } = await supabaseAdmin.from('users').select('*');
  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("=== ALL USERS DETAILS ===");
  users.forEach(u => {
    console.log(`ID: ${u.id} | Name: "${u.name}" | Role: "${u.role}" | Category: "${u.category}" | Department: "${u.department}" | Active: ${u.is_active}`);
  });
}

checkUserCategories();

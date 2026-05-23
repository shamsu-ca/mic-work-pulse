import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseServiceKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseServiceKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function reset() {
  const admins = [
    { id: '9a218b31-15ef-426b-97db-8922c019324a', email: 'shlmkd@erp.mic' },
    { id: '3be276e8-3837-43eb-b21e-3f7dbbbdbc05', email: 'micmahinabad@gmail.com' }
  ];

  for (const admin of admins) {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(admin.id, {
      password: 'admin123'
    });
    if (error) {
      console.error(`Failed to reset password for ${admin.email}:`, error.message);
    } else {
      console.log(`Successfully reset password for ${admin.email} to: admin123`);
    }
  }
}

reset();

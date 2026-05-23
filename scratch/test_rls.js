import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseAnonKey, supabaseServiceKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseAnonKey = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseServiceKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  const { data: users, error: errorU } = await supabaseAdmin.from('users').select('*');
  const admin = users.find(u => u.role === 'Admin');
  const staff = users.find(u => u.role !== 'Admin');

  console.log("Admin:", admin?.name, "Username:", admin?.username);
  console.log("Staff:", staff?.name, "Username:", staff?.username);

  // Let's temporarily set the admin's password to 'testpassword123'
  const email = admin.username.includes('@') ? admin.username : `${admin.username}@erp.mic`;
  const { error: resetErr } = await supabaseAdmin.auth.admin.updateUserById(admin.id, {
    password: 'testpassword123'
  });

  if (resetErr) {
    console.error("Failed to reset admin password:", resetErr);
    return;
  }
  console.log("Admin password reset successfully.");

  // Now, log in as Admin using the anon client
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email,
    password: 'testpassword123'
  });

  if (authErr) {
    console.error("Failed to sign in as admin:", authErr);
    return;
  }
  console.log("Signed in successfully as Admin. Access token length:", authData.session.access_token.length);

  // 1. Try to INSERT a leave request for the staff member using anon client
  const payload = {
    user_id: staff.id,
    leave_type: 'Full Day',
    from_date: '2026-05-28',
    to_date: '2026-05-29',
    reason: 'Test insert from admin under RLS',
    status: 'Approved',
    approved_by: admin.id
  };

  console.log("\nTesting insert via anon client (Admin role)...");
  let resInsert = await supabase.from('leave_requests').insert([payload]).select();
  if (resInsert.error) {
    console.error("Insert Error:", resInsert.error.code, "-", resInsert.error.message);
  } else {
    console.log("Insert Success:", resInsert.data);
  }

  // 2. Try to UPDATE a pending leave request using anon client
  // First insert a pending leave request
  const { data: pendingData } = await supabaseAdmin.from('leave_requests').insert([{
    user_id: staff.id,
    leave_type: 'Full Day',
    from_date: '2026-06-01',
    to_date: '2026-06-02',
    reason: 'Test pending for update',
    status: 'Pending'
  }]).select();

  const pendingId = pendingData[0].id;
  console.log("\nTesting update (approval) via anon client (Admin role) on request ID:", pendingId);

  const updates = {
    status: 'Approved',
    admin_remark: 'Approved by admin via anon client',
    approved_by: admin.id
  };

  let resUpdate = await supabase.from('leave_requests').update(updates).eq('id', pendingId).select();
  if (resUpdate.error) {
    console.error("Update Error:", resUpdate.error.code, "-", resUpdate.error.message);
  } else {
    console.log("Update Success:", resUpdate.data);
  }
}

test();

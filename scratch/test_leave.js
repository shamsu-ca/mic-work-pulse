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

  console.log("Admin:", admin?.name, "ID:", admin?.id);
  console.log("Staff:", staff?.name, "ID:", staff?.id);

  // Let's create a pending leave request first using anon client (if staff has auth, but let's use admin client to create a pending one)
  const { data: inserted, error: insertErr } = await supabaseAdmin.from('leave_requests').insert([{
    user_id: staff.id,
    leave_type: 'Full Day',
    from_date: '2026-05-25',
    to_date: '2026-05-26',
    reason: 'Pending request test',
    status: 'Pending'
  }]).select();

  if (insertErr) {
    console.error("Failed to insert pending leave:", insertErr);
    return;
  }

  const leaveId = inserted[0].id;
  console.log("Inserted pending leave request with ID:", leaveId);

  // Now, let's simulate the update (approval) like updateLeaveRequest does:
  const updates = {
    status: 'Approved',
    admin_remark: 'Approved by test script',
    approved_date: new Date().toISOString().split('T')[0],
    approved_by: admin.id
  };

  console.log("\nUpdating leave request (approving)...");
  let resUpdate = await supabaseAdmin.from('leave_requests').update(updates).eq('id', leaveId).select();
  console.log("Result:", resUpdate.error ? `Error: ${resUpdate.error.code} - ${resUpdate.error.message}` : "Success", resUpdate.data);

  if (resUpdate.error && (resUpdate.error.message?.includes('approved_date') || resUpdate.error.code === 'PGRST204')) {
    console.log("Retrying update without approved_date...");
    const { approved_date, ...cleanUpdates } = updates;
    let resRetry = await supabaseAdmin.from('leave_requests').update(cleanUpdates).eq('id', leaveId).select();
    console.log("Retry Result:", resRetry.error ? `Error: ${resRetry.error.code} - ${resRetry.error.message}` : "Success", resRetry.data);
  }
}

test();

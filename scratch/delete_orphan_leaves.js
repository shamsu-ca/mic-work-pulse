import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function cleanOrphanLeaves() {
  console.log("=== DELETING ORPHAN LEAVE REQUESTS ===");
  
  // 1. Fetch active users
  const { data: users, error: userErr } = await supabaseAdmin.from('users').select('id');
  if (userErr) {
    console.error("Failed to fetch users:", userErr.message);
    return;
  }
  const userIds = new Set(users.map(u => u.id));
  console.log(`Found ${users.length} active users.`);

  // 2. Fetch all leave requests
  const { data: leaves, error: leaveErr } = await supabaseAdmin.from('leave_requests').select('id, user_id');
  if (leaveErr) {
    console.error("Failed to fetch leave requests:", leaveErr.message);
    return;
  }
  console.log(`Found ${leaves.length} total leave requests.`);

  // 3. Identify orphans
  const orphanIds = [];
  leaves.forEach(l => {
    if (l.user_id && !userIds.has(l.user_id)) {
      orphanIds.push(l.id);
    }
  });

  console.log(`Identified ${orphanIds.length} orphan leave requests.`);

  if (orphanIds.length > 0) {
    console.log("Deleting orphan rows...");
    const { error: delErr } = await supabaseAdmin
      .from('leave_requests')
      .delete()
      .in('id', orphanIds);

    if (delErr) {
      console.error("Failed to delete orphan leaves:", delErr.message);
    } else {
      console.log(`Successfully deleted ${orphanIds.length} orphan leave requests from leave_requests table.`);
    }
  } else {
    console.log("No orphan leave requests found to delete.");
  }
}

cleanOrphanLeaves().catch(console.error);

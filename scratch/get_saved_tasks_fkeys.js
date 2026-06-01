import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function getFkeys() {
  const sql = `
    SELECT
        tc.table_schema, 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='saved_tasks';
  `;

  // We can call an RPC to run this if we have one. Let's see if try_exec_sql worked.
  // Wait, let's look at try_exec_sql.js result. We can run a query to get database schema using postgres system catalogs,
  // but wait, is there an RPC like "exec_sql" or "execute_sql" defined?
  // Let's run a query using exec_sql RPC.
  const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });
  if (error) {
    // try different param name
    const { data: data2, error: error2 } = await supabaseAdmin.rpc('exec_sql', { sql: sql });
    if (error2) {
      console.error("Could not run SQL query via RPC:", error2.message);
      
      // Let's try select from pg_constraint
      const pgSql = `SELECT conname FROM pg_constraint WHERE conrelid = 'saved_tasks'::regclass;`;
      const { data: data3, error: error3 } = await supabaseAdmin.rpc('exec_sql', { sql_query: pgSql });
      console.log("pg_constraint check:", data3, error3);
    } else {
      console.log("FKeys for saved_tasks:", data2);
    }
  } else {
    console.log("FKeys for saved_tasks:", data);
  }
}

getFkeys().catch(console.error);

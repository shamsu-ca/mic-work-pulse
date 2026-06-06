import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

async function listRPCs() {
  const url = `${supabaseUrl}/rest/v1/`;
  const res = await fetch(url, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const data = await res.json();
  
  if (data.paths) {
    const rpcs = Object.keys(data.paths).filter(path => path.startsWith('/rpc/'));
    console.log("Exposed RPC functions in PostgREST:");
    rpcs.forEach(rpc => {
      console.log(`- ${rpc}`);
      console.log("  Parameters:", data.paths[rpc].post?.parameters || []);
    });
  } else {
    console.log("No paths found in OpenAPI.");
  }
}

listRPCs().catch(console.error);

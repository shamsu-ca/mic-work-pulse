import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl, supabaseKey;
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

async function fetchSchema() {
  const url = `${supabaseUrl}/rest/v1/`;
  const res = await fetch(url, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const data = await res.json();
  
  if (data.definitions) {
    for (const [tableName, definition] of Object.entries(data.definitions)) {
      console.log(`Table '${tableName}' columns (from OpenAPI definitions):`);
      console.log(Object.keys(definition.properties || {}));
    }
  }
}

fetchSchema().catch(console.error);

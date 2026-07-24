import pg from 'pg';
import fs from 'fs';

const regions = ['ap-south-1', 'ap-southeast-1', 'eu-central-1', 'us-east-1', 'us-west-1'];

async function run() {
  const sql = fs.readFileSync('migration_notes_v2.sql', 'utf8');

  for (const reg of regions) {
    const host = `aws-0-${reg}.pooler.supabase.com`;
    console.log(`Trying to connect to ${host}...`);
    const client = new pg.Client({
      host: host,
      port: 6543,
      database: 'postgres',
      user: 'postgres.jmkgkokkncwnnykqpoih',
      password: 'Shamsu@12345',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000
    });

    try {
      await client.connect();
      console.log(`Connected successfully to ${host}! Executing migration...`);
      await client.query(sql);
      console.log("SUCCESS! Migration executed successfully!");
      await client.end();
      return;
    } catch (err) {
      console.error(`Failed connecting to ${host}:`, err.message);
      try { await client.end(); } catch (_) {}
    }
  }
}

run();

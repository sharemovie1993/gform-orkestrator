const { Client } = require('pg');

async function run() {
  const host = 'aws-0-ap-southeast-1.pooler.supabase.com';
  console.log(`Connecting to pooler: ${host}...`);
  const client = new Client({
    user: 'postgres.xjnctgbzilrhbzsbrtpu',
    password: '123123123',
    host: host,
    port: 6543,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully to connection pooler.');

    console.log('Altering tenants table to add missing columns...');
    await client.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS supabase_url TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS supabase_anon_key TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS license_key TEXT;
    `);
    console.log('✅ Columns verified/added.');

    console.log('Reloading PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log('✅ Schema reload triggered.');

    console.log('🎉 Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

run();

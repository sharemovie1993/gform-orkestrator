const { Client } = require('pg');

async function run() {
  console.log('Connecting directly to database IPv6 address...');
  const client = new Client({
    user: 'postgres',
    password: '123123123',
    host: '2406:da12:557:f802:282c:1615:7053:1c75',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ CONNECTED SUCCESSFULLY TO SUPABASE CLOUD DATABASE VIA IPv6!');
    
    console.log('Altering tenants table...');
    await client.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS supabase_url TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS supabase_anon_key TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS license_key TEXT;
    `);
    console.log('✅ Alter table executed successfully.');
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log('✅ PostgREST schema reload signaled.');
    await client.end();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  }
}

run();

const { Client } = require('pg');

async function run() {
  const host = 'aws-0-ap-northeast-2.pooler.supabase.com';
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
    console.log('✅ CONNECTED SUCCESSFULLY TO ap-northeast-2 POOLER!');

    console.log('Executing database schema migration on Cloud database...');
    await client.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS supabase_url TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS supabase_anon_key TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS license_key TEXT;
    `);
    console.log('✅ Alter table executed successfully.');

    // Let's verify the columns of the tenants table
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tenants'
    `);
    console.log('\n--- VERIFIED COLUMNS IN CLOUD TENANTS TABLE ---');
    console.log(res.rows.map(r => `${r.column_name} (${r.data_type})`));

    // Seed/Update default tenant just in case
    await client.query(`
      UPDATE tenants 
      SET supabase_url = 'https://xjnctgbzilrhbzsbrtpu.supabase.co',
          supabase_anon_key = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg'
      WHERE domain_or_slug = 'default' OR id = '00000000-0000-0000-0000-000000000001';
    `);
    console.log('✅ Seeded default tenant credentials.');

    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log('✅ PostgREST schema reload signal triggered.');

    await client.end();
  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
}

run();

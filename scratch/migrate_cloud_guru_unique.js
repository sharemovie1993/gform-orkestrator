const { Client } = require('pg');

async function run() {
  console.log('Connecting to Supabase Cloud Direct DB...');
  const client = new Client({
    user: 'postgres',
    password: '123123123',
    host: 'db.xjnctgbzilrhbzsbrtpu.supabase.co',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully to connection pooler.');

    console.log('Altering guru table unique constraint on Supabase Cloud...');
    
    // Drop existing unique constraint
    await client.query(`ALTER TABLE guru DROP CONSTRAINT IF EXISTS guru_username_key;`);
    console.log('Dropped old constraint guru_username_key.');
    
    // Add new composite constraint
    await client.query(`ALTER TABLE guru ADD CONSTRAINT guru_username_tenant_key UNIQUE (username, tenant_id);`);
    console.log('Added new unique constraint guru_username_tenant_key (username, tenant_id).');

    console.log('Reloading PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log('✅ Schema reload triggered.');

    console.log('🎉 Cloud migration completed successfully!');
  } catch (err) {
    console.error('❌ Cloud migration failed:', err.message);
  } finally {
    await client.end();
  }
}

run();

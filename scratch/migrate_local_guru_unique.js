const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:123123123@10.10.10.250:5432/gform_orkestrator'
  });
  
  await client.connect();
  console.log('Connected to local PostgreSQL database.');
  
  try {
    console.log('Altering guru table username unique constraint...');
    
    // Drop existing unique constraint
    await client.query(`ALTER TABLE guru DROP CONSTRAINT IF EXISTS guru_username_key;`);
    console.log('Dropped old constraint guru_username_key.');
    
    // Add new composite constraint
    await client.query(`ALTER TABLE guru ADD CONSTRAINT guru_username_tenant_key UNIQUE (username, tenant_id);`);
    console.log('Added new unique constraint guru_username_tenant_key (username, tenant_id).');
    
    // Trigger schema reload
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log('Triggered PostgREST schema reload.');
    
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    await client.end();
  }
}

run();

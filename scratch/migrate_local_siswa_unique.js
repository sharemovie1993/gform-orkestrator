const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:123123123@10.10.10.250:5432/gform_orkestrator'
  });
  
  await client.connect();
  console.log('Connected to local PostgreSQL database.');
  
  try {
    console.log('Altering siswa table nisn unique constraint...');
    
    // Drop existing unique constraint
    await client.query(`ALTER TABLE siswa DROP CONSTRAINT IF EXISTS siswa_nisn_key;`);
    console.log('Dropped old constraint siswa_nisn_key.');
    
    // Add new composite constraint
    await client.query(`ALTER TABLE siswa ADD CONSTRAINT siswa_nisn_tenant_key UNIQUE (nisn, tenant_id);`);
    console.log('Added new unique constraint siswa_nisn_tenant_key (nisn, tenant_id).');
    
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

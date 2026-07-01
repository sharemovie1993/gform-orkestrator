const { Client } = require('pg');

const dbUrl = 'postgresql://postgres:123123123@10.10.10.250:5432/gform_orkestrator';

async function run() {
  console.log(`Connecting to local database: ${dbUrl}...`);
  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
    console.log('✅ Connected successfully to local database.');

    console.log('Running tables schema migration for data isolation...');
    
    // 1. Alter tables
    await client.query(`
      ALTER TABLE jurusan ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
      ALTER TABLE kelas ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
      ALTER TABLE siswa ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
      ALTER TABLE guru ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
      ALTER TABLE mapel ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
      ALTER TABLE link_soal ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    `);
    console.log('✅ Main tables schema updated successfully.');

    // 2. Alter settings table primary keys
    console.log('Updating settings table primary key...');
    await client.query(`
      ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
      ALTER TABLE settings ADD CONSTRAINT settings_pkey PRIMARY KEY (key, tenant_id);
    `);
    console.log('✅ Settings table primary key updated successfully.');

    console.log('Triggering schema reload notification...');
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log('✅ PostgREST schema reload signal triggered.');

    console.log('🎉 Local migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

run();

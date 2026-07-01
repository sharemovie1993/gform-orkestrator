const { createClient } = require('@supabase/supabase-js');

// 1. Supabase Cloud API Connection Info
const cloudUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const cloudAnonKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
const cloudSupabase = createClient(cloudUrl, cloudAnonKey);

// Helper to escape SQL values correctly
function escapeValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'string') {
    return `'${val.replace(/'/g, "''")}'`;
  }
  if (typeof val === 'boolean') {
    return val ? 'true' : 'false';
  }
  if (val instanceof Date) {
    return `'${val.toISOString()}'`;
  }
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  }
  return val;
}

async function migrateTable(tableName) {
  try {
    // Fetch all records from Supabase Cloud via PostgREST API
    const { data: records, error } = await cloudSupabase
      .from(tableName)
      .select('*');

    if (error) {
      console.error(`-- ❌ Failed to fetch from cloud table "${tableName}": ${error.message}`);
      return;
    }

    if (!records || records.length === 0) {
      console.log(`-- Table "${tableName}" is empty in Supabase Cloud. Skipping.`);
      return;
    }

    // Output TRUNCATE to clear existing local data
    console.log(`TRUNCATE TABLE "${tableName}" CASCADE;`);

    // Generate INSERT queries
    const columns = Object.keys(records[0]);
    const columnsJoined = columns.map(c => `"${c}"`).join(', ');

    for (const record of records) {
      const valuesEscaped = columns.map(col => escapeValue(record[col])).join(', ');
      // Append ON CONFLICT DO NOTHING to ensure graceful conflict handling
      console.log(`INSERT INTO "${tableName}" (${columnsJoined}) VALUES (${valuesEscaped}) ON CONFLICT DO NOTHING;`);
    }
  } catch (err) {
    console.error(`-- ❌ Error migrating table "${tableName}": ${err.message}`);
  }
}

async function runMigration() {
  console.log('-- 🚀 GENERATING SQL FROM CLOUD DATABASE...');
  
  // Disable RLS and set session parameters
  console.log('SET session_replication_role = \'replica\';'); // Temporarily bypass foreign keys for smooth imports

  const tables = [
    'tenants',
    'settings',
    'jurusan',
    'kelas',
    'siswa',
    'guru',
    'mapel',
    'link_soal'
  ];

  for (const table of tables) {
    await migrateTable(table);
  }

  console.log('SET session_replication_role = \'origin\';');
  console.log('-- 🎉 SQL GENERATION COMPLETE!');
}

runMigration();

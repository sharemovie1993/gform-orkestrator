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
    console.log('✅ Connected successfully to connection pooler.');

    const tenantId = '7568d090-2313-4d58-9a2f-60662efd383f';
    
    // Get all classes
    const classesRes = await client.query(`SELECT id, nama_kelas FROM kelas WHERE tenant_id = $1`, [tenantId]);
    console.log(`Found ${classesRes.rows.length} classes.`);
    
    for (const row of classesRes.rows) {
      const studentRes = await client.query(`SELECT count(*) as count FROM siswa WHERE kelas_id = $1 AND tenant_id = $2`, [row.id, tenantId]);
      console.log(`Class ${row.nama_kelas} (ID: ${row.id}): ${studentRes.rows[0].count} students`);
    }
    
  } catch (err) {
    console.error('❌ Failed:', err.message);
  } finally {
    await client.end();
  }
}

run();

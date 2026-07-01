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

    const res = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'siswa'::regclass;
    `);
    
    console.log('Constraints on table "siswa":');
    for (const row of res.rows) {
      console.log(`- ${row.conname}: ${row.pg_get_constraintdef}`);
    }

    // Check if there is any Row Level Security (RLS) on siswa
    const rlsRes = await client.query(`
      SELECT relname, relrowsecurity, relforcesrowsecurity
      FROM pg_class
      WHERE oid = 'siswa'::regclass;
    `);
    console.log('RLS Status on "siswa":', rlsRes.rows[0]);

    // Check RLS policies
    const policyRes = await client.query(`
      SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE tablename = 'siswa';
    `);
    console.log('Policies on "siswa":');
    for (const row of policyRes.rows) {
      console.log(`- ${row.policyname}: cmd=${row.cmd}, qual=${row.qual}`);
    }

  } catch (err) {
    console.error('❌ Failed:', err.message);
  } finally {
    await client.end();
  }
}

run();

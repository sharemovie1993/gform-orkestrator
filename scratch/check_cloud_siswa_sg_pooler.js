const { Client } = require('pg');

async function run() {
  const host = 'aws-0-ap-southeast-1.pooler.supabase.com';
  console.log(`Connecting to Singapore pooler: ${host}...`);
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

    // 1. Constraints on siswa
    const res = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'siswa'::regclass;
    `);
    
    console.log('\n--- Constraints on table "siswa" ---');
    for (const row of res.rows) {
      console.log(`- ${row.conname}: ${row.pg_get_constraintdef}`);
    }

    // 2. RLS status on table siswa
    const rlsRes = await client.query(`
      SELECT relname, relrowsecurity, relforcesrowsecurity
      FROM pg_class
      WHERE oid = 'siswa'::regclass;
    `);
    console.log('\n--- RLS Status on "siswa" ---');
    console.log(rlsRes.rows[0]);

    // 3. Policies on table siswa
    const policyRes = await client.query(`
      SELECT policyname, cmd, qual, with_check
      FROM pg_policies
      WHERE tablename = 'siswa';
    `);
    console.log('\n--- Policies on "siswa" ---');
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

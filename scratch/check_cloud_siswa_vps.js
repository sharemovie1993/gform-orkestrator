const { Client } = require('pg');

async function run() {
  console.log('Connecting directly to db.xjnctgbzilrhbzsbrtpu.supabase.co on port 5432...');
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
    console.log('✅ Connected successfully to Cloud DB via direct connection.');

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

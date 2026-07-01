const { Client } = require('pg');

const regions = [
  'ap-southeast-1', // Singapore
  'ap-southeast-2', // Sydney
  'ap-southeast-3', // Jakarta
  'ap-northeast-1', // Tokyo
  'ap-northeast-2', // Seoul
  'ap-northeast-3', // Osaka
  'ap-south-1',     // Mumbai
  'ap-east-1',      // Hong Kong
  'us-east-1',      // N. Virginia
  'us-east-2',      // Ohio
  'us-west-1',      // N. California
  'us-west-2',      // Oregon
  'eu-central-1',   // Frankfurt
  'eu-west-1',      // Ireland
  'eu-west-2',      // London
  'eu-west-3',      // Paris
  'sa-east-1'       // Sao Paulo
];

async function tryPooler(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  console.log(`Trying pooler region: ${region} (${host})...`);
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
    console.log(`\n🎉 CONNECTED SUCCESSFULLY TO REGION: ${region}!`);
    console.log('Running ALTER TABLE to add missing columns...');
    await client.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS supabase_url TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS supabase_anon_key TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS license_key TEXT;
    `);
    console.log('✅ Alter table executed successfully.');
    
    // Verify columns
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tenants'
    `);
    console.log('Columns inside tenants:', res.rows.map(r => `${r.column_name} (${r.data_type})`));
    
    console.log('Sending schema reload notification...');
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log('✅ PostgREST schema reload signal triggered.');

    await client.end();
    return true;
  } catch (err) {
    console.log(`❌ Failed for ${region}: ${err.message}`);
    return false;
  }
}

async function main() {
  for (const region of regions) {
    const success = await tryPooler(region);
    if (success) {
      console.log('\n🌟 DATABASE MIGRATED SUCCESSFULLY!');
      break;
    }
  }
}

main();

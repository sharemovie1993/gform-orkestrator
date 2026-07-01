const { createClient } = require('@supabase/supabase-js');

async function run() {
  const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
  const supabaseKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Checking for duplicate NISN entries across different tenants...');
  try {
    const { data: siswaList, error } = await supabase
      .from('siswa')
      .select('nisn, tenant_id, nama_siswa');

    if (error) throw error;

    console.log(`Total student records retrieved: ${siswaList.length}`);

    // Map by NISN
    const nisnMap = {};
    const duplicates = [];

    siswaList.forEach(s => {
      if (!s.nisn) return;
      if (nisnMap[s.nisn]) {
        duplicates.push({
          nisn: s.nisn,
          first: nisnMap[s.nisn],
          second: { tenant_id: s.tenant_id, name: s.nama_siswa }
        });
      } else {
        nisnMap[s.nisn] = { tenant_id: s.tenant_id, name: s.nama_siswa };
      }
    });

    console.log(`Found ${duplicates.length} duplicate NISN records across database.`);
    if (duplicates.length > 0) {
      console.log('\n--- Duplicate Sample ---');
      duplicates.slice(0, 5).forEach(d => {
        console.log(`NISN: ${d.nisn}`);
        console.log(`  1. Tenant: ${d.first.tenant_id} | Name: ${d.first.name}`);
        console.log(`  2. Tenant: ${d.second.tenant_id} | Name: ${d.second.name}`);
      });
    }

  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
}

run();

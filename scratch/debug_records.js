const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const supabaseAnonKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugRecords() {
  console.log('Querying total rows across all tenants...');
  
  const { count: totalSiswa } = await supabase.from('siswa').select('*', { count: 'exact', head: true });
  const { count: totalKelas } = await supabase.from('kelas').select('*', { count: 'exact', head: true });
  
  console.log(`Total Siswa in database: ${totalSiswa}`);
  console.log(`Total Kelas in database: ${totalKelas}`);

  console.log('\nFetching sample siswa records...');
  const { data: sampleSiswa } = await supabase.from('siswa').select('id, name:nama_siswa, tenant_id').limit(5);
  console.log(sampleSiswa);

  console.log('\nFetching sample kelas records...');
  const { data: sampleKelas } = await supabase.from('kelas').select('id, name:nama_kelas, tenant_id').limit(5);
  console.log(sampleKelas);
}

debugRecords();

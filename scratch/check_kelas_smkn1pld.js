const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const supabaseAnonKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tenantId = 'a6e46a7c-29f8-4a6b-a762-ff9052c954d1'; // smkn1pld

async function checkKelas() {
  console.log('=== Kelas di tenant smkn1pld ===\n');
  const { data, error } = await supabase
    .from('kelas')
    .select('id, tingkat, nama_kelas, jurusan_id')
    .eq('tenant_id', tenantId)
    .order('tingkat')
    .order('nama_kelas');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Total Kelas: ${data.length}\n`);
  data.forEach(k => {
    console.log(`  [${k.tingkat}] "${k.nama_kelas}" (ID: ${k.id})`);
  });

  console.log('\n=== Distribusi Siswa per Kelas ===\n');
  for (const k of data) {
    const { count } = await supabase
      .from('siswa')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('kelas_id', k.id);
    
    if (count > 0) {
      console.log(`  "${k.nama_kelas}": ${count} siswa`);
    }
  }
  
  // Juga cek kelas yang sama sekali tidak punya siswa
  console.log('\n=== Kelas TANPA Siswa ===\n');
  for (const k of data) {
    const { count } = await supabase
      .from('siswa')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('kelas_id', k.id);
    
    if (count === 0) {
      console.log(`  ⚠ "${k.nama_kelas}" - 0 siswa`);
    }
  }
}

checkKelas();

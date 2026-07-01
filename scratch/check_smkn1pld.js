const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const supabaseAnonKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tenantId = 'a6e46a7c-29f8-4a6b-a762-ff9052c954d1'; // smkn1pld

async function checkSmkn1pld() {
  console.log('Checking SMKN 1 PLERED (smkn1pld) data...');

  // 1. Total Siswa
  const { count: totalSiswa, error: err1 } = await supabase
    .from('siswa')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  // 2. Active Siswa
  const { count: activeSiswa, error: err2 } = await supabase
    .from('siswa')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  // 3. Inactive Siswa (explicitly false)
  const { count: inactiveSiswa, error: err3 } = await supabase
    .from('siswa')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_active', false);

  // 4. Inactive Siswa (null or not true)
  const { count: nullActiveSiswa, error: err4 } = await supabase
    .from('siswa')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('is_active', null);

  // 5. Total Kelas
  const { count: totalKelas, error: err5 } = await supabase
    .from('kelas')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  console.log(`Results for tenant_id: ${tenantId}`);
  console.log(`- Total Siswa (All rows): ${totalSiswa}`);
  console.log(`- Active Siswa (is_active = true): ${activeSiswa}`);
  console.log(`- Inactive Siswa (is_active = false): ${inactiveSiswa}`);
  console.log(`- Inactive Siswa (is_active = null): ${nullActiveSiswa}`);
  console.log(`- Total Kelas: ${totalKelas}`);
}

checkSmkn1pld();

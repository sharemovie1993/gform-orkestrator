const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const supabaseAnonKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tenantId = 'a6e46a7c-29f8-4a6b-a762-ff9052c954d1'; // smkn1pld

async function checkAllKelas() {
  console.log('=== Semua Kelas di tenant smkn1pld ===\n');

  // Cek total kelas TANPA filter tenant
  const { count: totalGlobal } = await supabase
    .from('kelas')
    .select('*', { count: 'exact', head: true });
  console.log(`Total kelas SEMUA tenant: ${totalGlobal}`);

  // Cek total kelas DI tenant smkn1pld
  const { count: totalTenant } = await supabase
    .from('kelas')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);
  console.log(`Total kelas tenant smkn1pld: ${totalTenant}`);

  // Cek kelas tanpa tenant_id (bisa jadi data lama bocor)
  const { count: noTenant } = await supabase
    .from('kelas')
    .select('*', { count: 'exact', head: true })
    .is('tenant_id', null);
  console.log(`Kelas tanpa tenant_id (null): ${noTenant}`);

  // List semua kelas di smkn1pld
  const { data: kelasList } = await supabase
    .from('kelas')
    .select('id, tingkat, nama_kelas, tenant_id, jurusan_id')
    .eq('tenant_id', tenantId)
    .order('tingkat')
    .order('nama_kelas');

  console.log(`\n=== Detail ${kelasList?.length} Kelas di smkn1pld ===\n`);
  kelasList?.forEach((k, i) => {
    console.log(`  ${i+1}. [${k.tingkat}] "${k.nama_kelas}"`);
  });

  // Cek kelas di tenant lain (default)
  const { data: defaultKelas } = await supabase
    .from('kelas')
    .select('id, tingkat, nama_kelas, tenant_id')
    .eq('tenant_id', '00000000-0000-0000-0000-000000000001')
    .order('nama_kelas');
  
  console.log(`\n=== Kelas di tenant DEFAULT (${defaultKelas?.length} total) ===\n`);
  defaultKelas?.forEach((k, i) => {
    console.log(`  ${i+1}. [${k.tingkat}] "${k.nama_kelas}"`);
  });
}

checkAllKelas();

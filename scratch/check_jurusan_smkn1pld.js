const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const supabaseAnonKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TENANT_SMKN1PLD = 'a6e46a7c-29f8-4a6b-a762-ff9052c954d1';

async function checkAndAddMissingKelas() {
  // 1. Tampilkan jurusan yang ada di smkn1pld
  const { data: jurusans } = await supabase
    .from('jurusan')
    .select('id, nama_jurusan')
    .eq('tenant_id', TENANT_SMKN1PLD)
    .order('nama_jurusan');

  console.log('=== Jurusan di smkn1pld ===\n');
  jurusans?.forEach((j, i) => {
    console.log(`  ${i+1}. "${j.nama_jurusan}" (ID: ${j.id})`);
  });

  // 2. Tampilkan kelas yang sudah ada
  const { data: existingKelas } = await supabase
    .from('kelas')
    .select('nama_kelas')
    .eq('tenant_id', TENANT_SMKN1PLD)
    .order('nama_kelas');

  console.log('\n=== Kelas yang sudah ada (28) ===\n');
  existingKelas?.forEach(k => console.log(`  - ${k.nama_kelas}`));
}

checkAndAddMissingKelas();

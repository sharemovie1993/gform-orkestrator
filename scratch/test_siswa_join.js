const { createClient } = require('@supabase/supabase-js');

async function run() {
  const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
  const supabaseKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const tenantId = '7568d090-2313-4d58-9a2f-60662efd383f';
  // Let's use XI TKJ 1 ID: 03307575-f3c9-4301-9cc1-fee6e968c40e
  const kelasId = '03307575-f3c9-4301-9cc1-fee6e968c40e';

  console.log('Testing exact query from DbService.getSiswaByKelas...');
  try {
    const { data, error } = await supabase
      .from('siswa')
      .select('*, kelas(nama_kelas)')
      .eq('kelas_id', kelasId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('nama_siswa');

    if (error) {
      console.error('❌ Error executing query:', error);
    } else {
      console.log(`✅ Success! Found ${data.length} students.`);
      if (data.length > 0) {
        console.log('First student sample:', JSON.stringify(data[0], null, 2));
      }
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

run();

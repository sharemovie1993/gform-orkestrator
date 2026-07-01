const { createClient } = require('@supabase/supabase-js');

async function run() {
  const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
  const supabaseKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Querying all link_soal rows in the database...');
  try {
    const { data, error } = await supabase
      .from('link_soal')
      .select('*, kelas(nama_kelas), mapel(nama_mapel), guru(nama_guru, username)');

    if (error) throw error;

    console.log(`Total link_soal records: ${data.length}`);
    data.forEach(row => {
      console.log('--------------------------------------------------');
      console.log(`ID: ${row.id}`);
      console.log(`Tenant ID: ${row.tenant_id}`);
      console.log(`Mapel: ${row.mapel?.nama_mapel} (${row.mapel_id})`);
      console.log(`Kelas: ${row.kelas?.nama_kelas} (${row.kelas_id})`);
      console.log(`Guru: ${row.guru?.nama_guru} (${row.guru?.username}) (${row.guru_id})`);
      console.log(`Link: ${row.google_form_link}`);
      console.log(`Is Active: ${row.is_active}`);
    });

  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
}

run();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const supabaseAnonKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkLiveGuru() {
  try {
    console.log('Mengambil data guru aktif langsung dari database Supabase...');
    const { data: allGuru, error } = await supabase
      .from('guru')
      .select('id, nama_guru, username, tenant_id, is_active')
      .eq('is_active', true);

    if (error) throw error;

    console.log(`Ditemukan total ${allGuru.length} guru aktif di database.`);
    
    // Kelompokkan berdasarkan tenant_id
    const grouped = {};
    allGuru.forEach(g => {
      const tid = g.tenant_id || 'NULL/DEFAULT';
      if (!grouped[tid]) grouped[tid] = [];
      grouped[tid].push(`${g.nama_guru} (${g.username})`);
    });

    console.log('\n--- DAFTAR GURU PER TENANT DI DATABASE LIVE ---');
    for (const [tenant, list] of Object.entries(grouped)) {
      console.log(`\nTenant ID: ${tenant} (Total: ${list.length} guru)`);
      list.forEach((name, i) => {
        console.log(`  ${i+1}. ${name}`);
      });
    }
  } catch (err) {
    console.error('Gagal mengambil data guru:', err.message);
  }
}

checkLiveGuru();

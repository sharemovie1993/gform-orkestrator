const { createClient } = require('@supabase/supabase-js');

async function run() {
  const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
  const supabaseKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const tenantId = '7568d090-2313-4d58-9a2f-60662efd383f';

  try {
    const { data: classes, error: cErr } = await supabase
      .from('kelas')
      .select('*, jurusan(nama_jurusan)')
      .eq('tenant_id', tenantId);

    if (cErr) throw cErr;
    console.log(`Found ${classes.length} total classes for tenant ${tenantId}.`);

    const activeClasses = classes.filter(c => c.is_active === true);
    console.log(`Found ${activeClasses.length} active classes.`);

    console.log('\n--- Active Classes Sample ---');
    activeClasses.slice(0, 10).forEach(c => {
      console.log(`ID: ${c.id} -> Nama: ${c.nama_kelas}, Tingkat: ${c.tingkat}, is_active: ${c.is_active}`);
    });

  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
}

run();

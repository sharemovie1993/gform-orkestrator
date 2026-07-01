const { createClient } = require('@supabase/supabase-js');

async function run() {
  const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
  const supabaseKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const tenantId = '7568d090-2313-4d58-9a2f-60662efd383f';
  console.log('Querying Supabase REST API for tenant:', tenantId);

  try {
    const { data: classes, error: cErr } = await supabase
      .from('kelas')
      .select('id, nama_kelas')
      .eq('tenant_id', tenantId);

    if (cErr) throw cErr;
    console.log(`Found ${classes.length} classes.`);

    for (const k of classes) {
      const { data: students, error: sErr } = await supabase
        .from('siswa')
        .select('id, nama_siswa, is_active')
        .eq('kelas_id', k.id)
        .eq('tenant_id', tenantId);

      if (sErr) {
        console.error(`Error fetching students for class ${k.nama_kelas}:`, sErr);
        continue;
      }

      const activeCount = students.filter(s => s.is_active === true).length;
      console.log(`Class: ${k.nama_kelas} (ID: ${k.id}) | Total students: ${students.length} | Active: ${activeCount}`);
    }
  } catch (err) {
    console.error('❌ REST Query failed:', err.message);
  }
}

run();

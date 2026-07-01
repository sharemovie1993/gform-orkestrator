const { createClient } = require('@supabase/supabase-js');

async function run() {
  const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
  const supabaseKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const tenantId = '7568d090-2313-4d58-9a2f-60662efd383f';

  try {
    const { data: gurus, error } = await supabase
      .from('guru')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) throw error;
    console.log(`Gurus in tenant ${tenantId}:`);
    gurus.forEach(g => {
      console.log(`ID: ${g.id} | Name: ${g.nama_guru} | Username: ${g.username}`);
    });

  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
}

run();

const { createClient } = require('@supabase/supabase-js');

async function run() {
  const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
  const supabaseKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const tenantId = '7568d090-2313-4d58-9a2f-60662efd383f';

  try {
    const { data: settings, error } = await supabase
      .from('settings')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) throw error;
    console.log('Settings for tenant:', tenantId);
    console.log(JSON.stringify(settings, null, 2));

  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
}

run();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const tenantId = '7568d090-2313-4d58-9a2f-60662efd383f';
  console.log('Checking gurus for tenant ID:', tenantId);
  const { data: tenant, error: tErr } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
  console.log('Tenant profile:', tenant, tErr);

  const { data: gurus, error: gErr } = await supabase.from('guru').select('*').eq('tenant_id', tenantId);
  console.log('Gurus:', gurus, gErr);
}

check();

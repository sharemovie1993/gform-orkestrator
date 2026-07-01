const { createClient } = require('@supabase/supabase-js');

const cloudUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const cloudAnonKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
const cloudSupabase = createClient(cloudUrl, cloudAnonKey);

const targetTenantId = 'a6e46a7c-29f8-4a6b-a762-ff9052c954d1'; // SMKN 1 PLD Tenant ID

async function findAdmin() {
  const { data, error } = await cloudSupabase
    .from('guru')
    .select('*')
    .eq('tenant_id', targetTenantId);

  if (error) {
    console.error('Error fetching teachers from cloud:', error);
    return;
  }

  console.log('Total teachers on Cloud:', data.length);
  const admins = data.filter(g => g.username.toLowerCase().includes('admin') || g.nama_guru.toLowerCase().includes('admin'));
  console.log('Admins found:', admins);
}

findAdmin();

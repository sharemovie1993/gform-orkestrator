const { createClient } = require('@supabase/supabase-js');

const cloudUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const cloudAnonKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
const cloudSupabase = createClient(cloudUrl, cloudAnonKey);

async function findAdmins() {
  const { data, error } = await cloudSupabase
    .from('guru')
    .select('*')
    .eq('username', 'admin');

  if (error) {
    console.error('Error fetching admins from cloud:', error);
    return;
  }

  console.log('All admins on Cloud:', data);
}

findAdmins();

const { createClient } = require('@supabase/supabase-js');

// 1. Supabase Cloud Connection
const cloudUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const cloudAnonKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
const cloudSupabase = createClient(cloudUrl, cloudAnonKey);

// 2. Supabase Local Connection (via VPS Domain proxy)
const localUrl = 'https://supabaselocal.absenta.id';
const localAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';
const localSupabase = createClient(localUrl, localAnonKey);

const targetTenantId = 'a6e46a7c-29f8-4a6b-a762-ff9052c954d1'; // SMKN 1 PLD Tenant ID

async function compare() {
  console.log('🔍 FETCHING JURUSAN DATA FOR SMKN1PLD TENANT...');
  
  // 1. Fetch from Cloud
  let cloudData = [];
  try {
    const { data, error } = await cloudSupabase
      .from('jurusan')
      .select('id, nama_jurusan, tenant_id, created_at, is_active')
      .eq('tenant_id', targetTenantId);
    
    if (error) throw error;
    cloudData = data || [];
  } catch (err) {
    console.error('❌ Failed to fetch from Cloud:', err.message);
  }

  // 2. Fetch from Local
  let localData = [];
  try {
    const { data, error } = await localSupabase
      .from('jurusan')
      .select('id, nama_jurusan, tenant_id, created_at, is_active')
      .eq('tenant_id', targetTenantId);
    
    if (error) throw error;
    localData = data || [];
  } catch (err) {
    console.error('❌ Failed to fetch from Local:', err.message);
  }

  console.log('\n==================================================');
  console.log(`☁️ SUPABASE CLOUD (JURUSAN COUNT: ${cloudData.length})`);
  console.log('==================================================');
  cloudData.forEach(j => {
    console.log(`- ID: ${j.id} | Nama: ${j.nama_jurusan} | Active: ${j.is_active}`);
  });

  console.log('\n==================================================');
  console.log(`🏠 SUPABASE LOCAL (JURUSAN COUNT: ${localData.length})`);
  console.log('==================================================');
  localData.forEach(j => {
    console.log(`- ID: ${j.id} | Nama: ${j.nama_jurusan} | Active: ${j.is_active}`);
  });
  console.log('==================================================\n');
}

compare();

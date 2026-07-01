const { createClient } = require('@supabase/supabase-js');

const masterSupabase = createClient(
  'https://supabaselocal.absenta.id',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'
);

async function test() {
  try {
    const { data: tenant, error } = await masterSupabase
      .from('tenants')
      .select('id, license_key')
      .eq('domain_or_slug', 'smkn1pld')
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching tenant:', error);
    } else {
      console.log('Fetched tenant:', tenant);
    }
  } catch (err) {
    console.error('Catched error:', err);
  }
}

test();

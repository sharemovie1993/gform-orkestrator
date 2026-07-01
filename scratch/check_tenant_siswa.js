const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const supabaseAnonKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTenantSiswa() {
  console.log('Querying tenants table...');
  const { data: tenants, error: tenantErr } = await supabase
    .from('tenants')
    .select('*');
    
  if (tenantErr) {
    console.error('Error fetching tenants:', tenantErr.message);
    return;
  }
  
  console.log(`Found ${tenants.length} tenants in the table:`);
  tenants.forEach(t => {
    console.log(`- ID: ${t.id} | Name: ${t.name} | Domain/Slug: ${t.domain_or_slug}`);
  });

  const slug = 'default.absenta.id';
  // Try exact match or substring match
  const targetTenant = tenants.find(t => 
    t.domain_or_slug === slug || 
    t.domain_or_slug === 'default' ||
    t.domain_or_slug?.includes('default')
  );
  
  if (!targetTenant) {
    console.log(`\nTenant with slug "${slug}" not found.`);
    return;
  }
  
  console.log(`\nTarget tenant found: ID=${targetTenant.id}, Name=${targetTenant.name}, Domain/Slug=${targetTenant.domain_or_slug}`);
  
  // Count siswa for this tenant
  const { count, error: countErr } = await supabase
    .from('siswa')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', targetTenant.id);
    
  if (countErr) {
    console.error('Error counting siswa:', countErr.message);
  } else {
    console.log(`Number of siswa for this tenant: ${count}`);
  }
}

checkTenantSiswa();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const supabaseAnonKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function auditAllKelas() {
  // Ambil semua kelas beserta tenant_id-nya
  const { data: allKelas } = await supabase
    .from('kelas')
    .select('id, tingkat, nama_kelas, tenant_id')
    .order('tenant_id')
    .order('nama_kelas');

  // Grouping per tenant_id
  const byTenant = {};
  for (const k of allKelas) {
    const tid = k.tenant_id || 'NULL';
    if (!byTenant[tid]) byTenant[tid] = [];
    byTenant[tid].push(k);
  }

  // Ambil semua tenant untuk mapping nama
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, domain_or_slug');

  const tenantMap = {};
  for (const t of (tenants || [])) {
    tenantMap[t.id] = `${t.name} (${t.domain_or_slug})`;
  }

  console.log(`=== Distribusi Kelas per Tenant (Total: ${allKelas.length}) ===\n`);
  for (const [tid, kelasList] of Object.entries(byTenant)) {
    const tenantName = tenantMap[tid] || `UNKNOWN (${tid})`;
    console.log(`📌 ${tenantName}`);
    console.log(`   Jumlah kelas: ${kelasList.length}`);
    kelasList.forEach(k => console.log(`   - [${k.tingkat}] ${k.nama_kelas}`));
    console.log('');
  }
}

auditAllKelas();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const supabaseAnonKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tenantId = 'a6e46a7c-29f8-4a6b-a762-ff9052c954d1'; // smkn1pld

async function checkMasterData() {
  console.log(`Checking master data records for Tenant SMKN 1 PLERED (smkn1pld.absenta.id - ID: ${tenantId}):\n`);

  const tables = ['jurusan', 'kelas', 'siswa', 'guru', 'mapel', 'link_soal', 'settings'];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      if (error) {
        console.error(`- Tabel [${table}]: ERROR - ${error.message}`);
      } else {
        console.log(`- Tabel [${table}]: ${count} record(s)`);
      }
    } catch (err) {
      console.error(`- Tabel [${table}]: EXCEPTION - ${err.message}`);
    }
  }
}

checkMasterData();

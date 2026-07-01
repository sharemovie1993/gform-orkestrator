const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const supabaseAnonKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectLoginLogsTable() {
  try {
    console.log('1. Fetching a row from "login_logs" to inspect schema...');
    // Fetch a dummy insert or see what columns are returned
    const { data, error } = await supabase
      .from('login_logs')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error fetching login_logs:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('login_logs row data keys:', Object.keys(data[0] || {}));
    } else {
      console.log('No rows in login_logs, trying a test insert to inspect keys...');
      
      const { data: siswa } = await supabase.from('siswa').select('id, tenant_id').limit(1).single();
      const testRow = {
        tenant_id: siswa.tenant_id,
        siswa_id: siswa.id,
        nama_siswa: 'Test Columns',
        kelas_nama: 'Test',
        platform: 'web',
        ip_address: 'Test'
      };
      
      const { data: inserted, error: insertError } = await supabase
        .from('login_logs')
        .insert([testRow])
        .select();
        
      if (insertError) {
        console.error('Insert error:', insertError);
      } else {
        console.log('Inserted row keys:', Object.keys(inserted[0] || {}));
        // Clean up
        await supabase.from('login_logs').delete().eq('nama_siswa', 'Test Columns');
      }
    }

  } catch (err) {
    console.error('Exception:', err);
  }
}

inspectLoginLogsTable();

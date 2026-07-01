const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const supabaseAnonKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tables = ['jurusan', 'kelas', 'siswa', 'guru', 'mapel', 'link_soal'];

async function checkDbRows() {
  console.log('Checking database table rows count in Supabase...');
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.error(`- Table ${table}: Error - ${error.message}`);
      } else {
        console.log(`- Table ${table}: ${count} rows`);
      }
    } catch (e) {
      console.error(`- Table ${table}: Exception - ${e.message}`);
    }
  }
}

checkDbRows();

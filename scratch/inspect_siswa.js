const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const supabaseAnonKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectSiswaTable() {
  try {
    console.log('1. Checking "siswa" table structure and first row...');
    const { data, error } = await supabase
      .from('siswa')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error fetching siswa:', error);
      return;
    }

    console.log('Siswa row data keys:', Object.keys(data[0] || {}));
    console.log('Sample siswa row:', data[0]);

  } catch (err) {
    console.error('Exception:', err);
  }
}

inspectSiswaTable();

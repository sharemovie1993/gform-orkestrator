const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabaselocal.absenta.id';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

console.log('Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabase() {
  try {
    console.log('1. Fetching a valid student from "siswa" table...');
    const { data: students, error: studentError } = await supabase
      .from('siswa')
      .select('id, nama_siswa, tenant_id')
      .limit(1);

    if (studentError) {
      console.error('Error fetching student:', studentError);
      return;
    }

    if (!students || students.length === 0) {
      console.warn('No students found in "siswa" table. Cannot perform foreign-key validated test insert.');
      return;
    }

    const testStudent = students[0];
    console.log('Found test student:', testStudent);

    console.log('\n2. Fetching existing login_logs...');
    const { data: logs, error: selectError } = await supabase
      .from('login_logs')
      .select('*')
      .limit(5);

    if (selectError) {
      console.error('Error fetching from login_logs:', selectError);
      return;
    }

    console.log('Success! Connection verified.');
    console.log(`Current row count in login_logs (first 5):`, logs);

    console.log('\n3. Testing dummy insertion into login_logs using valid student...');
    const dummyLog = {
      tenant_id: testStudent.tenant_id,
      siswa_id: testStudent.id,
      nama_siswa: testStudent.nama_siswa + ' (Script Test)',
      kelas_nama: 'XII RPL 1',
      platform: 'web',
      ip_address: 'Script Verifier'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('login_logs')
      .insert([dummyLog])
      .select();

    if (insertError) {
      console.error('Failed to insert test log:', insertError);
    } else {
      console.log('Successfully inserted test log row:', insertData);
      
      console.log('\n4. Cleaning up test log row...');
      const { error: deleteError } = await supabase
        .from('login_logs')
        .delete()
        .eq('nama_siswa', testStudent.nama_siswa + ' (Script Test)');
      
      if (deleteError) {
        console.error('Failed to clean up:', deleteError);
      } else {
        console.log('Cleanup complete!');
      }
    }
  } catch (error) {
    console.error('Exception occurred during check:', error);
  }
}

checkDatabase();

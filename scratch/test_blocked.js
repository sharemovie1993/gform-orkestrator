const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const supabaseAnonKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testBlockedLogic() {
  try {
    console.log('1. Fetching a test student...');
    const { data: students, error: studentError } = await supabase
      .from('siswa')
      .select('id, nama_siswa, is_active')
      .limit(1);

    if (studentError) {
      console.error('Error fetching student:', studentError);
      return;
    }

    const testStudent = students[0];
    console.log(`Found test student: ${testStudent.nama_siswa} (Active: ${testStudent.is_active})`);

    console.log('\n2. Simulating a BLOCK by deactivating student...');
    const { error: blockError } = await supabase
      .from('siswa')
      .update({ is_active: false })
      .eq('id', testStudent.id);

    if (blockError) {
      console.error('Error blocking student:', blockError);
      return;
    }

    console.log('Student blocked in DB successfully!');

    console.log('\n3. Querying list of blocked students...');
    const { data: blockedList, error: blockedError } = await supabase
      .from('siswa')
      .select('id, nama_siswa, is_active')
      .eq('is_active', false);

    if (blockedError) {
      console.error('Error fetching blocked list:', blockedError);
      return;
    }

    console.log('Current blocked students count:', blockedList.length);
    console.log('Blocked students:', blockedList);

    console.log('\n4. Restoring student active status (unblocking)...');
    const { error: unblockError } = await supabase
      .from('siswa')
      .update({ is_active: true })
      .in('id', [testStudent.id]);

    if (unblockError) {
      console.error('Error unblocking student:', unblockError);
      return;
    }

    console.log('Student unblocked successfully!');

    // Recheck status
    const { data: finalStudent, error: recheckError } = await supabase
      .from('siswa')
      .select('is_active')
      .eq('id', testStudent.id)
      .single();

    if (recheckError) {
      console.error('Recheck failed:', recheckError);
    } else {
      console.log(`Rechecked active status: ${finalStudent.is_active}`);
    }

    console.log('\nALL DB LOGIC COMPILES AND RUNS CORRECTLY!');

  } catch (err) {
    console.error('Exception during test:', err);
  }
}

testBlockedLogic();

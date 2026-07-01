const { createClient } = require('@supabase/supabase-js');

async function run() {
  const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
  const supabaseKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const examIdToDelete = 'c5e3acd2-2e87-404b-8aff-2ff00ca03d98';
  console.log(`Deleting incorrect exam record with ID: ${examIdToDelete}...`);

  try {
    const { data, error } = await supabase
      .from('link_soal')
      .delete()
      .eq('id', examIdToDelete)
      .select();

    if (error) throw error;
    console.log('Successfully deleted record:', JSON.stringify(data, null, 2));

  } catch (err) {
    console.error('❌ Failed to delete:', err.message);
  }
}

run();

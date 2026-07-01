const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const supabaseAnonKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tenantId = 'a6e46a7c-29f8-4a6b-a762-ff9052c954d1'; // smkn1pld

// Simulasi fuzzy matching yang sama dengan kode baru di supabase.ts
function normalizeName(s) {
  return s.toLowerCase().replace(/[\s\-_.,()]+/g, '');
}

function fuzzyFind(list, field, input) {
  const inp = input.trim();
  const inpNorm = normalizeName(inp);
  let found = list.find(item => item[field].trim() === inp);
  if (!found) found = list.find(item => item[field].toLowerCase() === inp.toLowerCase());
  if (!found) found = list.find(item => normalizeName(item[field]) === inpNorm);
  if (!found) found = list.find(item => normalizeName(item[field]).includes(inpNorm));
  if (!found) found = list.find(item => inpNorm.includes(normalizeName(item[field])));
  return found;
}

async function testFuzzyMatching() {
  console.log('=== Test Fuzzy Matching Nama Kelas ===\n');
  
  const { data: kelas } = await supabase
    .from('kelas')
    .select('id, nama_kelas')
    .eq('tenant_id', tenantId)
    .order('nama_kelas');

  console.log('Daftar kelas di database:');
  kelas.forEach(k => console.log(`  "${k.nama_kelas}"`));
  
  // Test berbagai variasi penulisan yang mungkin ada di Excel
  const testInputs = [
    'XI AK 1', 'XI AK1', 'XIAK1', 'xiak1', 'XI AK-1',
    'XI TKJ 1', 'XI TKJ1', 'XITKJ1',
    'XI TSM 1', 'XI TSM1',
    'XI TP 1', 'XI TP1',
    'XI TOI 1', 'XITOI1',
    'X AKL 1', 'XAKL1', 'X AKL1',
    'X TO 1', 'XTO1',
  ];
  
  console.log('\n=== Hasil Test Fuzzy Match ===\n');
  for (const input of testInputs) {
    const found = fuzzyFind(kelas, 'nama_kelas', input);
    const status = found ? `✅ → "${found.nama_kelas}"` : '❌ TIDAK DITEMUKAN';
    console.log(`  Input: "${input}" ${status}`);
  }
}

testFuzzyMatching();

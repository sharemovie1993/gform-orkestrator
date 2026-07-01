const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const supabaseAnonKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TENANT_1PWK = '7568d090-2313-4d58-9a2f-60662efd383f';

async function cleanupTestData() {
  console.log('🧹 Membersihkan data uji di tenant 1pwk...\n');

  // 1. Hapus link_soal
  const { count: ls } = await supabase.from('link_soal').select('*', { count: 'exact', head: true }).eq('tenant_id', TENANT_1PWK);
  const { error: e1 } = await supabase.from('link_soal').delete().eq('tenant_id', TENANT_1PWK);
  console.log(e1 ? `❌ link_soal: ${e1.message}` : `✅ link_soal: ${ls} record dihapus`);

  // 2. Hapus siswa yang terkait ke kelas di 1pwk
  const { data: kelasIds } = await supabase.from('kelas').select('id').eq('tenant_id', TENANT_1PWK);
  const ids = kelasIds?.map(k => k.id) || [];
  let deletedSiswa = 0;
  // Hapus per batch karena banyak
  const chunkSize = 50;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { count } = await supabase.from('siswa').select('*', { count: 'exact', head: true }).in('kelas_id', chunk);
    const { error } = await supabase.from('siswa').delete().in('kelas_id', chunk);
    if (error) console.log(`  ❌ Siswa chunk error: ${error.message}`);
    else deletedSiswa += (count || 0);
  }
  // Juga hapus siswa dengan tenant_id langsung
  const { count: sw2 } = await supabase.from('siswa').select('*', { count: 'exact', head: true }).eq('tenant_id', TENANT_1PWK);
  const { error: e2b } = await supabase.from('siswa').delete().eq('tenant_id', TENANT_1PWK);
  if (!e2b) deletedSiswa += (sw2 || 0);
  console.log(`✅ siswa: ${deletedSiswa} record dihapus`);

  // 3. Hapus kelas
  const { count: kl } = await supabase.from('kelas').select('*', { count: 'exact', head: true }).eq('tenant_id', TENANT_1PWK);
  const { error: e3 } = await supabase.from('kelas').delete().eq('tenant_id', TENANT_1PWK);
  console.log(e3 ? `❌ kelas: ${e3.message}` : `✅ kelas: ${kl} record dihapus`);

  // 4. Hapus jurusan
  const { count: jr } = await supabase.from('jurusan').select('*', { count: 'exact', head: true }).eq('tenant_id', TENANT_1PWK);
  const { error: e4 } = await supabase.from('jurusan').delete().eq('tenant_id', TENANT_1PWK);
  console.log(e4 ? `❌ jurusan: ${e4.message}` : `✅ jurusan: ${jr} record dihapus`);

  // 5. Hapus guru (kecuali admin)
  const { count: gr } = await supabase.from('guru').select('*', { count: 'exact', head: true }).eq('tenant_id', TENANT_1PWK).neq('username', 'admin');
  const { error: e5 } = await supabase.from('guru').delete().eq('tenant_id', TENANT_1PWK).neq('username', 'admin');
  console.log(e5 ? `❌ guru: ${e5.message}` : `✅ guru: ${gr} record dihapus (admin dipertahankan)`);

  // 6. Hapus mapel
  const { count: mp } = await supabase.from('mapel').select('*', { count: 'exact', head: true }).eq('tenant_id', TENANT_1PWK);
  const { error: e6 } = await supabase.from('mapel').delete().eq('tenant_id', TENANT_1PWK);
  console.log(e6 ? `❌ mapel: ${e6.message}` : `✅ mapel: ${mp} record dihapus`);

  // 7. Verifikasi akhir
  console.log('\n=== Verifikasi Akhir tenant 1pwk ===\n');
  const tables = ['jurusan', 'kelas', 'siswa', 'guru', 'mapel', 'link_soal'];
  for (const table of tables) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq('tenant_id', TENANT_1PWK);
    const icon = count === 0 ? '✅' : '⚠️';
    console.log(`  ${icon} ${table}: ${count} record`);
  }
  console.log('\n🎉 Selesai! Tenant 1pwk sudah bersih.');
}

cleanupTestData();

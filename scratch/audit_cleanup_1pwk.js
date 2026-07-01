const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const supabaseAnonKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tenant IDs
const TENANT_1PWK = null; // akan dicari dari DB
const TENANT_SMKN1PLD = 'a6e46a7c-29f8-4a6b-a762-ff9052c954d1';

async function auditAndClean() {
  // 1. Cari tenant ID untuk 1pwk
  const { data: tenant1pwk } = await supabase
    .from('tenants')
    .select('id, name, domain_or_slug')
    .eq('domain_or_slug', '1pwk')
    .maybeSingle();

  if (!tenant1pwk) {
    console.log('❌ Tenant 1pwk tidak ditemukan!');
    return;
  }

  console.log(`📌 Tenant 1pwk: ${tenant1pwk.name} (ID: ${tenant1pwk.id})\n`);

  // 2. Cek jumlah data per tabel di tenant 1pwk
  const tables = ['jurusan', 'kelas', 'siswa', 'guru', 'mapel', 'link_soal', 'settings'];
  console.log('=== Data di tenant 1pwk (SMKN 1 Purwakarta) ===\n');
  for (const table of tables) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant1pwk.id);
    console.log(`  - ${table}: ${count} record(s)`);
  }

  // 3. List kelas di 1pwk untuk verifikasi
  const { data: kelas1pwk } = await supabase
    .from('kelas')
    .select('id, tingkat, nama_kelas')
    .eq('tenant_id', tenant1pwk.id)
    .order('tingkat').order('nama_kelas');

  console.log(`\n=== Detail kelas di 1pwk (${kelas1pwk?.length} total) ===\n`);
  kelas1pwk?.forEach((k, i) => {
    console.log(`  ${i+1}. [${k.tingkat}] ${k.nama_kelas}`);
  });

  // 4. Cek apakah kelas 1pwk punya siswa yang terkait
  let totalSiswaLinked = 0;
  for (const k of (kelas1pwk || [])) {
    const { count } = await supabase
      .from('siswa')
      .select('*', { count: 'exact', head: true })
      .eq('kelas_id', k.id);
    if (count > 0) {
      console.log(`  ⚠️  Kelas "${k.nama_kelas}" punya ${count} siswa terkait!`);
      totalSiswaLinked += count;
    }
  }

  if (totalSiswaLinked === 0) {
    console.log('\n✅ Tidak ada siswa yang terkait ke kelas-kelas di 1pwk. Aman untuk dihapus.');
  } else {
    console.log(`\n⚠️  Ada ${totalSiswaLinked} siswa terkait ke kelas 1pwk. Harus dihapus dulu sebelum hapus kelas.`);
  }

  console.log('\n=== SQL untuk membersihkan data salah tenant di 1pwk ===\n');
  console.log(`-- Hapus semua data di tenant 1pwk (jika memang salah masuk)`);
  console.log(`-- Jalankan di Supabase SQL Editor secara berurutan:\n`);
  console.log(`-- 1. Hapus siswa di kelas 1pwk (jika ada)`);
  console.log(`DELETE FROM siswa WHERE kelas_id IN (`);
  console.log(`  SELECT id FROM kelas WHERE tenant_id = '${tenant1pwk.id}'`);
  console.log(`);\n`);
  console.log(`-- 2. Hapus kelas`);
  console.log(`DELETE FROM kelas WHERE tenant_id = '${tenant1pwk.id}';\n`);
  console.log(`-- 3. Hapus jurusan`);
  console.log(`DELETE FROM jurusan WHERE tenant_id = '${tenant1pwk.id}';\n`);
  console.log(`-- 4. Hapus guru`);
  console.log(`DELETE FROM guru WHERE tenant_id = '${tenant1pwk.id}' AND username != 'admin';\n`);
  console.log(`-- 5. Hapus mapel`);
  console.log(`DELETE FROM mapel WHERE tenant_id = '${tenant1pwk.id}';\n`);
}

auditAndClean();

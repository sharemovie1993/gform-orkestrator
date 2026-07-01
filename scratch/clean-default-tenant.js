const { createClient } = require('@supabase/supabase-js');

// Menggunakan credential master database Supabase dari berkas .env
const supabaseUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const supabaseAnonKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanDefaultTenant() {
  try {
    console.log('1. Mengambil profil tenant dengan slug: default...');
    const { data: tenant, error: fetchErr } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('domain_or_slug', 'default')
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!tenant) {
      console.log('Tenant default tidak ditemukan di database.');
      return;
    }

    const tenantId = tenant.id;
    console.log(`Tenant default ditemukan. ID: ${tenantId}, Nama Saat Ini: ${tenant.name}`);

    // Update branding profil default menjadi netral
    console.log('2. Memperbarui branding tenant default menjadi netral...');
    const { error: updateErr } = await supabase
      .from('tenants')
      .update({
        name: 'Portal Ujian Bersama',
        exam_event_title: 'Ujian Akhir Semester / Penilaian Sumatif',
        logo_url: 'https://xjnctgbzilrhbzsbrtpu.supabase.co/storage/v1/object/public/logos/tutwuri.png' // Logo netral umum Tutwuri / Pendidikan
      })
      .eq('id', tenantId);

    if (updateErr) throw updateErr;
    console.log('Branding berhasil diperbarui.');

    // Hapus data master bawaan (kelas, jurusan, guru, mapel) yang terkait dengan tenant_id default
    console.log('3. Membersihkan master data untuk tenant default...');
    
    // Hapus siswa
    const { count: countSiswa, error: delSiswaErr } = await supabase
      .from('siswa')
      .delete()
      .eq('tenant_id', tenantId);
    if (delSiswaErr) console.warn('Gagal menghapus siswa:', delSiswaErr.message);
    else console.log('Data siswa dihapus.');

    // Hapus link soal
    const { error: delSoalErr } = await supabase
      .from('link_soal')
      .delete()
      .eq('tenant_id', tenantId);
    if (delSoalErr) console.warn('Gagal menghapus link soal:', delSoalErr.message);
    else console.log('Data link soal dihapus.');

    // Hapus kelas
    const { error: delKelasErr } = await supabase
      .from('kelas')
      .delete()
      .eq('tenant_id', tenantId);
    if (delKelasErr) console.warn('Gagal menghapus kelas:', delKelasErr.message);
    else console.log('Data kelas dihapus.');

    // Hapus jurusan
    const { error: delJurusanErr } = await supabase
      .from('jurusan')
      .delete()
      .eq('tenant_id', tenantId);
    if (delJurusanErr) console.warn('Gagal menghapus jurusan:', delJurusanErr.message);
    else console.log('Data jurusan dihapus.');

    // Hapus guru
    const { error: delGuruErr } = await supabase
      .from('guru')
      .delete()
      .eq('tenant_id', tenantId);
    if (delGuruErr) console.warn('Gagal menghapus guru:', delGuruErr.message);
    else console.log('Data guru dihapus.');

    // Hapus mapel
    const { error: delMapelErr } = await supabase
      .from('mapel')
      .delete()
      .eq('tenant_id', tenantId);
    if (delMapelErr) console.warn('Gagal menghapus mapel:', delMapelErr.message);
    else console.log('Data mapel dihapus.');

    // Reset cache version untuk memaksa pembaruan
    const { error: cacheErr } = await supabase
      .from('settings')
      .upsert({ key: 'cache_version', value: '1', tenant_id: tenantId, updated_at: new Date().toISOString() });
    if (cacheErr) console.warn('Gagal mereset cache version:', cacheErr.message);
    else console.log('Cache version diset ke 1.');

    console.log('Proses pembersihan selesai dengan sukses!');
  } catch (err) {
    console.error('Terjadi kesalahan:', err);
  }
}

cleanDefaultTenant();

// scratch/stress_test_real1386.js
// Stress Test REAL: Login menggunakan 1386 NISN UNIK dari database SMKN 1 PLD
// Setiap siswa login tepat 1x → parse response → load daftar ujian sesuai kelasnya
// Hasil lengkap disimpan ke file laporan

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ─── KONFIGURASI ───────────────────────────────────────────────────────────────
const SUPABASE_URL      = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
const TENANT_ID         = 'a6e46a7c-29f8-4a6b-a762-ff9052c954d1';
const CONCURRENCY       = 100; // 100 siswa login simultan bersamaan

const REPORT_FILE = path.join(__dirname, `stress_real1386_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`);

// ─── LOGGER ────────────────────────────────────────────────────────────────────
const logLines = [];
function log(...args) {
  const msg = args.join(' ');
  console.log(msg);
  logLines.push(msg);
}
function saveReport() {
  fs.writeFileSync(REPORT_FILE, logLines.join('\n'), 'utf8');
  log(`\n📄 Laporan disimpan ke:\n   ${REPORT_FILE}`);
}

// ─── HTTP HELPER ───────────────────────────────────────────────────────────────
function makeRequest(url, extraHeaders = {}) {
  return new Promise((resolve) => {
    const start  = Date.now();
    const urlObj = new URL(url);
    https.request({
      hostname: urlObj.hostname, port: 443,
      path: urlObj.pathname + urlObj.search, method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      timeout: 15000,
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        const duration = Date.now() - start;
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (_) {}
        resolve({ success: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, duration, raw, parsed });
      });
    })
    .on('error', err => resolve({ success: false, status: 0, duration: Date.now() - start, raw: '', parsed: null, error: err.message }))
    .on('timeout', function() { this.destroy(); resolve({ success: false, status: 0, duration: Date.now() - start, raw: '', parsed: null, error: 'TIMEOUT' }); })
    .end();
  });
}

// ─── AMBIL SEMUA SISWA (PAGINASI MELEWATI LIMIT 1000) ─────────────────────────
async function fetchAllStudents() {
  log('🔄 [PERSIAPAN] Mengambil seluruh NISN siswa aktif dari database (paginasi)...');
  let allStudents = [];

  // Halaman 1: offset 0 - 999
  const r1 = await makeRequest(
    `${SUPABASE_URL}/rest/v1/siswa?select=nisn,kelas_id,nama_siswa&tenant_id=eq.${TENANT_ID}&is_active=eq.true&order=nama_siswa&limit=1000&offset=0`
  );
  if (r1.success && Array.isArray(r1.parsed)) {
    allStudents = allStudents.concat(r1.parsed);
    log(`   ✅ Halaman 1: ${r1.parsed.length} siswa diambil (offset 0)`);
  } else {
    log(`   ❌ Gagal ambil halaman 1: ${r1.error || r1.raw.substring(0, 100)}`);
  }

  // Halaman 2: offset 1000 - 1999
  const r2 = await makeRequest(
    `${SUPABASE_URL}/rest/v1/siswa?select=nisn,kelas_id,nama_siswa&tenant_id=eq.${TENANT_ID}&is_active=eq.true&order=nama_siswa&limit=1000&offset=1000`
  );
  if (r2.success && Array.isArray(r2.parsed) && r2.parsed.length > 0) {
    allStudents = allStudents.concat(r2.parsed);
    log(`   ✅ Halaman 2: ${r2.parsed.length} siswa diambil (offset 1000)`);
  } else {
    log(`   ℹ️  Halaman 2: Tidak ada data tambahan.`);
  }

  // Deduplikasi berdasarkan NISN (jaga-jaga)
  const uniqueMap = new Map();
  for (const s of allStudents) {
    if (!uniqueMap.has(s.nisn)) uniqueMap.set(s.nisn, s);
  }
  const unique = Array.from(uniqueMap.values());
  log(`   📊 Total unik setelah deduplikasi: ${unique.length} siswa`);
  return unique;
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  const startTime = new Date().toISOString();
  log(`${'═'.repeat(72)}`);
  log(`  STRESS TEST REAL — LOGIN ${1386} NISN UNIK SMKN 1 PLD`);
  log(`  Setiap siswa login tepat 1x dengan NISN aslinya sendiri`);
  log(`  Flow: Login NISN → Parse Response → Load Daftar Ujian`);
  log(`  Waktu Mulai  : ${startTime}`);
  log(`  Concurrency  : ${CONCURRENCY} siswa simultan`);
  log(`${'═'.repeat(72)}`);

  // ── Ambil semua NISN ────────────────────────────────────────────────────────
  const students = await fetchAllStudents();
  if (students.length === 0) {
    log('❌ Tidak ada data siswa. Pengujian dibatalkan.');
    saveReport(); return;
  }

  const TOTAL = students.length;
  log(`\n🎯 Target: ${TOTAL} siswa akan login masing-masing dengan NISN uniknya sendiri`);
  log(`   Contoh 5 siswa pertama:`);
  students.slice(0, 5).forEach((s, i) =>
    log(`   ${i+1}. NISN: ${s.nisn} | ${s.nama_siswa}`)
  );

  // ── Jalankan stress test ─────────────────────────────────────────────────────
  log(`\n${'='.repeat(72)}`);
  log(`🚀 Memulai Stress Test Real — ${TOTAL} Login Unik, ${CONCURRENCY} Simultan`);
  log(`${'='.repeat(72)}`);

  const results  = [];
  const queue    = [...students]; // satu antrian per siswa
  let completed  = 0;
  const testStart = Date.now();

  const runWorker = async () => {
    while (queue.length > 0) {
      const student = queue.shift();

      // ── STEP 1: Login dengan NISN siswa yang bersangkutan ──────────────────
      const loginUrl = `${SUPABASE_URL}/rest/v1/siswa?select=*,kelas(nama_kelas)&nisn=eq.${student.nisn}&tenant_id=eq.${TENANT_ID}&is_active=eq.true`;
      const loginRes = await makeRequest(loginUrl);

      let loginOk    = false;
      let kelasId    = student.kelas_id;
      let kelasNama  = '-';
      let namaSiswa  = student.nama_siswa;

      if (loginRes.success && Array.isArray(loginRes.parsed) && loginRes.parsed.length > 0) {
        const data = loginRes.parsed[0];
        kelasId   = data.kelas_id   || kelasId;
        kelasNama = data.kelas?.nama_kelas || '-';
        namaSiswa = data.nama_siswa || namaSiswa;
        loginOk   = true;
      }

      // ── STEP 2: Ambil daftar ujian berdasarkan kelas_id dari response login ─
      const examUrl = `${SUPABASE_URL}/rest/v1/link_soal?select=id,tanggal_ujian,mapel(nama_mapel),guru(nama_guru)&tenant_id=eq.${TENANT_ID}&kelas_id=eq.${kelasId}&is_active=eq.true`;
      const examRes = await makeRequest(examUrl);

      let examOk    = false;
      let examCount = 0;
      if (examRes.success && Array.isArray(examRes.parsed)) {
        examOk    = true;
        examCount = examRes.parsed.length;
      }

      results.push({
        nisn: student.nisn,
        nama: namaSiswa,
        kelasNama,
        loginOk,
        loginStatus:   loginRes.status,
        loginDuration: loginRes.duration,
        examOk,
        examStatus:    examRes.status,
        examDuration:  examRes.duration,
        examCount,
        totalDuration: loginRes.duration + examRes.duration,
        loginError:    loginRes.error,
        examError:     examRes.error,
      });

      completed++;
      // Progress setiap 10%
      if (completed % Math.ceil(TOTAL / 10) === 0 || completed === TOTAL) {
        const pct = Math.round((completed / TOTAL) * 100);
        const elapsed = ((Date.now() - testStart) / 1000).toFixed(1);
        log(`   ⏳ [${pct.toString().padStart(3)}%] ${completed}/${TOTAL} selesai — ${elapsed}s berlalu`);
      }
    }
  };

  // Jalankan semua worker secara paralel sesuai concurrency
  await Promise.all(Array.from({ length: CONCURRENCY }, runWorker));

  const testDuration = Date.now() - testStart;

  // ── Analisis Hasil ──────────────────────────────────────────────────────────
  const loginOkList  = results.filter(r => r.loginOk);
  const loginFailList= results.filter(r => !r.loginOk);
  const examOkList   = results.filter(r => r.examOk);
  const examFailList = results.filter(r => !r.examOk);
  const fullOkList   = results.filter(r => r.loginOk && r.examOk);
  const anyFailList  = results.filter(r => !r.loginOk || !r.examOk);

  const allDur    = results.map(r => r.totalDuration);
  const avgDur    = (allDur.reduce((a,b) => a+b, 0) / allDur.length).toFixed(0);
  const minDur    = Math.min(...allDur);
  const maxDur    = Math.max(...allDur);
  const loginDurs = results.map(r => r.loginDuration);
  const examDurs  = results.map(r => r.examDuration);
  const avgLogin  = (loginDurs.reduce((a,b)=>a+b,0)/loginDurs.length).toFixed(0);
  const avgExam   = (examDurs.reduce((a,b)=>a+b,0)/examDurs.length).toFixed(0);
  const rps       = (TOTAL / (testDuration / 1000)).toFixed(2);

  log(`\n${'='.repeat(72)}`);
  log(`📋 HASIL STRESS TEST REAL — ${TOTAL} SISWA UNIK`);
  log(`${'='.repeat(72)}`);
  log(`   ✅ Login NISN Sukses        : ${loginOkList.length} / ${TOTAL}  (${((loginOkList.length/TOTAL)*100).toFixed(1)}%)`);
  log(`   ✅ Load Daftar Ujian Sukses : ${examOkList.length} / ${TOTAL}  (${((examOkList.length/TOTAL)*100).toFixed(1)}%)`);
  log(`   ✅ FULL FLOW Sukses (2/2)   : ${fullOkList.length} / ${TOTAL}  (${((fullOkList.length/TOTAL)*100).toFixed(1)}%)`);
  log(`   ❌ Login Gagal              : ${loginFailList.length}`);
  log(`   ❌ Load Ujian Gagal         : ${examFailList.length}`);
  log(`   ⏱️  Total Waktu             : ${(testDuration/1000).toFixed(2)} detik`);
  log(`   ⚡ Throughput               : ${rps} sesi siswa / detik`);
  log(`   📉 Latency Login Rata-rata  : ${avgLogin} ms`);
  log(`   📉 Latency Ujian Rata-rata  : ${avgExam} ms`);
  log(`   📉 Latency Gabungan Rata2   : ${avgDur} ms`);
  log(`   🟢 Latency Tercepat         : ${minDur} ms`);
  log(`   🔴 Latency Terlambat        : ${maxDur} ms`);

  // ── Cetak siswa yang gagal (jika ada) ──────────────────────────────────────
  if (anyFailList.length > 0) {
    log(`\n⚠️  [DAFTAR KEGAGALAN] — ${anyFailList.length} siswa bermasalah:`);
    anyFailList.slice(0, 20).forEach((r, i) => {
      log(`   ${i+1}. NISN: ${r.nisn} | ${r.nama} | Login: ${r.loginOk ? '✅' : '❌ HTTP'+r.loginStatus} | Ujian: ${r.examOk ? '✅' : '❌ HTTP'+r.examStatus} | Error: ${r.loginError || r.examError || '-'}`);
    });
  } else {
    log(`\n   🎉 TIDAK ADA KEGAGALAN — Semua ${TOTAL} siswa berhasil login dan memuat ujian!`);
  }

  // ── Bukti integritas: 10 sampel response nyata ─────────────────────────────
  log(`\n${'='.repeat(72)}`);
  log(`🔍 [BUKTI INTEGRITAS] 10 Sampel Response Nyata (Siswa Berbeda-beda)`);
  log(`${'='.repeat(72)}`);
  // Ambil dari berbagai posisi (awal, tengah, akhir)
  const sampleIdxs = [0, 100, 250, 400, 550, 700, 850, 1000, 1150, fullOkList.length - 1].filter(i => i < fullOkList.length);
  sampleIdxs.forEach((idx, n) => {
    const r = fullOkList[idx];
    log(`\n   ┌─ Sampel #${n+1} (Urutan ke-${idx+1} dari ${fullOkList.length}) ─────────────────────`);
    log(`   │  NISN         : ${r.nisn}`);
    log(`   │  Nama         : ${r.nama}`);
    log(`   │  Kelas        : ${r.kelasNama}`);
    log(`   │  Login (HTTP) : ${r.loginStatus} ✅  |  Latency: ${r.loginDuration} ms`);
    log(`   │  Ujian (HTTP) : ${r.examStatus} ✅  |  Latency: ${r.examDuration} ms  |  Jumlah: ${r.examCount} ujian`);
    log(`   │  Total Waktu  : ${r.totalDuration} ms`);
    log(`   └────────────────────────────────────────────────────────────`);
  });

  // ── Ringkasan akhir ─────────────────────────────────────────────────────────
  const verdict = anyFailList.length === 0
    ? '✅ LULUS SEMPURNA — SEMUA SISWA DAPAT LOGIN DAN MEMUAT UJIAN'
    : `⚠️  ADA ${anyFailList.length} KEGAGALAN — PERLU INVESTIGASI`;

  log(`\n${'═'.repeat(72)}`);
  log(`  RINGKASAN AKHIR`);
  log(`${'═'.repeat(72)}`);
  log(`  Siswa Diuji    : ${TOTAL} (NISN unik masing-masing)`);
  log(`  Total Request  : ${TOTAL * 2} HTTP request (login + load ujian)`);
  log(`  Concurrency    : ${CONCURRENCY} siswa simultan`);
  log(`  Waktu Total    : ${(testDuration/1000).toFixed(2)} detik`);
  log(`  Throughput     : ${rps} sesi/detik`);
  log(`  KESIMPULAN     : ${verdict}`);
  log(`${'═'.repeat(72)}`);

  saveReport();
}

main().catch(err => { log(`\n❌ FATAL: ${err.message}`); saveReport(); });

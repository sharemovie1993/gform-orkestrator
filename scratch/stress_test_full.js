// scratch/stress_test_full.js
// Stress Test PENUH 2 ARAH (Bidirectional) dengan Validasi Response & Laporan File
// Mensimulasikan alur nyata siswa: Login NISN → Parse Response → Load Daftar Ujian → Parse Response

const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── KONFIGURASI ───────────────────────────────────────────────────────────────
const SUPABASE_URL      = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
const TENANT_ID         = 'a6e46a7c-29f8-4a6b-a762-ff9052c954d1';
const VPS_STATIC_URL    = 'https://smkn1pld.absenta.id';
const TOTAL_REQUESTS    = 1400;
const CONCURRENCY       = 150;

// Lokasi file laporan
const REPORT_DIR  = path.join(__dirname);
const REPORT_FILE = path.join(REPORT_DIR, `stress_report_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`);

// ─── LOGGER (console + file) ───────────────────────────────────────────────────
const logLines = [];
function log(...args) {
  const msg = args.join(' ');
  console.log(msg);
  logLines.push(msg);
}

function saveReport() {
  fs.writeFileSync(REPORT_FILE, logLines.join('\n'), 'utf8');
  console.log(`\n📄 Laporan lengkap disimpan ke:\n   ${REPORT_FILE}`);
}

// ─── HTTP HELPER ───────────────────────────────────────────────────────────────
function makeRequest(url, method = 'GET', extraHeaders = {}, body = null) {
  return new Promise((resolve) => {
    const start  = Date.now();
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      timeout: 12000,
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        const duration = Date.now() - start;
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (_) {}
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true,  status: res.statusCode, duration, raw, parsed });
        } else {
          resolve({ success: false, status: res.statusCode, duration, raw, parsed });
        }
      });
    });

    req.on('error', (err) =>
      resolve({ success: false, status: 0, duration: Date.now() - start, raw: '', parsed: null, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, status: 0, duration: Date.now() - start, raw: '', parsed: null, error: 'TIMEOUT' });
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ─── STAGE RUNNER ──────────────────────────────────────────────────────────────
async function runStage(name, taskFn, total, concurrency) {
  log(`\n${'='.repeat(72)}`);
  log(`🚀 [STAGE] ${name}`);
  log(`   Total Request : ${total}  |  Concurrency : ${concurrency} simultan`);
  log(`${'='.repeat(72)}`);

  const results   = [];
  const queue     = Array.from({ length: total });
  let completed   = 0;

  const stageStart = Date.now();

  const runWorker = async () => {
    while (queue.length > 0) {
      queue.shift();
      const r = await taskFn();
      results.push(r);
      completed++;
      const pct = Math.round((completed / total) * 100);
      if (completed % Math.ceil(total / 5) === 0 || completed === total) {
        log(`   ⏳ Progress : ${completed}/${total} (${pct}%)`);
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, runWorker));

  const totalDuration = Date.now() - stageStart;
  const successList   = results.filter(r => r.success);
  const failedList    = results.filter(r => !r.success);
  const durations     = results.map(r => r.duration);
  const avg           = (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1);
  const min           = Math.min(...durations);
  const max           = Math.max(...durations);
  const rps           = (total / (totalDuration / 1000)).toFixed(2);
  const successPct    = ((successList.length / total) * 100).toFixed(1);
  const failPct       = ((failedList.length / total) * 100).toFixed(1);

  log(`\n📋 [HASIL] ${name}`);
  log(`   ✅ Sukses (2xx)        : ${successList.length} / ${total}  (${successPct}%)`);
  log(`   ❌ Gagal / Timeout     : ${failedList.length} / ${total}  (${failPct}%)`);
  log(`   ⏱️  Total Waktu         : ${(totalDuration / 1000).toFixed(2)} detik`);
  log(`   ⚡ Throughput (RPS)    : ${rps} Request / Detik`);
  log(`   📉 Latency Rata-rata   : ${avg} ms`);
  log(`   🟢 Latency Tercepat    : ${min} ms`);
  log(`   🔴 Latency Terlambat   : ${max} ms`);
  if (failedList.length > 0) {
    log(`   ⚠️  Contoh Error        : ${failedList[0].error || 'HTTP ' + failedList[0].status}`);
  }

  return { successList, failedList, rps, avg, min, max, totalDuration };
}

// ─── VALIDASI RESPONSE HELPER ─────────────────────────────────────────────────
function printResponseSample(label, result, index) {
  log(`\n   --- Sampel Response #${index + 1} (${label}) ---`);
  log(`   HTTP Status  : ${result.status}`);
  log(`   Latency      : ${result.duration} ms`);
  if (result.parsed) {
    if (Array.isArray(result.parsed)) {
      log(`   Jumlah Data  : ${result.parsed.length} record`);
      if (result.parsed.length > 0) {
        const sample = result.parsed[0];
        const keys = Object.keys(sample).slice(0, 5); // max 5 field
        log(`   Field Pertama: ${keys.join(', ')}`);
        log(`   Data Sample  : ${JSON.stringify(Object.fromEntries(keys.map(k => [k, sample[k]])))}`);
      }
    } else {
      log(`   Parsed JSON  : ${JSON.stringify(result.parsed).substring(0, 200)}`);
    }
  } else {
    log(`   Raw Response : ${result.raw.substring(0, 200)}`);
  }
}

// ─── MAIN EXECUTION ───────────────────────────────────────────────────────────
async function main() {
  const startTime = new Date().toISOString();
  log(`${'═'.repeat(72)}`);
  log(`  LAPORAN STRESS TEST BIDIRECTIONAL - FULL 2 ARAH`);
  log(`  Proyek     : GForm Orkestrator | Tenant: SMKN 1 PLD`);
  log(`  Waktu Mulai: ${startTime}`);
  log(`  Target     : ${TOTAL_REQUESTS} pengguna, ${CONCURRENCY} konkuren simultan`);
  log(`${'═'.repeat(72)}`);

  // ── PERSIAPAN: Ambil sampel siswa nyata ───────────────────────────────────
  log(`\n🔄 [PERSIAPAN] Mengambil 20 sampel NISN siswa aktif dari Supabase...`);
  const prepUrl = `${SUPABASE_URL}/rest/v1/siswa?select=nisn,kelas_id,nama_siswa&tenant_id=eq.${TENANT_ID}&is_active=eq.true&limit=20`;
  const prepRes = await makeRequest(prepUrl);

  if (!prepRes.success || !Array.isArray(prepRes.parsed) || prepRes.parsed.length === 0) {
    log(`❌ [PERSIAPAN] Gagal mengambil sampel siswa. Pengujian dibatalkan.`);
    log(`   Error: ${prepRes.error || prepRes.raw}`);
    saveReport();
    return;
  }

  const students = prepRes.parsed;
  log(`✅ [PERSIAPAN] Berhasil mengambil ${students.length} sampel siswa.`);
  log(`\n   Daftar siswa sampel yang digunakan:`);
  students.forEach((s, i) => log(`   ${i + 1}. NISN: ${s.nisn}  |  Kelas ID: ${s.kelas_id}  |  Nama: ${s.nama_siswa}`));

  // ── STAGE 1: VPS Nginx ────────────────────────────────────────────────────
  const stage1 = await runStage(
    'STAGE 1 — Nginx VPS Web Server (Akses Landing Page)',
    () => makeRequest(VPS_STATIC_URL, 'GET', { apikey: '', Authorization: '' }),
    TOTAL_REQUESTS, CONCURRENCY
  );

  // Cetak 3 sampel response VPS
  log(`\n🔍 [VALIDASI RESPONSE] Contoh Response Nyata dari VPS:`);
  stage1.successList.slice(0, 3).forEach((r, i) => {
    log(`\n   --- Sampel Response #${i + 1} (Nginx VPS) ---`);
    log(`   HTTP Status  : ${r.status}`);
    log(`   Latency      : ${r.duration} ms`);
    log(`   Ukuran Body  : ${r.raw.length} bytes`);
    log(`   Cuplikan Body: ${r.raw.substring(0, 150).replace(/\n/g, ' ')}...`);
  });

  // ── STAGE 2 & 3: Flow 2 Arah Penuh (Login → Daftar Ujian berrantai) ──────
  log(`\n${'='.repeat(72)}`);
  log(`🚀 [STAGE 2+3] Flow Penuh 2 Arah: Login NISN → Parse → Load Daftar Ujian`);
  log(`   Total Request : ${TOTAL_REQUESTS}  |  Concurrency : ${CONCURRENCY} simultan`);
  log(`${'='.repeat(72)}`);

  const flowResults = [];
  const queue2      = Array.from({ length: TOTAL_REQUESTS });
  let completed2    = 0;
  const flowStart   = Date.now();

  const runFlowWorker = async () => {
    while (queue2.length > 0) {
      queue2.shift();
      const student = students[Math.floor(Math.random() * students.length)];

      // ──── LANGKAH A: Login NISN (Request 1 dari 2) ────
      const loginUrl = `${SUPABASE_URL}/rest/v1/siswa?select=*,kelas(nama_kelas)&nisn=eq.${student.nisn}&tenant_id=eq.${TENANT_ID}`;
      const loginRes = await makeRequest(loginUrl);

      let loginOk     = false;
      let siswaData   = null;
      let kelasId     = student.kelas_id; // fallback ke data awal
      let kelasNama   = '-';

      if (loginRes.success && Array.isArray(loginRes.parsed) && loginRes.parsed.length > 0) {
        siswaData = loginRes.parsed[0];
        kelasId   = siswaData.kelas_id;
        kelasNama = siswaData.kelas?.nama_kelas || '-';
        loginOk   = true;
      }

      // ──── LANGKAH B: Load Daftar Ujian menggunakan kelas_id dari RESPONSE LOGIN (Request 2 dari 2) ────
      const examUrl = `${SUPABASE_URL}/rest/v1/link_soal?select=*,kelas(nama_kelas),mapel(nama_mapel),guru(nama_guru)&tenant_id=eq.${TENANT_ID}&kelas_id=eq.${kelasId}&is_active=eq.true`;
      const examRes = await makeRequest(examUrl);

      let examOk    = false;
      let examCount = 0;
      let examSample = null;

      if (examRes.success && Array.isArray(examRes.parsed)) {
        examOk    = true;
        examCount = examRes.parsed.length;
        examSample = examRes.parsed[0] || null;
      }

      flowResults.push({
        nisn: student.nisn,
        nama: siswaData?.nama_siswa || student.nama_siswa,
        kelasId,
        kelasNama,
        loginOk,
        loginStatus: loginRes.status,
        loginDuration: loginRes.duration,
        loginRecords: loginOk ? loginRes.parsed.length : 0,
        examOk,
        examStatus: examRes.status,
        examDuration: examRes.duration,
        examCount,
        examSample,
        totalDuration: loginRes.duration + examRes.duration,
      });

      completed2++;
      if (completed2 % Math.ceil(TOTAL_REQUESTS / 5) === 0 || completed2 === TOTAL_REQUESTS) {
        const pct = Math.round((completed2 / TOTAL_REQUESTS) * 100);
        log(`   ⏳ Progress : ${completed2}/${TOTAL_REQUESTS} (${pct}%)`);
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, runFlowWorker));

  const flowTotal   = Date.now() - flowStart;
  const loginOkList = flowResults.filter(r => r.loginOk);
  const examOkList  = flowResults.filter(r => r.examOk);
  const bothOkList  = flowResults.filter(r => r.loginOk && r.examOk);
  const anyFail     = flowResults.filter(r => !r.loginOk || !r.examOk);

  const allDurations = flowResults.map(r => r.totalDuration);
  const avgTotal = (allDurations.reduce((a, b) => a + b, 0) / allDurations.length).toFixed(1);
  const minTotal = Math.min(...allDurations);
  const maxTotal = Math.max(...allDurations);

  log(`\n📋 [HASIL FLOW 2 ARAH]`);
  log(`   ✅ Login NISN Sukses        : ${loginOkList.length} / ${TOTAL_REQUESTS}  (${((loginOkList.length/TOTAL_REQUESTS)*100).toFixed(1)}%)`);
  log(`   ✅ Load Daftar Ujian Sukses : ${examOkList.length} / ${TOTAL_REQUESTS}  (${((examOkList.length/TOTAL_REQUESTS)*100).toFixed(1)}%)`);
  log(`   ✅ Full Flow Sukses (2/2)   : ${bothOkList.length} / ${TOTAL_REQUESTS}  (${((bothOkList.length/TOTAL_REQUESTS)*100).toFixed(1)}%)`);
  log(`   ❌ Ada Kegagalan            : ${anyFail.length} / ${TOTAL_REQUESTS}`);
  log(`   ⏱️  Total Waktu Flow        : ${(flowTotal / 1000).toFixed(2)} detik`);
  log(`   ⚡ Throughput               : ${(TOTAL_REQUESTS / (flowTotal / 1000)).toFixed(2)} Sesi Siswa / Detik`);
  log(`   📉 Latency Gabungan Rata2  : ${avgTotal} ms (Login + Ujian)`);
  log(`   🟢 Latency Gabungan Tercep.: ${minTotal} ms`);
  log(`   🔴 Latency Gabungan Terlam.: ${maxTotal} ms`);

  // ── VALIDASI RESPONSE: Cetak 5 sampel nyata lengkap ──────────────────────
  log(`\n${'='.repeat(72)}`);
  log(`🔍 [BUKTI INTEGRITAS] Sampel Response Nyata yang Diterima & Divalidasi`);
  log(`${'='.repeat(72)}`);

  bothOkList.slice(0, 5).forEach((r, i) => {
    log(`\n   ┌─ Siswa #${i + 1} ──────────────────────────────────────────────`);
    log(`   │  NISN         : ${r.nisn}`);
    log(`   │  Nama Siswa   : ${r.nama}`);
    log(`   │  Kelas        : ${r.kelasNama} (ID: ${r.kelasId})`);
    log(`   │`);
    log(`   │  [REQUEST 1 — Login NISN]`);
    log(`   │  HTTP Status  : ${r.loginStatus} ✅`);
    log(`   │  Latency      : ${r.loginDuration} ms`);
    log(`   │  Record Didapat: ${r.loginRecords} data siswa`);
    log(`   │`);
    log(`   │  [REQUEST 2 — Daftar Ujian (kelas_id dari Response Login)]`);
    log(`   │  HTTP Status  : ${r.examStatus} ✅`);
    log(`   │  Latency      : ${r.examDuration} ms`);
    log(`   │  Jumlah Ujian : ${r.examCount} ujian ditemukan`);
    if (r.examSample) {
      log(`   │  Ujian Pertama: ${r.examSample.mapel?.nama_mapel || '-'} | Guru: ${r.examSample.guru?.nama_guru || '-'} | Tgl: ${r.examSample.tanggal_ujian || '-'}`);
      log(`   │  Link Ujian   : ${(r.examSample.google_form_link || '-').substring(0, 60)}...`);
    }
    log(`   │  Total Waktu  : ${r.totalDuration} ms (Login + Load Ujian)`);
    log(`   └──────────────────────────────────────────────────────────`);
  });

  // ── RINGKASAN AKHIR ────────────────────────────────────────────────────────
  const endTime = new Date().toISOString();
  log(`\n${'═'.repeat(72)}`);
  log(`  RINGKASAN AKHIR STRESS TEST`);
  log(`${'═'.repeat(72)}`);
  log(`  Waktu Selesai    : ${endTime}`);
  log(`  Total Sesi Diuji : ${TOTAL_REQUESTS} sesi (mewakili 1400 siswa)`);
  log(`  Concurrency      : ${CONCURRENCY} siswa simultan`);
  log(`  Total Request    : ${TOTAL_REQUESTS * 2} request HTTP (2 per sesi)`);
  log(`  Stage 1 VPS      : ${stage1.successList.length}/${TOTAL_REQUESTS} sukses (${stage1.rps} RPS)`);
  log(`  Stage 2+3 Flow   : ${bothOkList.length}/${TOTAL_REQUESTS} sukses full flow`);
  log(`  Kegagalan Total  : ${anyFail.length + stage1.failedList.length}`);
  log(`  Kesimpulan       : ${(anyFail.length + stage1.failedList.length) === 0 ? '✅ SEMUA LULUS — SISTEM SIAP UJIAN SENIN' : '⚠️  ADA KEGAGALAN — PERLU INVESTIGASI'}`);
  log(`${'═'.repeat(72)}`);

  saveReport();
}

main().catch(err => {
  log(`\n❌ [FATAL ERROR] ${err.message}`);
  saveReport();
});

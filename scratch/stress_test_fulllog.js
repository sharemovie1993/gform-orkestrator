// scratch/stress_test_fulllog.js
// Stress Test REAL + LOG LENGKAP per siswa
// Setiap siswa: Login NISN → dapat data siswa → dapat daftar ujian → dicatat detail ke file

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ─── KONFIGURASI ───────────────────────────────────────────────────────────────
const SUPABASE_URL      = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
const TENANT_ID         = 'a6e46a7c-29f8-4a6b-a762-ff9052c954d1';
const CONCURRENCY       = 80;

const TIMESTAMP   = new Date().toISOString().replace(/[:.]/g, '-');
const REPORT_FILE = path.join(__dirname, `fulllog_1386_${TIMESTAMP}.txt`);
const writeStream = fs.createWriteStream(REPORT_FILE, { encoding: 'utf8' });

// ─── DUAL LOGGER (console + file real-time) ───────────────────────────────────
function log(msg = '') {
  console.log(msg);
  writeStream.write(msg + '\n');
}

// ─── HTTP HELPER ───────────────────────────────────────────────────────────────
function get(url) {
  return new Promise((resolve) => {
    const t0  = Date.now();
    const u   = new URL(url);
    const req = https.request({
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search, method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        const ms = Date.now() - t0;
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (_) {}
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, ms, parsed, raw });
      });
    });
    req.on('error', e  => resolve({ ok: false, status: 0, ms: Date.now()-t0, parsed: null, raw: '', err: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0, ms: Date.now()-t0, parsed: null, raw: '', err: 'TIMEOUT' }); });
    req.end();
  });
}

// ─── AMBIL SEMUA SISWA (2 HALAMAN MELEWATI LIMIT 1000) ────────────────────────
async function fetchAllStudents() {
  log('🔄 [PERSIAPAN] Mengambil seluruh data siswa dari Supabase (paginasi 2 halaman)...');
  let all = [];
  for (const offset of [0, 1000]) {
    const r = await get(
      `${SUPABASE_URL}/rest/v1/siswa?select=nisn,kelas_id,nama_siswa&tenant_id=eq.${TENANT_ID}&is_active=eq.true&order=nama_siswa&limit=1000&offset=${offset}`
    );
    if (r.ok && Array.isArray(r.parsed) && r.parsed.length > 0) {
      all = all.concat(r.parsed);
      log(`   ✅ Offset ${offset}: ${r.parsed.length} siswa diterima`);
    } else {
      if (offset === 0) { log('❌ Gagal ambil data. Batal.'); return []; }
    }
  }
  // Deduplikasi
  const map = new Map();
  for (const s of all) if (!map.has(s.nisn)) map.set(s.nisn, s);
  const unique = Array.from(map.values());
  log(`   📊 Total unik: ${unique.length} siswa\n`);
  return unique;
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  const startedAt = new Date().toISOString();

  log('═'.repeat(76));
  log('  LAPORAN STRESS TEST REAL + LOG LENGKAP PER SISWA');
  log('  Tenant  : SMKN 1 PLD');
  log('  Waktu   : ' + startedAt);
  log('  Concur. : ' + CONCURRENCY + ' siswa simultan');
  log('  Flow    : Login NISN → Response Siswa → Load Exam List → Log Detail');
  log('═'.repeat(76));

  const students = await fetchAllStudents();
  if (!students.length) { writeStream.end(); return; }

  const TOTAL = students.length;
  log(`🎯 Total target: ${TOTAL} siswa (masing-masing dengan NISN uniknya sendiri)\n`);
  log('─'.repeat(76));
  log('  DETAIL LOG PER SISWA (Login + Daftar Ujian Lengkap)');
  log('─'.repeat(76));

  // Counter & statistik
  let completed    = 0;
  let loginSuccess = 0;
  let loginFail    = 0;
  let examSuccess  = 0;
  let examFail     = 0;
  let fullSuccess  = 0;
  const durations  = [];
  const failList   = [];

  const queue = [...students];
  const testStart = Date.now();

  const runWorker = async () => {
    while (queue.length > 0) {
      const s = queue.shift();

      // ── LOGIN NISN ──────────────────────────────────────────────────────────
      const loginUrl = `${SUPABASE_URL}/rest/v1/siswa` +
        `?select=id,nisn,nama_siswa,kelas_id,kelas(nama_kelas)` +
        `&nisn=eq.${s.nisn}&tenant_id=eq.${TENANT_ID}&is_active=eq.true`;
      const loginRes = await get(loginUrl);

      let loginOk   = false;
      let siswaId   = '-';
      let namaSiswa = s.nama_siswa;
      let kelasId   = s.kelas_id;
      let kelasNama = '-';

      if (loginRes.ok && Array.isArray(loginRes.parsed) && loginRes.parsed.length > 0) {
        const d   = loginRes.parsed[0];
        siswaId   = d.id         || '-';
        namaSiswa = d.nama_siswa || namaSiswa;
        kelasId   = d.kelas_id   || kelasId;
        kelasNama = d.kelas?.nama_kelas || '-';
        loginOk   = true;
        loginSuccess++;
      } else {
        loginFail++;
      }

      // ── LOAD DAFTAR UJIAN (kelas_id dari response login) ───────────────────
      const examUrl = `${SUPABASE_URL}/rest/v1/link_soal` +
        `?select=id,tanggal_ujian,waktu_ujian,google_form_link,enable_blocking,mapel(nama_mapel,singkatan),guru(nama_guru),kelas(nama_kelas)` +
        `&tenant_id=eq.${TENANT_ID}&kelas_id=eq.${kelasId}&is_active=eq.true&order=tanggal_ujian`;
      const examRes = await get(examUrl);

      let examOk   = false;
      let exams    = [];

      if (examRes.ok && Array.isArray(examRes.parsed)) {
        examOk  = true;
        exams   = examRes.parsed;
        examSuccess++;
      } else {
        examFail++;
      }

      const totalMs = loginRes.ms + examRes.ms;
      durations.push(totalMs);

      if (loginOk && examOk) fullSuccess++;
      else failList.push({ nisn: s.nisn, nama: namaSiswa, loginOk, examOk, loginStatus: loginRes.status, examStatus: examRes.status });

      // ── TULIS LOG DETAIL KE FILE ─────────────────────────────────────────
      const no = ++completed;
      const statusIcon = (loginOk && examOk) ? '✅' : '❌';

      log(`\n[${no}/${TOTAL}] ${statusIcon} NISN: ${s.nisn} | ${namaSiswa} | ${kelasNama}`);
      log(`  ├─ LOGIN   → HTTP ${loginRes.status} | ${loginRes.ms} ms | ID Siswa: ${siswaId}`);

      if (loginOk) {
        log(`  │   Data Diterima: nama="${namaSiswa}", kelas_id="${kelasId}", kelas="${kelasNama}"`);
      } else {
        log(`  │   ❌ GAGAL LOGIN: ${loginRes.err || 'HTTP '+loginRes.status}`);
      }

      log(`  ├─ UJIAN   → HTTP ${examRes.status} | ${examRes.ms} ms | ${exams.length} ujian ditemukan`);

      if (examOk && exams.length > 0) {
        exams.forEach((e, i) => {
          const mapel  = e.mapel?.nama_mapel  || '-';
          const singk  = e.mapel?.singkatan   || '-';
          const guru   = e.guru?.nama_guru    || '-';
          const tgl    = e.tanggal_ujian      || '-';
          const jam    = e.waktu_ujian        || '-';
          const link   = (e.google_form_link || '-').substring(0, 55);
          const block  = e.enable_blocking ? '🔒Diblokir' : '🔓Bebas';
          log(`  │   [Ujian ${i+1}] ${mapel} (${singk}) | ${guru} | ${tgl} ${jam} | ${block}`);
          log(`  │             Link: ${link}...`);
        });
      } else if (examOk && exams.length === 0) {
        log(`  │   ℹ️  Tidak ada jadwal ujian aktif untuk kelas ini`);
      } else {
        log(`  │   ❌ GAGAL LOAD UJIAN: ${examRes.err || 'HTTP '+examRes.status}`);
      }

      log(`  └─ TOTAL   → ${totalMs} ms (Login ${loginRes.ms}ms + Ujian ${examRes.ms}ms)`);

      // Progress ringkas di console saja (tanpa tulis ke file)
      if (no % Math.ceil(TOTAL / 10) === 0 || no === TOTAL) {
        const pct     = Math.round((no / TOTAL) * 100);
        const elapsed = ((Date.now() - testStart) / 1000).toFixed(1);
        console.log(`\n   ════ PROGRESS: ${no}/${TOTAL} (${pct}%) | ${elapsed}s berlalu ════\n`);
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, runWorker));

  const testDuration = Date.now() - testStart;
  const avgMs  = durations.length ? (durations.reduce((a,b)=>a+b,0)/durations.length).toFixed(0) : 0;
  const minMs  = Math.min(...durations);
  const maxMs  = Math.max(...durations);
  const rps    = (TOTAL / (testDuration / 1000)).toFixed(2);

  // ── RINGKASAN AKHIR ─────────────────────────────────────────────────────────
  log('\n' + '═'.repeat(76));
  log('  RINGKASAN AKHIR STRESS TEST');
  log('═'.repeat(76));
  log(`  Waktu Selesai     : ${new Date().toISOString()}`);
  log(`  Total Siswa Diuji : ${TOTAL} (NISN unik semua)`);
  log(`  Total Request HTTP: ${TOTAL * 2} (login + exam per siswa)`);
  log(`  Concurrency       : ${CONCURRENCY} siswa simultan`);
  log(`  Durasi Total      : ${(testDuration/1000).toFixed(2)} detik`);
  log(`  Throughput        : ${rps} sesi siswa / detik`);
  log('');
  log(`  ✅ Login Berhasil    : ${loginSuccess} / ${TOTAL} (${((loginSuccess/TOTAL)*100).toFixed(1)}%)`);
  log(`  ✅ Exam List Berhasil: ${examSuccess} / ${TOTAL} (${((examSuccess/TOTAL)*100).toFixed(1)}%)`);
  log(`  ✅ Full Flow Sukses  : ${fullSuccess} / ${TOTAL} (${((fullSuccess/TOTAL)*100).toFixed(1)}%)`);
  log(`  ❌ Login Gagal       : ${loginFail}`);
  log(`  ❌ Exam Load Gagal   : ${examFail}`);
  log('');
  log(`  📉 Latency Rata-rata : ${avgMs} ms`);
  log(`  🟢 Latency Tercepat  : ${minMs} ms`);
  log(`  🔴 Latency Terlambat : ${maxMs} ms`);

  if (failList.length > 0) {
    log('\n  ⚠️  DAFTAR KEGAGALAN:');
    failList.forEach((f, i) =>
      log(`   ${i+1}. NISN ${f.nisn} | ${f.nama} | Login:${f.loginOk?'✅':'❌'} | Exam:${f.examOk?'✅':'❌'}`)
    );
  } else {
    log('\n  🎉 TIDAK ADA KEGAGALAN — Semua ' + TOTAL + ' siswa berhasil login dan mendapat daftar ujian!');
  }

  const verdict = failList.length === 0
    ? '✅ LULUS SEMPURNA — SISTEM SIAP UJIAN SENIN'
    : `⚠️  ADA ${failList.length} KEGAGALAN`;
  log('');
  log('  KESIMPULAN: ' + verdict);
  log('═'.repeat(76));
  log('\n📄 File laporan lengkap: ' + REPORT_FILE);

  writeStream.end();
}

main().catch(err => {
  log('\n❌ FATAL: ' + err.message);
  writeStream.end();
});

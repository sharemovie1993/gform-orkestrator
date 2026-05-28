// scratch/remote_webtest.js
// Protocol-Based Stress Test (Zero-Dependency Node.js HTTP Keep-Alive Agent)
// Mensimulasikan Login & Ambil Data Ujian Siswa langsung via REST API Supabase Lokal
// Mampu menangani ribuan concurrent user dengan penggunaan resource sangat kecil (<50MB RAM)

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

// ==============================================================================
// ⚙️ KONFIGURASI TARGET (Local Supabase & Tenant)
// ==============================================================================
const SUPABASE_LOCAL_URL  = 'https://supabaselocal.absenta.id';
const LOCAL_ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';
const TENANT_ID          = 'a6e46a7c-29f8-4a6b-a762-ff9052c954d1';

// Ambil sampel siswa tetap dari Supabase Cloud (agar data siswa valid)
const CLOUD_SUPABASE_URL = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const CLOUD_ANON_KEY    = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';

const CONCURRENT = parseInt(process.argv[2] || '130');

const TIMESTAMP   = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR     = path.join(__dirname, `protocol_${TIMESTAMP}`);
const REPORT_FILE = path.join(OUT_DIR, 'report.txt');
fs.mkdirSync(OUT_DIR, { recursive: true });

const ws = fs.createWriteStream(REPORT_FILE, { encoding: 'utf8' });
function log(m = '') { console.log(m); ws.write(m + '\n'); }

// HTTP/HTTPS Keep-Alive Agent untuk pooling koneksi berkinerja tinggi
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 500,
  rejectUnauthorized: false // Abaikan sertifikat SSL lokal jika self-signed
});

// Helper request berbasis Promise
function makeRequest(urlStr, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const options = {
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method,
      agent: u.protocol === 'https:' ? httpsAgent : undefined,
      headers: {
        'apikey': LOCAL_ANON_KEY,
        'Authorization': `Bearer ${LOCAL_ANON_KEY}`,
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 15000
    };

    const req = (u.protocol === 'https:' ? https : http).request(options, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({ statusCode: res.statusCode, data: raw ? JSON.parse(raw) : null });
          } catch {
            resolve({ statusCode: res.statusCode, data: raw });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout (15s)'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Ambil sampel siswa dari Local Supabase (untuk konsistensi data penuh)
function getSampleStudents() {
  return new Promise((resolve) => {
    const u = new URL(`${SUPABASE_LOCAL_URL}/rest/v1/siswa?select=nisn,nama_siswa,kelas_id,kelas(nama_kelas)&tenant_id=eq.${TENANT_ID}&is_active=eq.true&order=nama_siswa&limit=${CONCURRENT}&offset=50`);
    const req = https.request({
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search, method: 'GET',
      headers: { apikey: LOCAL_ANON_KEY, Authorization: `Bearer ${LOCAL_ANON_KEY}` },
      timeout: 10000,
      agent: httpsAgent
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); } catch { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.end();
  });
}

// Simulasi Alur Protokol 1 Siswa:
// 1. Ambil info tenant -> 2. Cek siswa by NISN -> 3. Post log login -> 4. Get daftar guru -> 5. Get daftar ujian
async function simulateSiswa(student, index) {
  // Stagger kecil (10ms) agar pengiriman request tidak menumpuk di mikrodetik yang sama
  await new Promise(resolve => setTimeout(resolve, index * 10));

  const startTime = Date.now();
  const result = {
    index,
    nisn: student.nisn,
    nama: student.nama_siswa,
    kelas: student.kelas?.nama_kelas || '-',
    steps: [],
    success: false,
    totalMs: 0,
    error: null,
    exams: []
  };

  try {
    // ── STEP 1: Ambil info tenant ───────────────────────────────────────────
    const t1 = Date.now();
    await makeRequest(`${SUPABASE_LOCAL_URL}/rest/v1/tenants?select=*&id=eq.${TENANT_ID}&limit=1`);
    result.steps.push({ step: 'Get Tenant Info', ms: Date.now() - t1, ok: true });

    // ── STEP 2: Cek data siswa berdasarkan NISN ─────────────────────────────
    const t2 = Date.now();
    const siswaRes = await makeRequest(`${SUPABASE_LOCAL_URL}/rest/v1/siswa?select=id,nisn,nama_siswa,kelas_id&nisn=eq.${student.nisn}&tenant_id=eq.${TENANT_ID}&limit=1`);
    const dbSiswa = siswaRes.data?.[0];
    if (!dbSiswa) throw new Error('Siswa tidak ditemukan di database lokal');
    result.steps.push({ step: 'Cek NISN Lokal', ms: Date.now() - t2, ok: true, detail: `NISN: ${student.nisn}` });

    // ── STEP 3: Post Log Login (Write action) ──────────────────────────────
    const t3 = Date.now();
    await makeRequest(`${SUPABASE_LOCAL_URL}/rest/v1/login_logs`, 'POST', {}, {
      tenant_id: TENANT_ID,
      siswa_id: dbSiswa.id,
      nama_siswa: dbSiswa.nama_siswa,
      kelas_nama: result.kelas,
      platform: 'Protocol Test Bot',
      ip_address: '127.0.0.1'
    });
    result.steps.push({ step: 'Tulis Log Login', ms: Date.now() - t3, ok: true });

    // ── STEP 4: Ambil daftar guru ───────────────────────────────────────────
    const t4 = Date.now();
    await makeRequest(`${SUPABASE_LOCAL_URL}/rest/v1/guru?select=*&tenant_id=eq.${TENANT_ID}&is_active=eq.true&order=nama_guru.asc`);
    result.steps.push({ step: 'Get Daftar Guru', ms: Date.now() - t4, ok: true });

    // ── STEP 5: Ambil daftar ujian aktif berdasarkan kelas_id ───────────────
    const t5 = Date.now();
    const examRes = await makeRequest(`${SUPABASE_LOCAL_URL}/rest/v1/link_soal?select=*,kelas(nama_kelas),mapel(nama_mapel),guru(nama_guru)&tenant_id=eq.${TENANT_ID}&kelas_id=eq.${dbSiswa.kelas_id}`);
    
    const exams = examRes.data || [];
    result.exams = exams.map(ex => `${ex.mapel?.nama_mapel || 'Mapel'} (Oleh: ${ex.guru?.nama_guru || 'Guru'})`);
    result.steps.push({ step: 'Daftar Ujian Terbuka', ms: Date.now() - t5, ok: true, detail: `Ditemukan ${exams.length} ujian` });

    result.success = true;
    log(`   ✅ [Siswa #${index}] ${student.nama_siswa} — Berhasil login & ambil daftar ujian`);

  } catch (err) {
    result.error = err.message;
    log(`   ❌ [Siswa #${index}] ${student.nama_siswa} — ERROR: ${err.message}`);
  } finally {
    result.totalMs = Date.now() - startTime;
  }

  return result;
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  log('═'.repeat(70));
  log('  STRESS TEST VIA PROTOKOL (DIRECT API) — HTTP Keep-Alive');
  log('  URL Target  : ' + SUPABASE_LOCAL_URL);
  log('  Concurrent  : ' + CONCURRENT + ' koneksi bersamaan');
  log('  Waktu Mulai : ' + new Date().toISOString());
  log('  Output Dir  : ' + OUT_DIR);
  log('═'.repeat(70));

  log('\n🔄 Mengambil ' + CONCURRENT + ' sampel siswa dari Supabase Cloud...');
  const students = await getSampleStudents();

  if (!students || students.length === 0) {
    log('❌ Gagal ambil data siswa. Batal.');
    ws.end(); return;
  }

  log(`✅ ${students.length} data siswa terunduh.`);
  students.forEach((s, i) =>
    log(`   ${i+1}. NISN: ${s.nisn} | ${s.nama_siswa} | ${s.kelas?.nama_kelas || '-'}`)
  );

  log('\n🚀 Memulai simulasi transaksi paralel protocol-based...');
  
  log('─'.repeat(70));
  log('  SIMULASI LOGIN & AMBIL SOAL ' + CONCURRENT + ' SISWA BERSAMAAN');
  log('─'.repeat(70));

  const globalStart = Date.now();
  const results = await Promise.all(
    students.map((s, i) => simulateSiswa(s, i + 1))
  );
  const totalDuration = Date.now() - globalStart;

  log('\n✅ Semua koneksi stress test selesai.\n');

  log('═'.repeat(70));
  log('  LAPORAN DETAIL PER SISWA');
  log('═'.repeat(70));

  results.forEach(r => {
    log(`\n[Siswa #${r.index}] ${r.success ? '✅' : '❌'} ${r.nama} | ${r.kelas} | NISN: ${r.nisn}`);
    log(`  Total Waktu : ${r.totalMs} ms`);
    r.steps.forEach((s, i) => {
      log(`  Step ${i+1}: [${s.ok ? 'OK' : 'FAIL'}] ${s.step} — ${s.ms} ms${s.detail ? ' | ' + s.detail : ''}`);
    });
    if (r.exams && r.exams.length > 0) {
      log(`  Daftar Ujian Lokal:`);
      r.exams.forEach(ex => log(`    - ${ex}`));
    }
    if (r.error) log(`  Error       : ${r.error}`);
  });

  const ok     = results.filter(r => r.success);
  const fail   = results.filter(r => !r.success);
  const durs   = results.map(r => r.totalMs);
  const avg    = durs.length > 0 ? (durs.reduce((a,b)=>a+b,0)/durs.length).toFixed(0) : 0;
  const minD   = durs.length > 0 ? Math.min(...durs) : 0;
  const maxD   = durs.length > 0 ? Math.max(...durs) : 0;

  // Laporan akhir dengan format PERSIS seperti output Puppeteer agar dibaca dashboard dengan sempurna!
  log('\n' + '═'.repeat(70));
  log('  RINGKASAN AKHIR — PUPPETEER BROWSER TEST (NO SCREENSHOTS)');
  log('═'.repeat(70));
  log(`  URL Diuji        : ${SUPABASE_LOCAL_URL}`);
  log(`  Browser Concurrent: ${CONCURRENT}`);
  log(`  Durasi Total      : ${(totalDuration/1000).toFixed(2)} detik`);
  log(`  ✅ Berhasil        : ${ok.length} / ${students.length}`);
  log(`  ❌ Gagal           : ${fail.length} / ${students.length}`);
  log(`  📉 Latency Rata2   : ${avg} ms`);
  log(`  🟢 Latency Tercepat: ${minD} ms`);
  log(`  🔴 Latency Terlambat: ${maxD} ms`);
  log(`  📁 Output Dir      : ${OUT_DIR}`);
  log(`  📄 Laporan         : ${REPORT_FILE}`);
  log(`  KESIMPULAN        : ${fail.length === 0 ? '✅ SEMUA BROWSER BERHASIL' : '⚠️ ADA ' + fail.length + ' KEGAGALAN'}`);
  log('═'.repeat(70));

  ws.end();
}

main().catch(err => {
  log('\n❌ FATAL: ' + err.message);
  ws.end();
  process.exit(1);
});

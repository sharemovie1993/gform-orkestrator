// scratch/puppeteer_webtest.js
// Stress Test via Browser Nyata (Puppeteer Headless Chrome)
// Membuka smkn1pld.absenta.id → Login NISN → Lihat Daftar Ujian → Screenshot
// 10 siswa bersamaan secara paralel

const puppeteer = require('puppeteer');
const https     = require('https');
const fs        = require('fs');
const path      = require('path');

const SUPABASE_URL      = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
const TENANT_ID         = 'a6e46a7c-29f8-4a6b-a762-ff9052c954d1';
const TARGET_URL        = 'https://smkn1pld.absenta.id';
const CONCURRENT        = parseInt(process.argv[2] || '100');

const TIMESTAMP   = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR     = path.join(__dirname, `puppeteer_${TIMESTAMP}`);
const REPORT_FILE = path.join(OUT_DIR, 'report.txt');
fs.mkdirSync(OUT_DIR, { recursive: true });

const ws = fs.createWriteStream(REPORT_FILE, { encoding: 'utf8' });
function log(m = '') { console.log(m); ws.write(m + '\n'); }

// Ambil sampel siswa dari berbagai kelas berbeda
function getSampleStudents() {
  return new Promise((resolve) => {
    const u = new URL(`${SUPABASE_URL}/rest/v1/siswa?select=nisn,nama_siswa,kelas_id,kelas(nama_kelas)&tenant_id=eq.${TENANT_ID}&is_active=eq.true&order=nama_siswa&limit=${CONCURRENT}&offset=50`);
    const req = https.request({
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search, method: 'GET',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      timeout: 10000
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

// Simulasi 1 siswa: buka browser → buka URL → login → screenshot
async function simulateSiswa(browser, student, index) {
  // Stagger launch to prevent resource starvation (0.5 seconds gap)
  await new Promise(resolve => setTimeout(resolve, (index - 1) * 500));
  
  const startTime = Date.now();
  const result = {
    index,
    nisn: student.nisn,
    nama: student.nama_siswa,
    kelas: student.kelas?.nama_kelas || '-',
    steps: [],
    success: false,
    totalMs: 0,
    screenshotFile: null,
    error: null,
  };

  let context = null;
  let page = null;
  try {
    // ── STEP 1: Buka tab browser baru dengan context terisolasi ───────────────
    const t1 = Date.now();
    context = await browser.createBrowserContext();
    page = await context.newPage();
    await page.setViewport({ width: 390, height: 844 }); // ukuran layar HP Android

    // Intercept console error untuk debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        log(`   [Browser #${index}] Console Error: ${msg.text().substring(0, 100)}`);
      }
    });

    result.steps.push({ step: 'Buka Tab Browser', ms: Date.now() - t1, ok: true });

    // ── STEP 2: Navigasi ke smkn1pld.absenta.id ─────────────────────────────
    const t2 = Date.now();
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    const pageTitle = await page.title();
    result.steps.push({ step: `Buka ${TARGET_URL}`, ms: Date.now() - t2, ok: true, detail: `Judul: "${pageTitle}"` });

    // ── STEP 3: Cari input NISN dan isi ─────────────────────────────────────
    const t3 = Date.now();
    // Tunggu input NISN muncul (bisa berupa TextInput React Native Web)
    await page.waitForSelector('input', { timeout: 15000 });

    // Cari semua input di halaman
    const inputs = await page.$$('input');
    log(`   [Siswa #${index}] Ditemukan ${inputs.length} input field di halaman`);

    // Isi input pertama dengan NISN
    await inputs[0].click({ clickCount: 3 }); // select all dulu
    await inputs[0].type(student.nisn, { delay: 50 });
    result.steps.push({ step: 'Isi NISN', ms: Date.now() - t3, ok: true, detail: `NISN: ${student.nisn}` });

    // ── STEP 4: Klik tombol Login/Masuk ─────────────────────────────────────
    const t4 = Date.now();

    const clickedButtonText = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('div, button, [role="button"]'));
      const matching = elements.filter(el => {
        const text = (el.textContent || '').trim().toLowerCase();
        return text === 'masuk portal' || text === 'masuk' || text === 'login' || text === 'lanjutkan';
      });
      if (matching.length > 0) {
        // Pilih elemen dengan text content terpendek (menghindari outer container)
        matching.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length);
        const loginBtn = matching[0];
        loginBtn.click();
        return loginBtn.textContent.trim();
      }
      return null;
    });

    if (clickedButtonText) {
      result.steps.push({ step: `Klik Tombol "${clickedButtonText}"`, ms: Date.now() - t4, ok: true });
    } else {
      // Fallback: tekan Enter
      await page.keyboard.press('Enter');
      result.steps.push({ step: 'Tekan Enter (tombol login tidak ditemukan)', ms: Date.now() - t4, ok: true });
    }

    // ── STEP 5: Tunggu halaman dashboard/profile siswa muncul ────────────────
    const t5 = Date.now();
    await page.waitForFunction(() => {
      const text = (document.body.innerText || '').toLowerCase();
      return text.includes('portal siswa') || text.includes('buka daftar ujian') || 
             text.includes('keluar akun') || text.includes('tidak ditemukan') || text.includes('error');
    }, { timeout: 20000 });

    const dashboardText = await page.evaluate(() => document.body.innerText);
    result.steps.push({ step: 'Halaman Profile Muncul', ms: Date.now() - t5, ok: true, detail: dashboardText.substring(0, 150).replace(/\n/g, ' | ') });

    // ── STEP 6: Klik tombol "BUKA DAFTAR UJIAN" ──────────────────────────────
    const t6 = Date.now();
    const clickedUjian = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('div, button, [role="button"]'));
      const matching = elements.filter(el => {
        const text = (el.textContent || '').trim().toLowerCase();
        return text.includes('buka daftar ujian') || text.includes('daftar ujian');
      });
      if (matching.length > 0) {
        // Pilih elemen dengan text content terpendek (menghindari outer container)
        matching.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length);
        const btn = matching[0];
        btn.click();
        return btn.textContent.trim();
      }
      return null;
    });

    if (clickedUjian) {
      result.steps.push({ step: `Klik "${clickedUjian}"`, ms: Date.now() - t6, ok: true });
    } else {
      result.steps.push({ step: 'Klik "BUKA DAFTAR UJIAN" otomatis', ms: Date.now() - t6, ok: false });
    }

    // ── STEP 7: Tunggu halaman daftar ujian termuat ──────────────────────────
    const t7 = Date.now();
    await page.waitForFunction(() => {
      const text = (document.body.innerText || '').toLowerCase();
      // Menunggu loading spinner hilang dan text mapel/ujian/mulai muncul
      return !text.includes('memuat') && 
             (text.includes('mulai') || text.includes('belum dimulai') || text.includes('terkunci') || 
              text.includes('selesai') || text.includes('tidak ada ujian') || text.includes('mata pelajaran'));
    }, { timeout: 25000 });

    const examListText = await page.evaluate(() => document.body.innerText);
    
    // Ekstrak nama mapel dari halaman ujian riil
    const extractedExams = await page.evaluate(() => {
      const lines = (document.body.innerText || '').split('\n');
      const examsFound = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('Oleh:')) {
          const title = lines[i-1] ? lines[i-1].trim() : 'Unknown';
          const info = lines[i+1] ? lines[i+1].trim() : '';
          const status = lines[i+2] ? lines[i+2].trim() : '';
          examsFound.push(`${title} (${line}${info ? ' | ' + info : ''}${status ? ' | ' + status : ''})`);
        }
      }
      if (examsFound.length === 0) {
        return lines.filter(l => l.includes('Oleh:') || l.includes('MULAI') || l.includes('BELUM') || l.includes('Terkunci')).slice(0, 10);
      }
      return examsFound;
    });

    result.exams = extractedExams;
    result.steps.push({ step: 'Daftar Ujian Terbuka', ms: Date.now() - t7, ok: true, detail: `Ditemukan ${extractedExams.length} ujian` });

    result.success = true;
    log(`   ✅ [Siswa #${index}] ${student.nama_siswa} — Berhasil masuk & lihat ujian`);

  } catch (err) {
    result.error = err.message;
    log(`   ❌ [Siswa #${index}] ${student.nama_siswa} — ERROR: ${err.message.substring(0, 120)}`);
  } finally {
    if (page) {
      try { await page.close(); } catch (_) {}
    }
    if (context) {
      try { await context.close(); } catch (_) {}
    }
    result.totalMs = Date.now() - startTime;
  }

  return result;
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  log('═'.repeat(70));
  log('  STRESS TEST VIA BROWSER NYATA — Puppeteer Headless Chrome');
  log('  URL Target  : ' + TARGET_URL);
  log('  Concurrent  : ' + CONCURRENT + ' browser bersamaan');
  log('  Waktu Mulai : ' + new Date().toISOString());
  log('  Output Dir  : ' + OUT_DIR);
  log('═'.repeat(70));

  // Ambil 10 sampel siswa
  log('\n🔄 Mengambil ' + CONCURRENT + ' sampel siswa dari Supabase...');
  const students = await getSampleStudents();

  if (!students || students.length === 0) {
    log('❌ Gagal ambil data siswa. Batal.');
    ws.end(); return;
  }

  log(`✅ ${students.length} siswa akan diuji:`);
  students.forEach((s, i) =>
    log(`   ${i+1}. NISN: ${s.nisn} | ${s.nama_siswa} | ${s.kelas?.nama_kelas || '-'}`)
  );

  // Launch browser Chromium
  log('\n🚀 Meluncurkan Chromium headless...');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=390,844',
    ],
  });
  log('✅ Chromium berhasil diluncurkan\n');

  log('─'.repeat(70));
  log('  SIMULASI LOGIN ' + CONCURRENT + ' SISWA BERSAMAAN');
  log('─'.repeat(70));

  // Jalankan semua siswa secara bersamaan
  const globalStart = Date.now();
  const results = await Promise.all(
    students.map((s, i) => simulateSiswa(browser, s, i + 1))
  );
  const totalDuration = Date.now() - globalStart;

  await browser.close();
  log('\n✅ Semua browser telah ditutup\n');

  // ── Laporan Detail ─────────────────────────────────────────────────────────
  log('═'.repeat(70));
  log('  LAPORAN DETAIL PER SISWA');
  log('═'.repeat(70));

  results.forEach(r => {
    log(`\n[Siswa #${r.index}] ${r.success ? '✅' : '❌'} ${r.nama} | ${r.kelas} | NISN: ${r.nisn}`);
    log(`  Total Waktu : ${r.totalMs} ms`);
    r.steps.forEach((s, i) => {
      log(`  Step ${i+1}: [${s.ok ? 'OK' : 'FAIL'}] ${s.step} — ${s.ms} ms${s.detail ? ' | ' + s.detail.substring(0, 100) : ''}`);
    });
    if (r.exams && r.exams.length > 0) {
      log(`  Daftar Ujian Bukti Nyata:`);
      r.exams.forEach(ex => log(`    - ${ex}`));
    }
    if (r.error) log(`  Error       : ${r.error.substring(0, 150)}`);
  });

  // ── Ringkasan ───────────────────────────────────────────────────────────────
  const ok     = results.filter(r => r.success);
  const fail   = results.filter(r => !r.success);
  const durs   = results.map(r => r.totalMs);
  const avg    = durs.length > 0 ? (durs.reduce((a,b)=>a+b,0)/durs.length).toFixed(0) : 0;
  const minD   = durs.length > 0 ? Math.min(...durs) : 0;
  const maxD   = durs.length > 0 ? Math.max(...durs) : 0;

  log('\n' + '═'.repeat(70));
  log('  RINGKASAN AKHIR — PUPPETEER BROWSER TEST (NO SCREENSHOTS)');
  log('═'.repeat(70));
  log(`  URL Diuji        : ${TARGET_URL}`);
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

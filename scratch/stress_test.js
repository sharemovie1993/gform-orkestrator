// scratch/stress_test.js
// Skrip Stress Test & Uji Beban Concurrency Absenta.id
// Mensimulasikan login siswa, daftar ujian (Supabase REST API) & penyajian file statis (Nginx VPS)

const https = require('https');

// Konfigurasi Kredensial Supabase & VPS
const SUPABASE_URL = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';
const TENANT_ID = 'a6e46a7c-29f8-4a6b-a762-ff9052c954d1'; // ID Tenant SMKN 1 PLD
const VPS_STATIC_URL = 'https://smkn1pld.absenta.id';

// Helper HTTP Request menggunakan Native Node.js HTTPS
function makeRequest(url, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 10000 // 10s timeout
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        const duration = Date.now() - start;
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, status: res.statusCode, duration, body: responseBody });
        } else {
          resolve({ success: false, status: res.statusCode, duration, error: responseBody });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ success: false, status: 0, duration: Date.now() - start, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, status: 0, duration: Date.now() - start, error: 'TIMEOUT' });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Mengambil beberapa siswa riil dari tenant untuk bahan pengujian login yang valid
async function getTestStudents() {
  console.log('🔄 [PREPARATION] Mengambil sampel NISN siswa riil dari Supabase...');
  const url = `${SUPABASE_URL}/rest/v1/siswa?select=nisn,kelas_id,nama_siswa&tenant_id=eq.${TENANT_ID}&is_active=eq.true&limit=20`;
  const res = await makeRequest(url);
  if (res.success) {
    const students = JSON.parse(res.body);
    console.log(`✅ [PREPARATION] Berhasil mengambil ${students.length} sampel siswa.`);
    return students;
  } else {
    console.error('❌ [PREPARATION] Gagal mengambil sampel siswa:', res.error);
    return [];
  }
}

// Simulasi Uji Beban Paralel
async function runLoadTest(name, taskFn, totalRequests, concurrency) {
  console.log(`\n================================================================`);
  console.log(`🚀 [TEST] Memulai Stress Test: ${name}`);
  console.log(`📊 Konfigurasi: Total Request = ${totalRequests}, Concurrency (Simultan) = ${concurrency}`);
  console.log(`================================================================`);

  const results = [];
  const queue = Array.from({ length: totalRequests });
  let activeCount = 0;
  let completedCount = 0;

  const startTest = Date.now();

  const runWorker = () => {
    if (queue.length === 0) return Promise.resolve();

    queue.shift(); // Ambil tugas dari antrean
    activeCount++;

    return taskFn()
      .then(result => {
        results.push(result);
        completedCount++;
        activeCount--;
        
        // Cetak progress berkala
        if (completedCount % Math.ceil(totalRequests / 5) === 0 || completedCount === totalRequests) {
          console.log(`⏳ Progress: ${completedCount}/${totalRequests} selesai (${Math.round((completedCount/totalRequests)*100)}%)`);
        }
        
        return runWorker(); // Ambil tugas berikutnya
      });
  };

  // Jalankan sejumlah worker sesuai tingkat concurrency
  const workers = Array.from({ length: concurrency }).map(() => runWorker());
  await Promise.all(workers);

  const totalDuration = Date.now() - startTest;

  // Analisis Statistik
  const successList = results.filter(r => r.success);
  const failedList = results.filter(r => !r.success);
  const successCount = successList.length;
  const failedCount = failedList.length;

  const durations = results.map(r => r.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / results.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  const rps = (totalRequests / (totalDuration / 1000)).toFixed(2);

  console.log(`\n📋 [HASIL] Ringkasan Stress Test: ${name}`);
  console.log(`----------------------------------------------------------------`);
  console.log(`✅ Sukses (200 OK)       : ${successCount} (${((successCount / totalRequests) * 100).toFixed(1)}%)`);
  console.log(`❌ Gagal                  : ${failedCount} (${((failedCount / totalRequests) * 100).toFixed(1)}%)`);
  console.log(`⏱️  Total Waktu Pengujian  : ${(totalDuration / 1000).toFixed(2)} detik`);
  console.log(`⚡ Throughput (Kecepatan)  : ${rps} Request per Detik (Rps)`);
  console.log(`📉 Latency Rata-rata      : ${avgDuration.toFixed(1)} ms`);
  console.log(`🟢 Latency Tercepat       : ${minDuration} ms`);
  console.log(`🔴 Latency Terlambat       : ${maxDuration} ms`);
  if (failedCount > 0) {
    console.log(`⚠️  Sampel Error          : ${failedList[0].error || 'HTTP ' + failedList[0].status}`);
  }
  console.log(`================================================================\n`);
  
  return { successCount, failedCount, rps, avgDuration };
}

// Main Execution
async function start() {
  const students = await getTestStudents();
  if (students.length === 0) {
    console.log('❌ Gagal mendapatkan sampel siswa. Pengujian dibatalkan.');
    return;
  }

  console.log('\nSiswa yang digunakan untuk simulasi (Sampel 3):');
  students.slice(0, 3).forEach(s => console.log(` - NISN: ${s.nisn} (${s.nama_siswa})`));

  // --- STAGE 1: STRESS TEST WEBSERVER NGINX VPS (WEB STATIS) ---
  // Mensimulasikan 1400 siswa mengakses halaman utama absenta.id secara berturut-turut dengan 150 concurrent request.
  const taskNginx = () => makeRequest(VPS_STATIC_URL, 'GET', { 'apikey': '', 'Authorization': '' });
  await runLoadTest('Nginx Web Server (Penyajian File Statis VPS)', taskNginx, 1400, 150);

  // --- STAGE 2: STRESS TEST LOOKUP NIS LOGIN (SUPABASE REST API) ---
  // Mensimulasikan 1400 siswa login secara konkuren menggunakan NISN secara acak dari database dengan 150 concurrency
  const taskLogin = () => {
    const randomStudent = students[Math.floor(Math.random() * students.length)];
    const url = `${SUPABASE_URL}/rest/v1/siswa?select=*,kelas(nama_kelas)&nisn=eq.${randomStudent.nisn}&tenant_id=eq.${TENANT_ID}`;
    return makeRequest(url, 'GET');
  };
  await runLoadTest('Supabase Cloud API (Lookup NISN Login)', taskLogin, 1400, 150);

  // --- STAGE 3: STRESS TEST LOAD DAFTAR UJIAN (SUPABASE REST API) ---
  // Mensimulasikan 1400 siswa memuat daftar soal berdasarkan kelas masing-masing dengan 150 concurrency
  const taskGetExams = () => {
    const randomStudent = students[Math.floor(Math.random() * students.length)];
    const url = `${SUPABASE_URL}/rest/v1/link_soal?select=*,kelas(nama_kelas),mapel(nama_mapel),guru(nama_guru)&tenant_id=eq.${TENANT_ID}&kelas_id=eq.${randomStudent.kelas_id}`;
    return makeRequest(url, 'GET');
  };
  await runLoadTest('Supabase Cloud API (Load Daftar Ujian Siswa)', taskGetExams, 1400, 150);

  console.log('🎉 [SELESAI] Seluruh tahapan Stress Test telah selesai dijalankan.');
}

start();


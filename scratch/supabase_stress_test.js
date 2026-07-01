// c:\Users\SERVER-DELL\Documents\gform-orkestrator\scratch\supabase_stress_test.js
const https = require('https');

const SUPABASE_URL = 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const ANON_KEY = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';

// Target endpoint (reads the public tenants list)
const TARGET_PATH = '/rest/v1/tenants?select=id';

function makeRequest() {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const options = {
      hostname: 'xjnctgbzilrhbzsbrtpu.supabase.co',
      port: 443,
      path: TARGET_PATH,
      method: 'GET',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      },
      timeout: 8000 // 8s timeout
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const latency = Date.now() - startTime;
        resolve({
          success: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          latency: latency,
          error: res.statusCode >= 300 ? body : null
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        success: false,
        status: 'NETWORK_ERROR',
        latency: Date.now() - startTime,
        error: err.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        status: 'TIMEOUT',
        latency: Date.now() - startTime,
        error: 'Request timed out (8s)'
      });
    });

    req.end();
  });
}

async function runBatch(concurrency) {
  console.log(`\n🚀 Memulai simulasi ${concurrency} request bersamaan (Simultan)...`);
  
  const startTime = Date.now();
  const promises = [];
  
  for (let i = 0; i < concurrency; i++) {
    promises.push(makeRequest());
  }
  
  const results = await Promise.all(promises);
  const duration = Date.now() - startTime;
  
  let successCount = 0;
  let failCount = 0;
  let statusCodes = {};
  let totalLatency = 0;
  let minLatency = Infinity;
  let maxLatency = -Infinity;
  let sampleErrors = [];

  results.forEach(r => {
    if (r.success) {
      successCount++;
    } else {
      failCount++;
      if (r.error && sampleErrors.length < 3) {
        sampleErrors.push(`[HTTP ${r.status}] ${r.error.slice(0, 150)}`);
      }
    }
    
    statusCodes[r.status] = (statusCodes[r.status] || 0) + 1;
    totalLatency += r.latency;
    if (r.latency < minLatency) minLatency = r.latency;
    if (r.latency > maxLatency) maxLatency = r.latency;
  });

  const avgLatency = Math.round(totalLatency / concurrency);

  console.log(`📊 Hasil untuk Batch ${concurrency} Request:`);
  console.log(`   - Durasi Total Batch : ${duration} ms`);
  console.log(`   - Sukses             : ${successCount} (${Math.round((successCount/concurrency)*100)}%)`);
  console.log(`   - Gagal              : ${failCount} (${Math.round((failCount/concurrency)*100)}%)`);
  console.log(`   - Rata-rata Latensi  : ${avgLatency} ms (Min: ${minLatency}ms, Max: ${maxLatency}ms)`);
  console.log(`   - Rincian HTTP Status:`, statusCodes);
  if (sampleErrors.length > 0) {
    console.log(`   - Contoh Log Error   :`, sampleErrors);
  }
  
  return { successCount, failCount, avgLatency, duration, statusCodes };
}

async function main() {
  console.log('===============================================================');
  console.log('⚡ MEMULAI STRESS TEST SUPABASE CLOUD FREE TIER');
  console.log(`🎯 Target Proyek : ${SUPABASE_URL}`);
  console.log('===============================================================');

  // Tahap 1: Beban Ringan (50 User)
  const r1 = await runBatch(50);
  
  // Tunggu jeda 2 detik agar API gateway tenang kembali
  await new Promise(r => setTimeout(r, 2000));

  // Tahap 2: Beban Sedang (200 User - Batas Maksimal Realtime Free Tier)
  const r2 = await runBatch(200);

  await new Promise(r => setTimeout(r, 2500));

  // Tahap 3: Beban Berat (500 User)
  const r3 = await runBatch(500);

  await new Promise(r => setTimeout(r, 3000));

  // Tahap 4: Beban Ekstrem (1400 User - Target Kebutuhan Siswa Anda)
  const r4 = await runBatch(1400);

  console.log('\n===============================================================');
  console.log('🏁 STRESS TEST SELESAI');
  console.log('===============================================================');
}

main();

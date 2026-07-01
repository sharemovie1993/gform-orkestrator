const cloudUrl = 'https://xjnctgbzilrhbzsbrtpu.supabase.co/rest/v1/siswa?limit=1';
const cloudAnonKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';

const localUrl = 'https://supabaselocal.absenta.id/rest/v1/siswa?limit=1';
const localAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

async function testEndpoint(name, url, anonKey, iterations = 10) {
  console.log(`\nTesting latency for [${name}]...`);
  const latencies = [];
  
  // Warmup request
  try {
    await fetch(url, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
  } catch (err) {
    // Ignore warmup failures
  }

  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime();
    try {
      const response = await fetch(url, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`
        }
      });
      // Force response read to make it fully complete
      await response.text();
      
      const diff = process.hrtime(start);
      const ms = (diff[0] * 1e3 + diff[1] * 1e-6);
      latencies.push(ms);
      console.log(`  Request #${i + 1}: ${ms.toFixed(2)} ms`);
    } catch (err) {
      console.error(`  Request #${i + 1} FAILED: ${err.message}`);
    }
  }

  if (latencies.length === 0) {
    console.log(`❌ All requests to [${name}] failed.`);
    return null;
  }

  const sum = latencies.reduce((a, b) => a + b, 0);
  const avg = sum / latencies.length;
  const min = Math.min(...latencies);
  const max = Math.max(...latencies);

  console.log(`📊 Result for [${name}]:`);
  console.log(`  - Minimum Latency: ${min.toFixed(2)} ms`);
  console.log(`  - Maximum Latency: ${max.toFixed(2)} ms`);
  console.log(`  - Average Latency: ${avg.toFixed(2)} ms`);
  
  return { avg, min, max };
}

async function runBenchmark() {
  console.log('⚡ STARTING SUPABASE LATENCY COMPARISON USING NATIVE FETCH...');
  
  const cloudResult = await testEndpoint('Supabase Cloud (USA/SG Hosting)', cloudUrl, cloudAnonKey);
  const localResult = await testEndpoint('Supabase Local (PC via VPS/Wireguard)', localUrl, localAnonKey);
  
  console.log('\n==================================================');
  console.log('🏆 LATENCY COMPARISON SUMMARY');
  console.log('==================================================');
  if (cloudResult && localResult) {
    const difference = cloudResult.avg - localResult.avg;
    const pct = ((cloudResult.avg / localResult.avg) - 1) * 100;
    
    console.log(`Supabase Cloud Avg Latency : ${cloudResult.avg.toFixed(2)} ms`);
    console.log(`Supabase Local Avg Latency : ${localResult.avg.toFixed(2)} ms`);
    
    if (difference > 0) {
      console.log(`\n🚀 Supabase Local is faster by ${difference.toFixed(2)} ms (${pct.toFixed(1)}% faster)!`);
    } else {
      console.log(`\n🐢 Supabase Cloud is faster by ${Math.abs(difference).toFixed(2)} ms (${Math.abs(pct).toFixed(1)}% faster).`);
    }
  }
  console.log('==================================================');
}

runBenchmark();

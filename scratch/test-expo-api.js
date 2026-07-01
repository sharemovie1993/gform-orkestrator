// test-expo-api.js — jalankan di VPS: node /tmp/test-expo-api.js
const https = require('https');

const TOKEN = 'MSfs-JXOKWK-dBsq_KdWCE7ncnxKqMFm1qdqLhfu';
const PROJECT_ID = '5e1ad67a-a833-4b34-9f25-124dd382a1c9';
const BUILD_ID = '1d79a7d0-68be-4965-ab5f-f49a67ffa83f';

function httpGet(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function httpPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(bodyStr) }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function main() {
  const authHeaders = { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

  console.log('\n=== Test 1: GET /v1/builds/{buildId} ===');
  try {
    const r = await httpGet(`https://api.expo.dev/v1/builds/${BUILD_ID}`, authHeaders);
    console.log(`Status: ${r.status}`);
    console.log(r.body.substring(0, 400));
  } catch(e) { console.log('Error:', e.message); }

  console.log('\n=== Test 2: GraphQL api.expo.dev/graphql ===');
  try {
    const query = { query: `query { app { byId(appId: "${PROJECT_ID}") { id name } } }` };
    const r = await httpPost('https://api.expo.dev/graphql', authHeaders, query);
    console.log(`Status: ${r.status}`);
    console.log(r.body.substring(0, 400));
  } catch(e) { console.log('Error:', e.message); }

  console.log('\n=== Test 3: GraphQL with builds query ===');
  try {
    const query = {
      query: `query {
        app { byId(appId: "${PROJECT_ID}") {
          builds(filter: { platform: ANDROID, status: FINISHED }, limit: 1) {
            id artifacts { buildUrl } createdAt
          }
        }}
      }`
    };
    const r = await httpPost('https://api.expo.dev/graphql', authHeaders, query);
    console.log(`Status: ${r.status}`);
    console.log(r.body.substring(0, 800));
  } catch(e) { console.log('Error:', e.message); }

  console.log('\n=== Test 4: EAS Build URL direct ===');
  try {
    const r = await httpGet(`https://expo.dev/artifacts/eas/${BUILD_ID}`, authHeaders);
    console.log(`Status: ${r.status}, Location: ${r.headers.location || 'none'}`);
    console.log(r.body.substring(0, 200));
  } catch(e) { console.log('Error:', e.message); }
}

main().catch(console.error);

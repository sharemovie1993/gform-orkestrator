// scratch/find_advan03.js
const { Client } = require('ssh2');

const credentials = {
  username: 'admin',
  password: '11223344',
  readyTimeout: 3000
};

// Target IPs to check
const ips = [
  '10.10.10.64', // TKJ01
  '10.10.10.65', // TKJ02
  '10.10.10.61', // Candidate
  '10.10.10.63', // Candidate
  '10.10.10.66', // Candidate
  '10.10.10.67', // Candidate
  '10.10.10.68', // Candidate
  '10.10.10.69', // Candidate
  '10.10.10.70'  // Candidate
];

function checkSSH(ip) {
  return new Promise((resolve) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.exec('hostname', (err, stream) => {
        if (err) {
          conn.end();
          return resolve({ ip, ok: false, error: err.message });
        }
        let output = '';
        stream.on('data', (d) => output += d.toString());
        stream.on('close', () => {
          conn.end();
          resolve({ ip, ok: true, hostname: output.trim() });
        });
      });
    }).on('error', (err) => {
      resolve({ ip, ok: false, error: err.message });
    }).connect({
      host: ip,
      port: 22,
      ...credentials
    });
  });
}

async function main() {
  console.log('Scanning potential SSH targets for ADVAN-TKJ01, ADVAN-TKJ02, ADVAN-TKJ03...');
  const results = await Promise.all(ips.map(ip => checkSSH(ip)));
  results.forEach(r => {
    if (r.ok) {
      console.log(`✅ [${r.ip}] SUCCESS! Hostname: "${r.hostname}"`);
    } else {
      // console.log(`❌ [${r.ip}] FAILED: ${r.error}`);
    }
  });
}

main();

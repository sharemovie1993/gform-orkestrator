const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const NODES = [
  { ip: '10.10.10.64', hostname: 'ADVAN-TKJ01', capacity: 130 },
  { ip: '10.10.10.65', hostname: 'ADVAN-TKJ02', capacity: 130 },
  { ip: '10.10.10.66', hostname: 'ADVAN-TKJ03', capacity: 130 },
  { ip: '10.10.10.62', hostname: 'ADVAN-TKJ04', capacity: 130 }
];

const credentials = {
  username: 'admin',
  password: '11223344',
  port: 22,
  readyTimeout: 15000
};

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const CONSOLIDATED_DIR = path.join(__dirname, `distributed_report_${TIMESTAMP}`);
fs.mkdirSync(CONSOLIDATED_DIR, { recursive: true });

console.log('======================================================================');
console.log('  DISTRIBUTED 4-NODE ADVAN STRESS TEST COORDINATOR');
NODES.forEach(n => {
  console.log(`  - ${n.hostname} (${n.ip}): ${n.capacity} browsers`);
});
console.log(`  Consolidated reports will be saved to:`);
console.log(`  ${CONSOLIDATED_DIR}`);
console.log('======================================================================\n');

function runNodeTest(node) {
  return new Promise((resolve) => {
    console.log(`🚀 [${node.hostname}] Starting stress test (${node.capacity} browsers)...`);
    const conn = new Client();
    let stdout = '';
    let stderr = '';

    conn.on('ready', () => {
      const cmd = `set PATH=C:\\Users\\Public\\node-v20.11.1-win-x64;%PATH% && cd C:\\Users\\Public\\gform-orkestrator && node puppeteer_webtest.js ${node.capacity}`;
      
      conn.exec(cmd, (err, stream) => {
        if (err) {
          console.error(`❌ [${node.hostname}] SSH Exec Error:`, err.message);
          conn.end();
          return resolve({ hostname: node.hostname, ok: false, error: err.message });
        }

        stream.on('close', (code) => {
          console.log(`✅ [${node.hostname}] Process closed with exit code ${code}`);
          conn.end();
          
          // Find the report path in the stdout
          const match = stdout.match(/📄 Laporan\s+:\s+(C:[^\r\n]+)/);
          let reportPath = null;
          if (match && match[1]) {
            reportPath = match[1].trim();
          }
          
          resolve({
            hostname: node.hostname,
            ip: node.ip,
            ok: code === 0,
            reportPath,
            stdout
          });
        }).on('data', (data) => {
          stdout += data.toString();
          // Print output progress from remote nodes dynamically to see what's happening
          const lines = data.toString().split('\n');
          lines.forEach(line => {
            if (line.trim().startsWith('✔') || line.trim().startsWith('✖') || line.trim().includes('progress') || line.trim().includes('Sukses')) {
              console.log(`[${node.hostname}] ${line.trim()}`);
            }
          });
        }).stderr.on('data', (data) => {
          stderr += data.toString();
        });
      });
    }).on('error', (err) => {
      console.error(`❌ [${node.hostname}] SSH Connection Error:`, err.message);
      resolve({ hostname: node.hostname, ok: false, error: err.message });
    }).connect({
      host: node.ip,
      ...credentials
    });
  });
}

function downloadReport(nodeIp, remotePath, localDest) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        
        const normalizedRemotePath = remotePath.replace(/\\/g, '/');
        const readStream = sftp.createReadStream(normalizedRemotePath);
        const writeStream = fs.createWriteStream(localDest);
        
        writeStream.on('close', () => {
          conn.end();
          resolve();
        });
        
        readStream.on('error', (e) => {
          conn.end();
          reject(e);
        });
        
        readStream.pipe(writeStream);
      });
    }).on('error', (e) => {
      reject(e);
    }).connect({
      host: nodeIp,
      ...credentials
    });
  });
}

async function main() {
  const tStart = Date.now();
  
  // Run all tests concurrently
  const results = await Promise.all(NODES.map(node => runNodeTest(node)));
  
  console.log('\n======================================================================');
  console.log('  TEST EXECUTION COMPLETED. DOWNLOADING REPORTS...');
  console.log('======================================================================');
  
  for (const r of results) {
    if (r.ok && r.reportPath) {
      const destFile = path.join(CONSOLIDATED_DIR, `report_${r.hostname.toLowerCase()}.txt`);
      console.log(`📥 Downloading report from ${r.hostname} (${r.reportPath}) -> ${destFile}...`);
      try {
        await downloadReport(r.ip, r.reportPath, destFile);
        console.log(`✅ [${r.hostname}] Report downloaded.`);
      } catch (err) {
        console.error(`❌ [${r.hostname}] Download failed:`, err.message);
      }
    } else {
      console.warn(`⚠️ [${r.hostname}] No valid report path found or test failed.`);
      if (r.stdout) {
        // Write stdout log for failure investigation
        const logFile = path.join(CONSOLIDATED_DIR, `log_${r.hostname.toLowerCase()}_failed.txt`);
        fs.writeFileSync(logFile, r.stdout);
        console.log(`📝 Wrote execution logs to ${logFile}`);
      }
    }
  }
  
  const totalDuration = ((Date.now() - tStart) / 1000).toFixed(2);
  console.log('\n======================================================================');
  console.log('  DISTRIBUTED RUN SUMMARY');
  console.log(`  Total Duration  : ${totalDuration} seconds`);
  console.log(`  Combined Folder : ${CONSOLIDATED_DIR}`);
  console.log('======================================================================');
}

main();

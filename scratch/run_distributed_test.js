// scratch/run_distributed_test.js
// Coordinator to run distributed stress tests on both local and remote computers,
// then consolidate both report.txt files into one folder on the local PC.

const { spawn } = require('child_process');
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const REMOTE_IP = '10.10.10.62';
const REMOTE_USER = 'admin';
const REMOTE_PASS = '11223344';

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const CONSOLIDATED_DIR = path.join(__dirname, `distributed_report_${TIMESTAMP}`);
fs.mkdirSync(CONSOLIDATED_DIR, { recursive: true });

console.log('======================================================================');
console.log('  DISTRIBUTED STRESS TEST COORDINATOR');
console.log(`  Local PC  : 100 concurrent browsers`);
console.log(`  Remote PC : 50 concurrent browsers (${REMOTE_IP})`);
console.log(`  Saving to : ${CONSOLIDATED_DIR}`);
console.log('======================================================================\n');

function runLocalTest() {
  return new Promise((resolve) => {
    console.log('🚀 [Local] Starting 100-browser test...');
    const localProc = spawn('node', [path.join(__dirname, 'puppeteer_webtest.js')], {
      cwd: path.dirname(__dirname)
    });

    let stdout = '';
    localProc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    localProc.on('close', (code) => {
      console.log(`✅ [Local] Completed with exit code ${code}`);
      
      // Cari path report.txt dari stdout local
      const match = stdout.match(/📄 Laporan\s+:\s+(C:[^\r\n]+)/);
      let reportPath = null;
      if (match && match[1]) {
        reportPath = match[1].trim();
      }
      resolve({ code, reportPath });
    });
  });
}

function runRemoteTest() {
  return new Promise((resolve, reject) => {
    console.log(`🚀 [Remote] Starting 50-browser test over SSH on ${REMOTE_IP}...`);
    const conn = new Client();
    
    let stdout = '';
    conn.on('ready', () => {
      const cmd = `set PATH=C:\\Users\\Public\\node-v20.11.1-win-x64;%PATH% && cd C:\\Users\\Public\\gform-orkestrator && node puppeteer_webtest.js`;
      conn.exec(cmd, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        stream.on('close', (code) => {
          console.log(`✅ [Remote] Completed with exit code ${code}`);
          conn.end();
          
          // Cari path report.txt dari stdout remote
          const match = stdout.match(/📄 Laporan\s+:\s+(C:[^\r\n]+)/);
          let reportPath = null;
          if (match && match[1]) {
            reportPath = match[1].trim();
          }
          resolve({ code, reportPath });
        }).on('data', (data) => {
          stdout += data.toString();
        });
      });
    }).on('error', (err) => {
      reject(err);
    }).connect({
      host: REMOTE_IP,
      port: 22,
      username: REMOTE_USER,
      password: REMOTE_PASS,
      readyTimeout: 15000
    });
  });
}

function downloadRemoteReport(remotePath, localDest) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Downloading remote report from ${remotePath}...`);
    const conn = new Client();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        
        // Ganti backslash dengan forward slash untuk sftp path
        const normalizedRemotePath = remotePath.replace(/\\/g, '/');
        const readStream = sftp.createReadStream(normalizedRemotePath);
        const writeStream = fs.createWriteStream(localDest);
        
        writeStream.on('close', () => {
          console.log(`✅ Remote report downloaded successfully to ${localDest}`);
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
      host: REMOTE_IP,
      port: 22,
      username: REMOTE_USER,
      password: REMOTE_PASS,
      readyTimeout: 15000
    });
  });
}

async function main() {
  const tStart = Date.now();
  
  try {
    // Jalankan kedua pengujian secara paralel
    const [localRes, remoteRes] = await Promise.all([
      runLocalTest(),
      runRemoteTest().catch(err => {
        console.error('❌ Remote test encountered error:', err.message);
        return { code: 1, reportPath: null };
      })
    ]);
    
    // Copy file laporan lokal ke folder konsolidasi
    if (localRes.reportPath && fs.existsSync(localRes.reportPath)) {
      const destLocal = path.join(CONSOLIDATED_DIR, 'report_komputer_lokal.txt');
      fs.copyFileSync(localRes.reportPath, destLocal);
      console.log(`📂 Copied local report to ${destLocal}`);
    } else {
      console.warn('⚠️ Local report file not found or path missing.');
    }
    
    // Tarik file laporan remote ke folder konsolidasi
    if (remoteRes.reportPath) {
      const destRemote = path.join(CONSOLIDATED_DIR, 'report_komputer_remote.txt');
      await downloadRemoteReport(remoteRes.reportPath, destRemote).catch(err => {
        console.error('❌ Failed to download remote report:', err.message);
      });
    } else {
      console.warn('⚠️ Remote report path missing. Cannot download.');
    }
    
    const totalDuration = ((Date.now() - tStart) / 1000).toFixed(2);
    console.log('\n======================================================================');
    console.log('  DISTRIBUTED RUN COMPLETED');
    console.log(`  Total Duration  : ${totalDuration} seconds`);
    console.log(`  Combined Folder : ${CONSOLIDATED_DIR}`);
    console.log('======================================================================');
    
  } catch (error) {
    console.error('❌ Coordinator Error:', error);
  }
}

main();

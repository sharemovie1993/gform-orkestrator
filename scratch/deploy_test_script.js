const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const NODES = [
  { ip: '10.10.10.64', hostname: 'ADVAN-TKJ01' },
  { ip: '10.10.10.65', hostname: 'ADVAN-TKJ02' },
  { ip: '10.10.10.66', hostname: 'ADVAN-TKJ03' },
  { ip: '10.10.10.62', hostname: 'ADVAN-TKJ04' }
];

const credentials = {
  username: 'admin',
  password: '11223344',
  port: 22,
  readyTimeout: 10000
};

function uploadSFTP(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const readStream = fs.createReadStream(localPath);
      const writeStream = sftp.createWriteStream(remotePath.replace(/\\/g, '/'));
      writeStream.on('close', () => resolve());
      writeStream.on('error', (e) => reject(e));
      readStream.on('error', (e) => reject(e));
      readStream.pipe(writeStream);
    });
  });
}

async function deployToNode(node) {
  const { ip, hostname } = node;
  const conn = new Client();
  return new Promise((resolve) => {
    conn.on('ready', async () => {
      try {
        const localWebtest = path.join(__dirname, 'remote_webtest.js');
        await uploadSFTP(conn, localWebtest, 'C:\\Users\\Public\\gform-orkestrator\\puppeteer_webtest.js');
        console.log(`✅ [${hostname}] Uploaded test script successfully.`);
        conn.end();
        resolve({ hostname, ok: true });
      } catch (err) {
        console.error(`❌ [${hostname}] Upload failed:`, err.message);
        conn.end();
        resolve({ hostname, ok: false, error: err.message });
      }
    }).on('error', (err) => {
      console.error(`❌ [${hostname}] SSH connection error:`, err.message);
      resolve({ hostname, ok: false, error: err.message });
    }).connect({
      host: ip,
      ...credentials
    });
  });
}

async function main() {
  console.log('Deploying test script to all 4 ADVAN nodes...');
  const results = await Promise.all(NODES.map(deployToNode));
  console.log('\nDeployment finished.');
}

main();

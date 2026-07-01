// scratch/setup_advan_nodes.js
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const NODES = [
  { ip: '10.10.10.62', hostname: 'ADVAN-TKJ04' }
];

const credentials = {
  username: 'admin',
  password: '11223344',
  port: 22,
  readyTimeout: 15000
};

function runSSHCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => {
        resolve({ code, stdout, stderr });
      }).on('data', (data) => {
        stdout += data.toString();
      }).stderr.on('data', (data) => {
        stderr += data.toString();
      });
    });
  });
}

function uploadSFTP(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const readStream = fs.createReadStream(localPath);
      const writeStream = sftp.createWriteStream(remotePath.replace(/\\/g, '/'));
      writeStream.on('close', () => {
        resolve();
      });
      writeStream.on('error', (e) => reject(e));
      readStream.on('error', (e) => reject(e));
      readStream.pipe(writeStream);
    });
  });
}

async function setupNode(node) {
  const { ip, hostname } = node;
  console.log(`\n========================================`);
  console.log(`🚀 Starting setup for ${hostname} (${ip})`);
  console.log(`========================================`);
  
  const conn = new Client();
  
  return new Promise((resolve) => {
    conn.on('ready', async () => {
      try {
        // 1. Check if Node.js already exists on the remote node
        console.log(`[${hostname}] Checking if Node.js is already installed...`);
        const checkNode = await runSSHCommand(conn, 'if exist C:\\Users\\Public\\node-v20.11.1-win-x64\\node.exe (echo YES) else (echo NO)');
        
        if (checkNode.stdout.includes('YES')) {
          console.log(`[${hostname}] Node.js is already present.`);
        } else {
          // Download node zip
          console.log(`[${hostname}] Downloading portable Node.js...`);
          const downloadRes = await runSSHCommand(conn, 'curl -Lo C:\\Users\\Public\\node.zip https://nodejs.org/dist/v20.11.1/node-v20.11.1-win-x64.zip');
          if (downloadRes.code !== 0) {
            throw new Error(`Failed to download Node.js: ${downloadRes.stderr}`);
          }
          
          // Extract node zip
          console.log(`[${hostname}] Extracting portable Node.js...`);
          const extractRes = await runSSHCommand(conn, 'powershell -Command "Expand-Archive -Path C:\\Users\\Public\\node.zip -DestinationPath C:\\Users\\Public\\ -Force"');
          if (extractRes.code !== 0) {
            throw new Error(`Failed to extract Node.js: ${extractRes.stderr}`);
          }
          console.log(`[${hostname}] Node.js extracted successfully.`);
        }
        
        // 2. Create the working directory
        console.log(`[${hostname}] Creating working directory C:\\Users\\Public\\gform-orkestrator ...`);
        await runSSHCommand(conn, 'mkdir C:\\Users\\Public\\gform-orkestrator');
        
        // 3. Upload package.json and the test script
        const localPackageJson = path.join(__dirname, 'remote_package.json');
        const localWebtest = path.join(__dirname, 'remote_webtest.js');
        
        console.log(`[${hostname}] Uploading package.json...`);
        await uploadSFTP(conn, localPackageJson, 'C:\\Users\\Public\\gform-orkestrator\\package.json');
        
        console.log(`[${hostname}] Uploading remote_webtest.js as puppeteer_webtest.js...`);
        await uploadSFTP(conn, localWebtest, 'C:\\Users\\Public\\gform-orkestrator\\puppeteer_webtest.js');
        
        // 4. Install dependencies (puppeteer@22)
        console.log(`[${hostname}] Installing dependencies (puppeteer@22). This may take a minute...`);
        const installRes = await runSSHCommand(conn, 'set PATH=C:\\Users\\Public\\node-v20.11.1-win-x64;%PATH% && cd C:\\Users\\Public\\gform-orkestrator && npm install puppeteer@22');
        if (installRes.code !== 0) {
          throw new Error(`Failed to install puppeteer: ${installRes.stderr}`);
        }
        console.log(`[${hostname}] Dependencies installed successfully!`);
        
        console.log(`✅ [${hostname}] Setup Completed Successfully!`);
        conn.end();
        resolve({ ip, ok: true });
        
      } catch (err) {
        console.error(`❌ [${hostname}] Setup Failed:`, err.message || err);
        conn.end();
        resolve({ ip, ok: false, error: err.message || err });
      }
    }).on('error', (err) => {
      console.error(`❌ [${hostname}] SSH connection error:`, err.message);
      resolve({ ip, ok: false, error: err.message });
    }).connect({
      host: ip,
      ...credentials
    });
  });
}

async function main() {
  const start = Date.now();
  console.log(`Starting parallel setup on nodes: ${NODES.map(n => n.hostname).join(', ')}`);
  
  const results = await Promise.all(NODES.map(node => setupNode(node)));
  
  console.log(`\n========================================`);
  console.log(`  SETUP SUMMARY`);
  console.log(`========================================`);
  results.forEach((r, i) => {
    const node = NODES[i];
    if (r.ok) {
      console.log(`✅ ${node.hostname} (${node.ip}): SUCCESS`);
    } else {
      console.log(`❌ ${node.hostname} (${node.ip}): FAILED - ${r.error}`);
    }
  });
  console.log(`Total duration: ${((Date.now() - start) / 1000).toFixed(2)}s`);
}

main();

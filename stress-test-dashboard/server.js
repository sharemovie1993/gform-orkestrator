const express = require('express');
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const net = require('net');
const dbWrapper = require('./database');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const NODES_FILE = path.join(__dirname, 'nodes.json');
const REPORTS_DIR = path.join(__dirname, 'reports');

if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Default seed nodes
const DEFAULT_NODES = [
  { ip: '10.10.10.64', hostname: 'ADVAN-TKJ01', username: 'admin', password: '11223344', status: 'unknown' },
  { ip: '10.10.10.65', hostname: 'ADVAN-TKJ02', username: 'admin', password: '11223344', status: 'unknown' },
  { ip: '10.10.10.66', hostname: 'ADVAN-TKJ03', username: 'admin', password: '11223344', status: 'unknown' },
  { ip: '10.10.10.62', hostname: 'ADVAN-TKJ04', username: 'admin', password: '11223344', status: 'unknown' }
];

function loadNodes() {
  if (!fs.existsSync(NODES_FILE)) {
    fs.writeFileSync(NODES_FILE, JSON.stringify(DEFAULT_NODES, null, 2));
    return DEFAULT_NODES;
  }
  try {
    return JSON.parse(fs.readFileSync(NODES_FILE, 'utf8'));
  } catch (e) {
    return DEFAULT_NODES;
  }
}

function saveNodes(nodes) {
  fs.writeFileSync(NODES_FILE, JSON.stringify(nodes, null, 2));
}

// Log streaming mechanism (SSE)
let sseClients = [];
let logHistory = [];

function broadcastLog(message) {
  const formatted = `[${new Date().toLocaleTimeString()}] ${message}`;
  logHistory.push(formatted);
  if (logHistory.length > 2000) logHistory.shift();

  sseClients.forEach(client => {
    client.write(`data: ${JSON.stringify({ log: formatted })}\n\n`);
  });
}

function broadcastNodes(nodes) {
  sseClients.forEach(client => {
    client.write(`data: ${JSON.stringify({ type: 'nodes', nodes })}\n\n`);
  });
}

function clearLogHistory() {
  logHistory = [];
  sseClients.forEach(client => {
    client.write(`data: ${JSON.stringify({ clear: true })}\n\n`);
  });
}

// Active State
let currentOperation = {
  active: false, // true if setup or test is running
  type: null,    // 'setup' or 'test'
  progress: 0,
  details: ''
};

// --- API Endpoints ---

// Get active operation status
app.get('/api/status', (req, res) => {
  res.json(currentOperation);
});

// Stream logs (SSE)
app.get('/api/stream-logs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send history
  logHistory.forEach(logLine => {
    res.write(`data: ${JSON.stringify({ log: logLine })}\n\n`);
  });

  sseClients.push(res);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c !== res);
  });
});

// Clear logs
app.post('/api/clear-logs', (req, res) => {
  clearLogHistory();
  res.json({ success: true });
});

// List nodes
app.get('/api/nodes', (req, res) => {
  res.json(loadNodes());
});

// Add/update node
app.post('/api/nodes', (req, res) => {
  const { ip, hostname, username, password } = req.body;
  if (!ip || !hostname || !username || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const nodes = loadNodes();
  const existingIndex = nodes.findIndex(n => n.ip === ip);
  
  if (existingIndex > -1) {
    nodes[existingIndex] = { ...nodes[existingIndex], hostname, username, password };
  } else {
    nodes.push({ ip, hostname, username, password, status: 'unknown' });
  }
  
  saveNodes(nodes);
  res.json({ success: true, nodes });
});

// Delete node
app.delete('/api/nodes/:ip', (req, res) => {
  const { ip } = req.params;
  let nodes = loadNodes();
  nodes = nodes.filter(n => n.ip !== ip);
  saveNodes(nodes);
  res.json({ success: true, nodes });
});

// Launch RDP to node
app.post('/api/nodes/rdp', (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP is required' });
  
  const { exec } = require('child_process');
  exec(`mstsc.exe /v:${ip}`, (err) => {
    if (err) {
      console.error(`Failed to launch RDP to ${ip}:`, err);
    }
  });
  res.json({ success: true });
});

// Launch VNC Viewer to node
app.post('/api/nodes/vnc', (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP is required' });
  
  const { exec } = require('child_process');
  const fs = require('fs');
  
  // Standard VNC installation paths on Windows
  const paths = [
    'C:\\\\Program Files\\\\TightVNC\\\\tvnviewer.exe',
    'C:\\\\Program Files (x86)\\\\TightVNC\\\\tvnviewer.exe',
    'C:\\\\Program Files\\\\UltraVNC\\\\vncviewer.exe'
  ];
  
  let exePath = null;
  for (const p of paths) {
    if (fs.existsSync(p)) {
      exePath = p;
      break;
    }
  }
  
  if (exePath) {
    exec(`"${exePath}" ${ip}`, (err) => {
      if (err) console.error(`Failed to launch VNC client:`, err);
    });
    res.json({ success: true });
  } else {
    // If not found in standard paths, attempt to launch tvnviewer or vncviewer from system PATH
    exec(`start tvnviewer.exe ${ip}`, (err) => {
      if (err) {
        exec(`start vncviewer.exe ${ip}`, (err2) => {
          if (err2) {
            console.error('No VNC viewer found in standard paths or PATH');
          }
        });
      }
    });
    res.json({ success: true, warning: 'VNC viewer not found in standard Program Files paths; attempted global execution.' });
  }
});

// Check SSH connection status for all nodes
app.post('/api/nodes/check', async (req, res) => {
  const nodes = loadNodes();
  broadcastLog('Checking connectivity on all nodes...');
  
  const checks = nodes.map(node => {
    return new Promise((resolve) => {
      const conn = new Client();
      conn.on('ready', () => {
        node.status = 'online';
        conn.end();
        resolve(node);
      }).on('error', () => {
        node.status = 'offline';
        resolve(node);
      }).connect({
        host: node.ip,
        port: 22,
        username: node.username,
        password: node.password,
        readyTimeout: 4000
      });
    });
  });

  const updatedNodes = await Promise.all(checks);
  saveNodes(updatedNodes);
  broadcastLog('Connectivity check complete.');
  res.json(updatedNodes);
});

// Run Setup on Selected Nodes
app.post('/api/nodes/setup', async (req, res) => {
  if (currentOperation.active) {
    return res.status(400).json({ error: 'Another operation is already running' });
  }

  const { ips } = req.body;
  if (!ips || ips.length === 0) {
    return res.status(400).json({ error: 'No nodes selected' });
  }

  currentOperation = { active: true, type: 'setup', progress: 0, details: `Setting up nodes: ${ips.join(', ')}` };
  clearLogHistory();
  broadcastLog(`Starting setup on nodes: ${ips.join(', ')}`);

  // Run in background
  setupNodesBackground(ips).then(() => {
    currentOperation = { active: false, type: null, progress: 0, details: '' };
  });

  res.json({ success: true });
});
// Enable RDP on Selected Nodes
app.post('/api/nodes/enable-rdp', async (req, res) => {
  if (currentOperation.active) {
    return res.status(400).json({ error: 'Another operation is already running' });
  }

  const { ips } = req.body;
  if (!ips || ips.length === 0) {
    return res.status(400).json({ error: 'No nodes selected' });
  }

  currentOperation = { active: true, type: 'setup', progress: 0, details: `Enabling RDP on nodes: ${ips.join(', ')}` };
  clearLogHistory();
  broadcastLog(`Starting RDP activation on nodes: ${ips.join(', ')}`);

  // Run in background
  enableRdpBackground(ips).then(() => {
    currentOperation = { active: false, type: null, progress: 0, details: '' };
  });

  res.json({ success: true });
});

// Install VNC on Selected Nodes
app.post('/api/nodes/install-vnc', async (req, res) => {
  if (currentOperation.active) {
    return res.status(400).json({ error: 'Another operation is already running' });
  }

  const { ips } = req.body;
  if (!ips || ips.length === 0) {
    return res.status(400).json({ error: 'No nodes selected' });
  }

  currentOperation = { active: true, type: 'setup', progress: 0, details: `Installing VNC on nodes: ${ips.join(', ')}` };
  clearLogHistory();
  broadcastLog(`Starting TightVNC installation on nodes: ${ips.join(', ')}`);

  // Run in background
  installVncBackground(ips).then(() => {
    currentOperation = { active: false, type: null, progress: 0, details: '' };
  });

  res.json({ success: true });
});

// Install VNC Viewer locally on Host PC
app.post('/api/host/install-vnc', (req, res) => {
  if (currentOperation.active) {
    return res.status(400).json({ error: 'Another operation is already running' });
  }

  currentOperation = { active: true, type: 'setup', progress: 0, details: 'Launching VNC Viewer installer locally on Host PC' };
  clearLogHistory();
  broadcastLog('Initiating TightVNC Viewer installation on Host PC...');

  const { exec } = require('child_process');
  const downloadCmd = `curl -Lo C:\\\\Users\\\\Public\\\\tightvnc_host.msi https://www.tightvnc.com/download/2.8.27/tightvnc-2.8.27-gpl-setup-64bit.msi`;
  const installCmd = `start msiexec /i C:\\\\Users\\\\Public\\\\tightvnc_host.msi ADDLOCAL=Viewer`;

  broadcastLog('Downloading TightVNC installer to C:\\\\Users\\\\Public\\\\tightvnc_host.msi...');

  exec(downloadCmd, (err) => {
    currentOperation = { active: false, type: null, progress: 0, details: '' };
    if (err) {
      broadcastLog(`❌ Failed to download TightVNC: ${err.message}`);
      return;
    }

    broadcastLog('Launching TightVNC Viewer Setup Wizard on your desktop...');
    exec(installCmd, (err2) => {
      if (err2) {
        broadcastLog(`❌ Failed to start installer wizard: ${err2.message}`);
      } else {
        broadcastLog('✅ Installer wizard successfully opened! Please complete the installation steps on your screen.');
      }
    });
  });

  res.json({ success: true });
});
// Run stress test on selected nodes
app.post('/api/test/run', async (req, res) => {
  if (currentOperation.active) {
    res.status(400).json({ error: 'Another operation is already running' });
    return;
  }

  const { config } = req.body; // config is array of { ip, capacity }
  if (!config || config.length === 0) {
    res.status(400).json({ error: 'No test configuration provided' });
    return;
  }

  currentOperation = { active: true, type: 'test', progress: 0, details: `Running load test across ${config.length} nodes` };
  clearLogHistory();
  broadcastLog(`Initiating coordinated stress test across ${config.length} nodes...`);

  runTestBackground(config).then(() => {
    currentOperation = { active: false, type: null, progress: 0, details: '' };
  });

  res.json({ success: true });
});

// Forcefully stop running tests on all active nodes
app.post('/api/test/stop', async (req, res) => {
  const nodes = loadNodes();
  broadcastLog('🛑 EMERGENCY STOP TRIGGERED. Force killing tests on all nodes...');
  
  // Reset server active operation state immediately
  currentOperation = { active: false, type: null, progress: 0, details: '' };

  const stopPromises = nodes.map(node => {
    return new Promise((resolve) => {
      const conn = new Client();
      conn.on('ready', async () => {
        try {
          broadcastLog(`[${node.hostname}] Connected. Force terminating Puppeteer & Node tasks...`);
          // Kill chromium/chrome processes and node script running the test
          await runSSHCommand(conn, 'taskkill /F /IM node.exe /IM chrome.exe /T 2>nul || echo ALREADY_CLEAN', node.hostname, false);
          broadcastLog(`✅ [${node.hostname}] Force kill command executed successfully.`);
          resolve(true);
        } catch (err) {
          broadcastLog(`❌ [${node.hostname}] Failed to stop processes: ${err.message}`);
          resolve(false);
        } finally {
          conn.end();
        }
      }).on('error', () => {
        resolve(false); // offline node
      }).connect({
        host: node.ip,
        port: 22,
        username: node.username,
        password: node.password,
        readyTimeout: 5000
      });
    });
  });

  Promise.all(stopPromises).then(() => {
    broadcastLog('========================================');
    broadcastLog('🛑 EMERGENCY STOP COMPLETED on all reachable nodes.');
    broadcastLog('========================================');
  });

  res.json({ success: true });
});

// Get reports list (with SQLite database support)
app.get('/api/reports', async (req, res) => {
  try {
    const runs = await dbWrapper.getTestRuns();
    // Return SQLite runs
    const formattedRuns = runs.map(run => {
      return {
        id: run.id,
        timestamp: run.timestamp,
        duration: run.duration_seconds,
        nodes: run.total_nodes,
        browsers: run.total_browsers,
        success: run.success_count,
        fail: run.fail_count,
        avg_latency: run.avg_latency_ms,
        conclusion: run.conclusion,
        // Keep files array for backwards compatibility with the UI
        files: [`summary_${run.id}.json`]
      };
    });
    
    // Also merge older folders that might not be in db
    const items = fs.readdirSync(REPORTS_DIR);
    const diskReports = items
      .filter(item => fs.statSync(path.join(REPORTS_DIR, item)).isDirectory())
      .map(dirName => {
        const reportFolderPath = path.join(REPORTS_DIR, dirName);
        const files = fs.readdirSync(reportFolderPath);
        return {
          id: dirName,
          timestamp: dirName.replace('distributed_report_', '').replace(/-/g, ':'),
          files: files.filter(f => f.startsWith('report_') || f.endsWith('.txt'))
        };
      });
      
    // Filter diskReports to only those not in DB
    const dbIds = new Set(formattedRuns.map(r => r.id));
    diskReports.forEach(dr => {
      if (!dbIds.has(dr.id)) {
        formattedRuns.push({
          id: dr.id,
          timestamp: dr.timestamp,
          files: dr.files
        });
      }
    });
    
    res.json(formattedRuns);
  } catch (e) {
    console.error('Error fetching reports:', e);
    res.json([]);
  }
});

// Get detailed summary of a single run from database
app.get('/api/reports/:id/summary', async (req, res) => {
  try {
    const { id } = req.params;
    const details = await dbWrapper.getTestRunDetails(id);
    if (!details) {
      return res.status(404).json({ error: 'Run not found in database' });
    }
    res.json(details);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// CSV Export Endpoint for a specific test run
app.get('/api/reports/:id/export', async (req, res) => {
  try {
    const { id } = req.params;
    const details = await dbWrapper.getTestRunDetails(id);
    if (!details) {
      return res.status(404).send('Run details not found.');
    }

    let csvContent = '';
    
    // Section 1: Summary Stats
    csvContent += `"--- STRESS TEST OVERVIEW ---"\n`;
    csvContent += `"Run ID","${details.summary.id}"\n`;
    csvContent += `"Timestamp","${details.summary.timestamp}"\n`;
    csvContent += `"Total Nodes","${details.summary.total_nodes}"\n`;
    csvContent += `"Total Target Concurrency","${details.summary.total_browsers}"\n`;
    csvContent += `"Successful Logins","${details.summary.success_count}"\n`;
    csvContent += `"Failed Logins","${details.summary.fail_count}"\n`;
    csvContent += `"Avg Latency (ms)","${details.summary.avg_latency_ms.toFixed(1)}"\n`;
    csvContent += `"Min Latency (ms)","${details.summary.min_latency_ms.toFixed(1)}"\n`;
    csvContent += `"Max Latency (ms)","${details.summary.max_latency_ms.toFixed(1)}"\n`;
    csvContent += `"Duration (s)","${details.summary.duration_seconds}"\n`;
    csvContent += `"Conclusion","${details.summary.conclusion}"\n\n`;

    // Section 2: Detailed Per-Node breakdown
    csvContent += `"--- PER-NODE BREAKDOWN ---"\n`;
    csvContent += `"Hostname","IP Address","Target Concurrency","Status","Success Count","Fail Count","Avg Latency (ms)","Min Latency (ms)","Max Latency (ms)","Error Message"\n`;
    
    for (const node of details.nodes) {
      csvContent += `"${node.hostname}","${node.ip}","${node.capacity}","${node.success === 1 ? '✅ SUCCESS' : '❌ FAILED'}","${node.success_count}","${node.fail_count}","${node.avg_latency_ms.toFixed(1)}","${node.min_latency_ms.toFixed(1)}","${node.max_latency_ms.toFixed(1)}","${node.error_msg || ''}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=stress_test_report_${id}.csv`);
    res.send(csvContent);
  } catch (e) {
    res.status(500).send(`Failed to generate export file: ${e.message}`);
  }
});

// View a specific report file or SQLite summary JSON
app.get('/api/reports/:id/:filename', async (req, res) => {
  const { id, filename } = req.params;
  
  if (filename.startsWith('summary_')) {
    // Dynamically render a pretty summary report
    try {
      const details = await dbWrapper.getTestRunDetails(id);
      if (details) {
        let output = `======================================================================\n`;
        output += `   STRESS TEST RUN SUMMARY (DATABASE RECORD)\n`;
        output += `   Run ID      : ${details.summary.id}\n`;
        output += `   Timestamp   : ${details.summary.timestamp}\n`;
        output += `   Total Nodes : ${details.summary.total_nodes} nodes\n`;
        output += `   Browsers    : ${details.summary.total_browsers} browsers\n`;
        output += `   Duration    : ${details.summary.duration_seconds} seconds\n`;
        output += `   Conclusion  : ${details.summary.conclusion}\n`;
        output += `======================================================================\n\n`;
        
        output += `📊 CONSOLIDATED METRICS:\n`;
        output += `   - Successful Logins  : ${details.summary.success_count} / ${details.summary.total_browsers}\n`;
        output += `   - Failed Logins      : ${details.summary.fail_count} / ${details.summary.total_browsers}\n`;
        output += `   - Avg Latency        : ${details.summary.avg_latency_ms.toFixed(1)} ms\n`;
        output += `   - Min Latency        : ${details.summary.min_latency_ms.toFixed(1)} ms\n`;
        output += `   - Max Latency        : ${details.summary.max_latency_ms.toFixed(1)} ms\n\n`;
        
        output += `🖥️ PER-NODE STATISTICS & STATUS:\n`;
        output += `----------------------------------------------------------------------\n`;
        details.nodes.forEach(node => {
          output += `   📍 Host: ${node.hostname} (${node.ip})\n`;
          output += `      - Status        : ${node.success === 1 ? '✅ SUCCESS' : '❌ FAILED'}\n`;
          output += `      - Capacity Limit: ${node.capacity} browsers\n`;
          output += `      - Node Stats    : Passed ${node.success_count}, Failed ${node.fail_count}\n`;
          if (node.success === 1) {
            output += `      - Avg Latency   : ${node.avg_latency_ms.toFixed(1)} ms\n`;
            output += `      - Latency Range : ${node.min_latency_ms.toFixed(1)} ms - ${node.max_latency_ms.toFixed(1)} ms\n`;
          } else {
            output += `      - Error Message : ${node.error_msg || 'Unknown SSH error'}\n`;
          }
          output += `\n`;
        });
        output += `----------------------------------------------------------------------\n`;
        
        res.setHeader('Content-Type', 'text/plain');
        return res.send(output);
      }
    } catch (dbErr) {
      console.error(dbErr);
    }
  }

  const filePath = path.join(REPORTS_DIR, id, filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Report file not found');
  }
});

// --- Remote SSH Automation Tasks ---

function runSSHCommand(conn, cmd, hostname, prefixLog = true) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => {
        resolve({ code, stdout, stderr });
      }).on('data', (data) => {
        stdout += data.toString();
        if (prefixLog) {
          data.toString().trim().split('\n').forEach(line => {
            if (line.trim()) broadcastLog(`[${hostname}] ${line.trim()}`);
          });
        }
      }).stderr.on('data', (data) => {
        stderr += data.toString();
        if (prefixLog) {
          data.toString().trim().split('\n').forEach(line => {
            if (line.trim()) broadcastLog(`[${hostname} ERROR] ${line.trim()}`);
          });
        }
      });
    });
  });
}

function uploadSFTP(conn, localPath, remotePath, hostname) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const readStream = fs.createReadStream(localPath);
      const writeStream = sftp.createWriteStream(remotePath.replace(/\\/g, '/'));
      writeStream.on('close', () => {
        broadcastLog(`[${hostname}] File upload complete: ${path.basename(localPath)}`);
        resolve();
      });
      writeStream.on('error', (e) => reject(e));
      readStream.on('error', (e) => reject(e));
      readStream.pipe(writeStream);
    });
  });
}

async function setupSingleNode(node) {
  const { ip, hostname, username, password } = node;
  const conn = new Client();

  return new Promise((resolve) => {
    conn.on('ready', async () => {
      try {
        broadcastLog(`[${hostname}] Connected. Checking Node.js installation...`);
        const checkNode = await runSSHCommand(conn, 'if exist C:\\Users\\Public\\node-v20.11.1-win-x64\\node.exe (echo YES) else (echo NO)', hostname, false);
        
        if (checkNode.stdout.includes('YES')) {
          broadcastLog(`[${hostname}] Node.js portable is already installed.`);
        } else {
          broadcastLog(`[${hostname}] Downloading Node.js zip...`);
          await runSSHCommand(conn, 'curl -Lo C:\\Users\\Public\\node.zip https://nodejs.org/dist/v20.11.1/node-v20.11.1-win-x64.zip', hostname, false);
          
          broadcastLog(`[${hostname}] Extracting Node.js zip (using powershell)...`);
          await runSSHCommand(conn, 'powershell -Command "Expand-Archive -Path C:\\Users\\Public\\node.zip -DestinationPath C:\\Users\\Public\\ -Force"', hostname, false);
        }

        broadcastLog(`[${hostname}] Creating working directory...`);
        await runSSHCommand(conn, 'mkdir C:\\Users\\Public\\gform-orkestrator', hostname, false);

        // Upload files
        const parentDir = path.dirname(__dirname); // parent dir of stress-test-dashboard
        const localPackageJson = path.join(parentDir, 'scratch', 'remote_package.json');
        const localWebtest = path.join(parentDir, 'scratch', 'remote_webtest.js');

        broadcastLog(`[${hostname}] Transferring package config files...`);
        await uploadSFTP(conn, localPackageJson, 'C:\\Users\\Public\\gform-orkestrator\\package.json', hostname);
        await uploadSFTP(conn, localWebtest, 'C:\\Users\\Public\\gform-orkestrator\\puppeteer_webtest.js', hostname);

        broadcastLog(`[${hostname}] Installing dependencies (puppeteer@22). This may take a minute...`);
        const installRes = await runSSHCommand(conn, 'set PATH=C:\\Users\\Public\\node-v20.11.1-win-x64;%PATH% && cd C:\\Users\\Public\\gform-orkestrator && npm install puppeteer@22', hostname, true);
        
        if (installRes.code === 0) {
          broadcastLog(`✅ [${hostname}] Node setup completed successfully!`);
          resolve(true);
        } else {
          broadcastLog(`❌ [${hostname}] Dependencies installation failed.`);
          resolve(false);
        }
      } catch (err) {
        broadcastLog(`❌ [${hostname}] Setup error: ${err.message}`);
        resolve(false);
      } finally {
        conn.end();
      }
    }).on('error', (err) => {
      broadcastLog(`❌ [${hostname}] SSH connection error: ${err.message}`);
      resolve(false);
    }).connect({
      host: ip,
      port: 22,
      username,
      password,
      readyTimeout: 15000
    });
  });
}

async function setupNodesBackground(ips) {
  const nodes = loadNodes().filter(n => ips.includes(n.ip));
  const results = await Promise.all(nodes.map(setupSingleNode));
  const successCount = results.filter(Boolean).length;
  broadcastLog(`\n========================================`);
  broadcastLog(`Setup finished: ${successCount}/${nodes.length} nodes successfully configured.`);
  broadcastLog(`========================================`);
}

async function enableRdpSingleNode(node) {
  const { ip, hostname, username, password } = node;
  const conn = new Client();
  
  const enableRdpCmd = `powershell -Command "` +
    `Set-ItemProperty -Path 'HKLM:\\System\\CurrentControlSet\\Control\\Terminal Server' -Name 'fDenyTSConnections' -Value 0; ` +
    `Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private -ErrorAction SilentlyContinue; ` +
    `Set-NetFirewallRule -DisplayGroup 'Remote Desktop' -Enabled True -Profile Any -ErrorAction SilentlyContinue; ` +
    `Set-ItemProperty -Path 'HKLM:\\System\\CurrentControlSet\\Control\\Terminal Server\\WinStations\\RDP-Tcp' -Name 'UserAuthentication' -Value 0; ` +
    `net localgroup 'Remote Desktop Users' admin /add 2> $null; ` +
    `Set-Service -Name 'TermService' -StartupType Automatic; ` +
    `Restart-Service -Name 'TermService' -Force; ` +
    `echo 'RDP_ENABLED_SUCCESSFULLY'` +
    `"`;

  return new Promise((resolve) => {
    conn.on('ready', async () => {
      try {
        broadcastLog(`[${hostname}] Connected. Running commands to enable Remote Desktop (RDP)...`);
        const res = await runSSHCommand(conn, enableRdpCmd, hostname, false);
        
        if (res.stdout.includes('RDP_ENABLED_SUCCESSFULLY')) {
          broadcastLog(`✅ [${hostname}] Remote Desktop (RDP) has been enabled and firewall rules applied.`);
          resolve(true);
        } else {
          broadcastLog(`❌ [${hostname}] Failed to enable RDP. Stderr: ${res.stderr}`);
          resolve(false);
        }
      } catch (err) {
        broadcastLog(`❌ [${hostname}] RDP activation error: ${err.message}`);
        resolve(false);
      } finally {
        conn.end();
      }
    }).on('error', (err) => {
      broadcastLog(`❌ [${hostname}] SSH connection error: ${err.message}`);
      resolve(false);
    }).connect({
      host: ip,
      port: 22,
      username,
      password,
      readyTimeout: 15000
    });
  });
}

async function enableRdpBackground(ips) {
  const nodes = loadNodes().filter(n => ips.includes(n.ip));
  const results = await Promise.all(nodes.map(enableRdpSingleNode));
  const successCount = results.filter(Boolean).length;
  broadcastLog(`\n========================================`);
  broadcastLog(`RDP configuration finished: ${successCount}/${nodes.length} nodes successfully updated.`);
  broadcastLog(`========================================`);
}

async function installVncSingleNode(node) {
  const { ip, hostname, username, password } = node;
  const conn = new Client();

  return new Promise((resolve) => {
    conn.on('ready', async () => {
      try {
        broadcastLog(`[${hostname}] Connected. Checking if TightVNC is already installed...`);
        const checkVnc = await runSSHCommand(conn, 'if exist "C:\\\\Program Files\\\\TightVNC\\\\tvnserver.exe" (echo YES) else (echo NO)', hostname, false);
        
        if (checkVnc.stdout.includes('YES')) {
          broadcastLog(`[${hostname}] TightVNC Server is already installed.`);
          resolve(true);
          return;
        }

        broadcastLog(`[${hostname}] Downloading TightVNC Setup MSI...`);
        const downloadRes = await runSSHCommand(conn, 'curl -Lo C:\\\\Users\\\\Public\\\\tightvnc.msi https://www.tightvnc.com/download/2.8.27/tightvnc-2.8.27-gpl-setup-64bit.msi', hostname, false);
        if (downloadRes.code !== 0) {
          throw new Error('Failed to download TightVNC MSI.');
        }

        broadcastLog(`[${hostname}] Running TightVNC Silent Installation...`);
        const installRes = await runSSHCommand(conn, 'msiexec /i C:\\\\Users\\\\Public\\\\tightvnc.msi /quiet /norestart ADDLOCAL=Server SET_USEVNCAUTHENTICATION=1 VALUE_OF_USEVNCAUTHENTICATION=1 SET_PASSWORD=1 VALUE_OF_PASSWORD=11223344 SET_USECONTROLAUTHENTICATION=1 VALUE_OF_USECONTROLAUTHENTICATION=1 SET_CONTROLPASSWORD=1 VALUE_OF_CONTROLPASSWORD=11223344', hostname, false);
        
        broadcastLog(`[${hostname}] Configuring Windows Firewall for VNC port 5900...`);
        await runSSHCommand(conn, 'powershell -Command "New-NetFirewallRule -DisplayName \'TightVNC Server (Manual)\' -Direction Inbound -LocalPort 5900 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue"', hostname, false);

        broadcastLog(`✅ [${hostname}] TightVNC Server successfully installed as a background service (Password: 11223344).`);
        resolve(true);
      } catch (err) {
        broadcastLog(`❌ [${hostname}] VNC installation failed: ${err.message}`);
        resolve(false);
      } finally {
        conn.end();
      }
    }).on('error', (err) => {
      broadcastLog(`❌ [${hostname}] SSH connection error: ${err.message}`);
      resolve(false);
    }).connect({
      host: ip,
      port: 22,
      username,
      password,
      readyTimeout: 15000
    });
  });
}

async function installVncBackground(ips) {
  const nodes = loadNodes().filter(n => ips.includes(n.ip));
  const results = await Promise.all(nodes.map(installVncSingleNode));
  const successCount = results.filter(Boolean).length;
  broadcastLog(`\n========================================`);
  broadcastLog(`VNC installation finished: ${successCount}/${nodes.length} nodes successfully configured.`);
  broadcastLog(`========================================`);
}

// Coordinated Stress Test Run

function runSingleNodeTest(node, capacity) {
  const { ip, hostname, username, password } = node;
  const conn = new Client();

  return new Promise((resolve) => {
    conn.on('ready', async () => {
      try {
        broadcastLog(`🚀 [${hostname}] Connected. Triggering test command with ${capacity} concurrent browsers...`);
        const cmd = `set PATH=C:\\Users\\Public\\node-v20.11.1-win-x64;%PATH% && cd C:\\Users\\Public\\gform-orkestrator && node puppeteer_webtest.js ${capacity}`;
        
        conn.exec(cmd, (err, stream) => {
          if (err) {
            broadcastLog(`❌ [${hostname}] Exec error: ${err.message}`);
            conn.end();
            return resolve({ hostname, ok: false, error: err.message });
          }

          let stdout = '';
          stream.on('close', (code) => {
            broadcastLog(`✅ [${hostname}] Stress test process finished (exit code ${code}).`);
            conn.end();
            
            const match = stdout.match(/📄 Laporan\s+:\s+(C:[^\r\n]+)/);
            let reportPath = null;
            if (match && match[1]) {
              reportPath = match[1].trim();
            }

            resolve({
              hostname,
              ip,
              username,
              password,
              ok: code === 0,
              reportPath,
              stdout
            });
          }).on('data', (data) => {
            stdout += data.toString();
            // Filter and stream key lines to web log
            data.toString().split('\n').forEach(line => {
              const trimmed = line.trim();
              if (trimmed.startsWith('✔') || trimmed.startsWith('✖') || trimmed.includes('progress') || trimmed.includes('Sukses')) {
                broadcastLog(`[${hostname}] ${trimmed}`);
              }
            });
          }).stderr.on('data', (data) => {
            // Log issues
            data.toString().split('\n').forEach(line => {
              if (line.trim()) broadcastLog(`[${hostname} ERR] ${line.trim()}`);
            });
          });
        });
      } catch (err) {
        broadcastLog(`❌ [${hostname}] Test launch failed: ${err.message}`);
        resolve({ hostname, ok: false, error: err.message });
        conn.end();
      }
    }).on('error', (err) => {
      broadcastLog(`❌ [${hostname}] Connection failed: ${err.message}`);
      resolve({ hostname, ok: false, error: err.message });
    }).connect({
      host: ip,
      port: 22,
      username,
      password,
      readyTimeout: 15000
    });
  });
}

function downloadSingleReport(nodeIp, remotePath, localDest, username, password) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        const normalized = remotePath.replace(/\\/g, '/');
        const readStream = sftp.createReadStream(normalized);
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
    }).on('error', reject).connect({
      host: nodeIp,
      port: 22,
      username,
      password,
      readyTimeout: 10000
    });
  });
}

async function runTestBackground(config) {
  const nodes = loadNodes();
  const startTime = Date.now();
  const runId = `distributed_report_${new Date().toISOString().replace(/[:.]/g, '-')}`;
  
  const testPromises = config.map(cfg => {
    const targetNode = nodes.find(n => n.ip === cfg.ip);
    if (!targetNode) {
      broadcastLog(`⚠️ Node with IP ${cfg.ip} not found in database.`);
      return Promise.resolve({ hostname: cfg.ip, ok: false });
    }
    return runSingleNodeTest(targetNode, cfg.capacity);
  });

  const results = await Promise.all(testPromises);

  // Download reports
  broadcastLog('\n========================================');
  broadcastLog('Test execution complete. Downloading reports...');
  broadcastLog('========================================');

  const runReportDir = path.join(REPORTS_DIR, runId);
  fs.mkdirSync(runReportDir, { recursive: true });

  const nodeDetails = [];
  let totalBrowsers = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let allLatencies = [];

  for (const r of results) {
    const capacityObj = config.find(c => c.ip === r.ip) || { capacity: 130 };
    const capacity = capacityObj.capacity;
    totalBrowsers += capacity;

    const detail = {
      hostname: r.hostname,
      ip: r.ip,
      capacity: capacity,
      success: r.ok,
      success_count: 0,
      fail_count: capacity,
      avg_latency_ms: 0,
      min_latency_ms: 0,
      max_latency_ms: 0,
      error_msg: r.error || null,
      report_text: null
    };

    if (r.ok && r.reportPath) {
      const destFile = path.join(runReportDir, `report_${r.hostname.toLowerCase()}.txt`);
      broadcastLog(`📥 Downloading report from ${r.hostname}...`);
      try {
        await downloadSingleReport(r.ip, r.reportPath, destFile, r.username, r.password);
        broadcastLog(`✅ [${r.hostname}] Downloaded report successfully.`);
        
        // Parse report file for stats
        if (fs.existsSync(destFile)) {
          const content = fs.readFileSync(destFile, 'utf8');
          detail.report_text = content;

          // Parse Passed / Failed count
          const passMatch = content.match(/Berhasil\s+:\s+(\d+)/);
          const failMatch = content.match(/Gagal\s+:\s+(\d+)/);
          const avgMatch = content.match(/Latency Rata2\s+:\s+(\d+(?:\.\d+)?)\s*ms/);
          const minMatch = content.match(/Latency Tercepat\s+:\s+(\d+(?:\.\d+)?)\s*ms/);
          const maxMatch = content.match(/Latency Terlambat\s+:\s+(\d+(?:\.\d+)?)\s*ms/);

          if (passMatch) {
            detail.success_count = parseInt(passMatch[1], 10);
            totalPassed += detail.success_count;
          }
          if (failMatch) {
            detail.fail_count = parseInt(failMatch[1], 10);
            totalFailed += detail.fail_count;
          } else {
            detail.fail_count = capacity - detail.success_count;
            totalFailed += detail.fail_count;
          }

          if (avgMatch) detail.avg_latency_ms = parseFloat(avgMatch[1]);
          if (minMatch) detail.min_latency_ms = parseFloat(minMatch[1]);
          if (maxMatch) detail.max_latency_ms = parseFloat(maxMatch[1]);

          // Extract individual student latencies if present for consolidation
          const latencyRegex = /Total Waktu\s*:\s*(\d+)\s*ms/g;
          let match;
          while ((match = latencyRegex.exec(content)) !== null) {
            allLatencies.push(parseInt(match[1], 10));
          }
        }
      } catch (e) {
        broadcastLog(`❌ [${r.hostname}] Download failed: ${e.message}`);
        detail.error_msg = `Download failed: ${e.message}`;
      }
    } else {
      broadcastLog(`⚠️ [${r.hostname}] No report generated or test execution failed.`);
      if (r.stdout) {
        const destLog = path.join(runReportDir, `log_${r.hostname.toLowerCase()}_failed.txt`);
        fs.writeFileSync(destLog, r.stdout);
        detail.report_text = r.stdout;
      }
      totalFailed += capacity;
    }

    nodeDetails.push(detail);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Calculate consolidated statistics
  let avgLatency = 0;
  let minLatency = 0;
  let maxLatency = 0;
  if (allLatencies.length > 0) {
    const sum = allLatencies.reduce((a, b) => a + b, 0);
    avgLatency = sum / allLatencies.length;
    minLatency = Math.min(...allLatencies);
    maxLatency = Math.max(...allLatencies);
  }

  const conclusion = totalFailed === 0 
    ? '✅ SUCCESS (ALL BROWSERS COMPLETED)' 
    : `⚠️ PARTIAL FAILURE (${totalFailed} BROWSERS FAILED)`;

  const summary = {
    id: runId,
    timestamp: new Date().toISOString(),
    duration_seconds: parseFloat(duration),
    total_nodes: config.length,
    total_browsers: totalBrowsers,
    success_count: totalPassed,
    fail_count: totalFailed,
    avg_latency_ms: avgLatency,
    min_latency_ms: minLatency,
    max_latency_ms: maxLatency,
    conclusion: conclusion
  };

  // Save to SQLite
  try {
    await dbWrapper.saveTestRun(summary, nodeDetails);
    broadcastLog('💾 Coordinated stress test summary persisted to database successfully!');
  } catch (dbErr) {
    broadcastLog(`❌ Database persistence error: ${dbErr.message}`);
  }

  broadcastLog(`\n========================================`);
  broadcastLog(`Distributed test completed in ${duration}s.`);
  broadcastLog(`Combined reports saved in database & folder: ${runReportDir}`);
  broadcastLog(`========================================`);
}

function checkTCP(ip, port = 22, timeout = 2500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = 'offline';
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      status = 'online';
      socket.destroy();
    }).on('error', () => {
      status = 'offline';
    }).on('timeout', () => {
      status = 'offline';
      socket.destroy();
    }).connect(port, ip);

    socket.on('close', () => {
      resolve(status);
    });
  });
}

function startPeriodicConnectivityCheck() {
  setInterval(async () => {
    // Only perform check if no active setup or test is running
    if (currentOperation.active) return;
    
    const nodes = loadNodes();
    let changed = false;
    
    const checks = nodes.map(async (node) => {
      const prevStatus = node.status;
      const newStatus = await checkTCP(node.ip, 22, 2000);
      if (prevStatus !== newStatus) {
        node.status = newStatus;
        changed = true;
      }
      return node;
    });

    const updatedNodes = await Promise.all(checks);
    if (changed) {
      saveNodes(updatedNodes);
      broadcastNodes(updatedNodes);
    }
  }, 8000);
}

// Start Server
app.listen(PORT, () => {
  console.log(`Stress Test Dashboard Server running on http://localhost:${PORT}`);
  startPeriodicConnectivityCheck();
});

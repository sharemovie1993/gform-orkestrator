const { Client } = require('ssh2');

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

// PowerShell commands to enable RDP and configure firewall
const enableRdpCmd = `powershell -Command "` +
  `Set-ItemProperty -Path 'HKLM:\\System\\CurrentControlSet\\Control\\Terminal Server' -Name 'fDenyTSConnections' -Value 0; ` +
  `Enable-NetFirewallRule -DisplayGroup 'Remote Desktop'; ` +
  `Set-Service -Name 'TermService' -StartupType Automatic; ` +
  `Start-Service -Name 'TermService' -ErrorAction SilentlyContinue; ` +
  `echo 'RDP_ENABLED_SUCCESSFULLY'` +
  `"`;

function enableRDPOnNode(node) {
  const { ip, hostname } = node;
  const conn = new Client();
  
  return new Promise((resolve) => {
    conn.on('ready', () => {
      console.log(`[${hostname}] Connected. Enabling Remote Desktop (RDP)...`);
      
      conn.exec(enableRdpCmd, (err, stream) => {
        if (err) {
          console.error(`❌ [${hostname}] SSH Exec Error:`, err.message);
          conn.end();
          return resolve({ hostname, ok: false, error: err.message });
        }
        
        let stdout = '';
        let stderr = '';
        
        stream.on('close', (code) => {
          conn.end();
          if (stdout.includes('RDP_ENABLED_SUCCESSFULLY')) {
            console.log(`✅ [${hostname}] Remote Desktop (RDP) has been enabled and firewall rules applied.`);
            resolve({ hostname, ok: true });
          } else {
            console.error(`❌ [${hostname}] Failed to enable RDP. Code: ${code}. Stderr: ${stderr}`);
            resolve({ hostname, ok: false, error: stderr || 'Unknown error' });
          }
        }).on('data', (data) => {
          stdout += data.toString();
        }).stderr.on('data', (data) => {
          stderr += data.toString();
        });
      });
    }).on('error', (err) => {
      console.error(`❌ [${hostname}] Connection Error:`, err.message);
      resolve({ hostname, ok: false, error: err.message });
    }).connect({
      host: ip,
      ...credentials
    });
  });
}

async function main() {
  console.log('======================================================================');
  console.log('  ENABLING REMOTE DESKTOP (RDP) ON ALL ADVAN NODES');
  console.log('======================================================================\n');
  
  const results = await Promise.all(NODES.map(enableRDPOnNode));
  
  console.log('\n======================================================================');
  console.log('  SUMMARY');
  console.log('======================================================================');
  results.forEach(r => {
    if (r.ok) {
      console.log(`✅ [${r.hostname}] RDP Enabled Successfully.`);
    } else {
      console.log(`❌ [${r.hostname}] Failed to enable RDP: ${r.error}`);
    }
  });
  console.log('======================================================================');
}

main();

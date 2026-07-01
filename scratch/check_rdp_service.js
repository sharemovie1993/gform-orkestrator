const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected to 10.10.10.64. Checking TermService and Port 3389...');
  
  const cmd = `powershell -Command "` +
    `(Get-WmiObject Win32_OperatingSystem).Caption; ` +
    `(Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion').ProductName` +
    `"`;
  
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Error executing powershell command:', err);
      conn.end();
      return;
    }
    stream.on('close', () => {
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('SSH connection error:', err);
}).connect({
  host: '10.10.10.64',
  port: 22,
  username: 'admin',
  password: '11223344',
  readyTimeout: 10000
});

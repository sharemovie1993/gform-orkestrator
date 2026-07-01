const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected to ADVAN-TKJ02. Fetching process list...');
  conn.exec('powershell -Command "Get-Process | Sort-Object CPU -Descending | Select-Object -First 20 -Property Name, CPU, Id, Description | Format-Table -AutoSize"', (err, stream) => {
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
  host: '10.10.10.65',
  port: 22,
  username: 'admin',
  password: '11223344',
  readyTimeout: 10000
});

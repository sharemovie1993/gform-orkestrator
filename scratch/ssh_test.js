// scratch/ssh_test.js
const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('✅ SSH Connection Ready!');
  // Coba jalankan command dasar
  conn.exec('whoami && hostname', (err, stream) => {
    if (err) {
      console.error('❌ Error executing command:', err);
      conn.end();
      return;
    }
    stream.on('close', (code, signal) => {
      console.log(`Connection closed with code ${code}`);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).on('error', (err) => {
  console.error('❌ SSH Connection Error:', err);
}).connect({
  host: '10.10.10.62',
  port: 22,
  username: 'admin',
  password: '11223344',
  readyTimeout: 10000
});

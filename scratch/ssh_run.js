// scratch/ssh_run.js
const { Client } = require('ssh2');

const command = process.argv.slice(2).join(' ') || 'whoami';
console.log(`Running remote command: "${command}"`);

const conn = new Client();
conn.on('ready', () => {
  conn.exec(command, (err, stream) => {
    if (err) {
      console.error('❌ Error executing command:', err);
      conn.end();
      return;
    }
    stream.on('close', (code, signal) => {
      conn.end();
      process.exit(code);
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).on('error', (err) => {
  console.error('❌ SSH Connection Error:', err);
  process.exit(1);
}).connect({
  host: '10.10.10.62',
  port: 22,
  username: 'admin',
  password: '11223344',
  readyTimeout: 10000
});

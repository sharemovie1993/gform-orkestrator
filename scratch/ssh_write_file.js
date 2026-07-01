// scratch/ssh_write_file.js
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const localFile = process.argv[2];
const remoteFile = process.argv[3];

if (!localFile || !remoteFile) {
  console.error('Usage: node ssh_write_file.js <localPath> <remotePath>');
  process.exit(1);
}

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('❌ SFTP Error:', err);
      conn.end();
      return;
    }
    const readStream = fs.createReadStream(localFile);
    const writeStream = sftp.createWriteStream(remoteFile);
    writeStream.on('close', () => {
      console.log(`✅ File copied from ${localFile} to ${remoteFile}`);
      conn.end();
    });
    readStream.pipe(writeStream);
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

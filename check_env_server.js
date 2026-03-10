const { Client } = require('ssh2');

const conn = new Client();
console.log('Connecting to Timeweb server to check .env...');

conn.on('ready', () => {
  console.log('Connection ready. Reading .env...');
  
  const cmd = "cd /root/app && cat .env";

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Read completed.');
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
});

conn.connect({
  host: '93.183.83.53',
  port: 22,
  username: 'root',
  password: 'hFaNk+iB2GBi4h',
  readyTimeout: 99999
});

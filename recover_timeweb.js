const { Client } = require('ssh2');

const conn = new Client();
console.log('Connecting to Timeweb server for recovery...');

conn.on('ready', () => {
  console.log('Connection ready. Cleaning up and restarting containers...');
  
  const cmd = "cd /root/app && docker-compose down && docker-compose up -d";

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Recovery Process completed with code ' + code);
      conn.end();
      process.exit(code || 0);
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

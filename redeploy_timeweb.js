const { Client } = require('ssh2');

const conn = new Client();
console.log('Connecting to Timeweb server for Rebuild...');

conn.on('ready', () => {
  console.log('Connection ready. Pulling latest code and building...');
  
  const cmd = "cd /root/app/web && git reset --hard && git pull && sed -i 's/node:20-alpine/public.ecr.aws\\/docker\\/library\\/node:20-alpine/g' Dockerfile && cd /root/app && docker-compose build --no-cache web && docker-compose up -d";

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Process completed with code ' + code);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('Connection Error:', err);
}).connect({
  host: '93.183.83.53',
  port: 22,
  username: 'root',
  password: 'hFaNk+iB2GBi4h',
  readyTimeout: 20000
});

const { Client } = require('ssh2');

const conn = new Client();
console.log('Connecting to Timeweb server to patch bot Dockerfile...');

conn.on('ready', () => {
  console.log('Connection ready. Patching and rebuilding bot...');
  
  const cmd = "cd /root/app && " +
    "sed -i 's/public.ecr.aws\\/docker\\/library\\/public.ecr.aws\\/docker\\/library\\/python/public.ecr.aws\\/docker\\/library\\/python/g' bot/Dockerfile && " +
    "docker-compose build bot && " +
    "docker-compose up -d";

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Bot Rebuild Process completed with code ' + code);
      conn.end();
      process.exit(code);
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

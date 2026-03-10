const { Client } = require('ssh2');

const conn = new Client();
console.log('Connecting to check container logs...');

conn.on('ready', () => {
  console.log('=== Checking container status ===');
  
  const cmd = "cd /root/app && docker-compose ps && echo '\\n=== WEB LOGS (last 80 lines) ===' && docker-compose logs --tail=80 web && echo '\\n=== BOT LOGS (last 80 lines) ===' && docker-compose logs --tail=80 bot && echo '\\n=== DB LOGS (last 20 lines) ===' && docker-compose logs --tail=20 db";

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('\nDone. Exit code:', code);
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

const { Client } = require('ssh2');

const conn = new Client();
console.log('Connecting to Timeweb server to clean Docker disk space...');

conn.on('ready', () => {
  const cmd = "docker system prune -af --volumes && docker builder prune -af && df -h";

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Cleanup completed with code ' + code);
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

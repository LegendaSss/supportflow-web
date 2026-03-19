const { Client } = require('ssh2');

const conn = new Client();
console.log('Connecting to Timeweb server to check DB...');

conn.on('ready', () => {
  console.log('Connection ready. Querying DB...');
  
  // Check templates and some clients to see if they are linked
  const cmd = `docker exec app_db_1 psql -U postgres -d supportflow -c "SELECT * FROM \\"Template\\" LIMIT 5;" && docker exec app_db_1 psql -U postgres -d supportflow -c "SELECT id, \\"firstName\\", \\"remnawareId\\" FROM \\"Client\\" LIMIT 10;"`;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Query completed.');
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

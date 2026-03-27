const { Client } = require('ssh2');
const conn = new Client();
console.log('Testing SSH connection...');
conn.on('ready', () => {
    console.log('✅ SSH is ALIVE and reachable!');
    conn.end();
}).on('error', (err) => {
    console.error('❌ SSH Error:', err.message);
}).connect({
    host: '93.183.83.53',
    username: 'root',
    password: 'hFaNk+iB2GBi4h',
    readyTimeout: 15000
});

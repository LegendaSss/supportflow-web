const { Client } = require('ssh2');

const conn = new Client();
console.log('Connecting to Timeweb server (93.183.83.53) to run migrations...');

conn.on('ready', () => {
    console.log('✅ Connection ready. Executing prisma migrate deploy...');
    
    // Using docker exec to run migration inside the web container
    const cmd = "docker exec app-web-1 npx prisma migrate deploy";
    
    conn.exec(cmd, (err, stream) => {
        if (err) {
            console.error('❌ Exec failed:', err);
            conn.end();
            return;
        }
        stream.on('close', (code, signal) => {
            console.log('\n✅ Migration process completed with code ' + code);
            conn.end();
            process.exit(code);
        }).on('data', (data) => {
            process.stdout.write(data.toString());
        }).stderr.on('data', (data) => {
            process.stderr.write(data.toString());
        });
    });
}).on('error', (err) => {
    console.error('❌ Connection Error:', err);
    process.exit(1);
}).connect({
    host: '93.183.83.53',
    port: 22,
    username: 'root',
    password: 'hFaNk+iB2GBi4h' // Extracted from deploy_timeweb.js
});

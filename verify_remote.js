const { Client } = require('ssh2');

const conn = new Client();
console.log('Connecting to Timeweb server (93.183.83.53) to verify column...');

conn.on('ready', () => {
    console.log('✅ Connection ready. Checking tables and columns...');
    
    // Check tables and specifically Broadcast columns
    const cmd = 'docker exec app-db-1 psql -U postgres -d supportflow -c "\\dt" && docker exec app-db-1 psql -U postgres -d supportflow -c "\\d \\"Broadcast\\\""';
    
    conn.exec(cmd, (err, stream) => {
        if (err) {
            console.error('❌ Exec failed:', err);
            conn.end();
            process.exit(1);
        }
        let output = '';
        stream.on('data', (data) => {
            output += data.toString();
        }).on('close', (code, signal) => {
            if (output.trim() === 'mediaFileId') {
                console.log('\n✅ VERIFIED: Column "mediaFileId" exists in "Broadcast" table.');
            } else {
                console.log('\n❌ FAILED: Column "mediaFileId" NOT found. Output: ' + output);
            }
            conn.end();
            process.exit(code);
        });
    });
}).on('error', (err) => {
    console.error('❌ Connection Error:', err);
    process.exit(1);
}).connect({
    host: '93.183.83.53',
    port: 22,
    username: 'root',
    password: 'hFaNk+iB2GBi4h'
});

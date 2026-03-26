const { Client } = require('ssh2');

const conn = new Client();
console.log('Connecting to Timeweb server (93.183.83.53) for final attempt...');

conn.on('ready', () => {
    console.log('✅ Connection ready. Rebuilding web container and pushing schema...');
    
    // 1. Build & Up to ensure latest files are in container
    // 2. Db Push with explicit URL to sync database
    const cmd = 'cd /root/app && docker-compose build web && docker-compose up -d && docker exec -w /app app-web-1 npx prisma db push --url="postgresql://postgres:hFaNk+iB2GBi4h@db:5432/supportflow?schema=public" --accept-data-loss';
    
    conn.exec(cmd, (err, stream) => {
        if (err) {
            console.error('❌ Exec failed:', err);
            conn.end();
            process.exit(1);
        }
        stream.on('close', (code, signal) => {
            console.log('\n✅ Migration Process Result: ' + code);
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
    password: 'hFaNk+iB2GBi4h'
});

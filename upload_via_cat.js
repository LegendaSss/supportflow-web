const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
const filesToUpload = [
    { local: 'src/lib/bot.ts', remote: '/root/app/web/src/lib/bot.ts' },
    { local: 'src/app/api/broadcasts/[id]/send/route.ts', remote: '/root/app/web/src/app/api/broadcasts/[id]/send/route.ts' },
    { local: 'prisma/schema.prisma', remote: '/root/app/web/prisma/schema.prisma' },
    { local: 'src/app/api/media/telegram/[fileId]/route.ts', remote: '/root/app/web/src/app/api/media/telegram/[fileId]/route.ts' }
];

conn.on('ready', () => {
    console.log('✅ Connection ready. Starting manual sync via cat...');
    
    let currentIdx = 0;

    const uploadNext = () => {
        if (currentIdx >= filesToUpload.length) {
            finalize();
            return;
        }

        const file = filesToUpload[currentIdx];
        const content = fs.readFileSync(file.local).toString('base64');
        const remoteDir = file.remote.substring(0, file.remote.lastIndexOf('/'));
        
        console.log(`Uploading ${file.local} (${content.length} bytes base64)...`);
        
        // Ensure dir, write base64, decode on server
        const cmd = `mkdir -p ${remoteDir} && base64 -d << 'EOF' > ${file.remote}\n${content}\nEOF`;
        
        conn.exec(cmd, (err, stream) => {
            if (err) throw err;
            stream.on('close', (code) => {
                if (code === 0) {
                    console.log(`✅ Uploaded ${file.local}`);
                    currentIdx++;
                    uploadNext();
                } else {
                    console.error(`❌ Upload failed for ${file.local} with code ${code}`);
                    conn.end();
                    process.exit(1);
                }
            });
        });
    };

    const finalize = () => {
        console.log('--- All files uploaded correctly. Starting build and migration ---');
        const cmd = 'cd /root/app && docker-compose build web && docker-compose up -d && docker exec -w /app app-web-1 npx prisma db push --url="postgresql://postgres:hFaNk+iB2GBi4h@db:5432/supportflow?schema=public" --accept-data-loss';
        
        conn.exec(cmd, (err, stream) => {
            if (err) throw err;
            stream.on('data', d => process.stdout.write(d))
                  .on('stderr', d => process.stderr.write(d))
                  .on('close', (code) => {
                      console.log(`\n🎉 Process finished with code ${code}`);
                      conn.end();
                      process.exit(code);
                  });
        });
    };

    uploadNext();
}).on('error', (err) => {
    console.error('❌ Connection Error:', err);
    process.exit(1);
}).connect({
    host: '93.183.83.53',
    port: 22,
    username: 'root',
    password: 'hFaNk+iB2GBi4h'
});

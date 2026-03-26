const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const filesToUpload = [
    { local: 'src/lib/bot.ts', remote: '/root/app/web/src/lib/bot.ts' },
    { local: 'src/app/api/broadcasts/[id]/send/route.ts', remote: '/root/app/web/src/app/api/broadcasts/[id]/send/route.ts' },
    { local: 'prisma/schema.prisma', remote: '/root/app/web/prisma/schema.prisma' },
    { local: 'src/app/api/media/telegram/[fileId]/route.ts', remote: '/root/app/web/src/app/api/media/telegram/[fileId]/route.ts' }
];

conn.on('ready', () => {
    console.log('✅ Connection ready. Starting manual sync via SFTP...');
    
    conn.sftp((err, sftp) => {
        if (err) throw err;

        let currentIdx = 0;

        const uploadNext = () => {
            if (currentIdx >= filesToUpload.length) {
                finalize();
                return;
            }

            const fileObj = filesToUpload[currentIdx];
            const remoteDir = path.dirname(fileObj.remote).replace(/\\/g, '/');
            
            console.log(`Ensuring dir ${remoteDir}...`);
            conn.exec(`mkdir -p ${remoteDir}`, (err, stream) => {
                if (err) throw err;
                stream.on('close', () => {
                    console.log(`Uploading ${fileObj.local} -> ${fileObj.remote}...`);
                    sftp.fastPut(fileObj.local, fileObj.remote, (err) => {
                        if (err) {
                            console.error(`❌ Upload failed for ${fileObj.local}:`, err);
                            conn.end();
                            process.exit(1);
                        } else {
                            console.log(`✅ Uploaded ${fileObj.local}`);
                            currentIdx++;
                            uploadNext();
                        }
                    });
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

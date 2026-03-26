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

const remoteBase = '/root/app/web';

conn.on('ready', () => {
    console.log('✅ Connection ready. Starting manual sync...');
    
    let uploadedCount = 0;

    const uploadFile = (fileObj) => {
        conn.sftp((err, sftp) => {
            if (err) throw err;
            
            // Ensure remote directory exists
            const remoteDir = path.dirname(fileObj.remote).replace(/\\/g, '/');
            conn.exec(`mkdir -p ${remoteDir}`, (err, stream) => {
                if (err) throw err;
                stream.on('close', () => {
                    console.log(`Uploading ${fileObj.local} -> ${fileObj.remote}`);
                    sftp.fastPut(fileObj.local, fileObj.remote, (err) => {
                        if (err) {
                            console.error(`❌ Upload failed for ${fileObj.local}:`, err);
                        } else {
                            console.log(`✅ Uploaded ${fileObj.local}`);
                            uploadedCount++;
                            if (uploadedCount === filesToUpload.length) {
                                finalize();
                            }
                        }
                    });
                });
            });
        });
    };

    const finalize = () => {
        console.log('--- All files uploaded. Starting build and migration ---');
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

    filesToUpload.forEach(uploadFile);
}).on('error', (err) => {
    console.error('❌ Connection Error:', err);
    process.exit(1);
}).connect({
    host: '93.183.83.53',
    port: 22,
    username: 'root',
    password: 'hFaNk+iB2GBi4h'
});

const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
const files = [
    { local: 'src/lib/bot.ts', remote: '/root/app/web/src/lib/bot.ts' },
    { local: 'src/app/api/broadcasts/[id]/send/route.ts', remote: '/root/app/web/src/app/api/broadcasts/[id]/send/route.ts' },
    { local: 'prisma/schema.prisma', remote: '/root/app/web/prisma/schema.prisma' },
    { local: 'src/app/api/media/telegram/[fileId]/route.ts', remote: '/root/app/web/src/app/api/media/telegram/[fileId]/route.ts' },
    { local: 'src/app/api/clients/[id]/subscriptions/extend/route.ts', remote: '/root/app/web/src/app/api/clients/[id]/subscriptions/extend/route.ts' },
    { local: 'src/app/api/clients/[id]/diagnostics/route.ts', remote: '/root/app/web/src/app/api/clients/[id]/diagnostics/route.ts' },
    { local: 'src/app/api/clients/[id]/subscriptions/live/route.ts', remote: '/root/app/web/src/app/api/clients/[id]/subscriptions/live/route.ts' },
    { local: 'src/app/api/clients/[id]/subscriptions/hwid/route.ts', remote: '/root/app/web/src/app/api/clients/[id]/subscriptions/hwid/route.ts' },
    { local: 'src/app/api/admin/media-cleanup/route.ts', remote: '/root/app/web/src/app/api/admin/media-cleanup/route.ts' }
];

conn.on('ready', () => {
    console.log('✅ Connected.');
    conn.sftp((err, sftp) => {
        if (err) throw err;
        console.log('➜ SFTP opened.');
        
        let i = 0;
        const next = () => {
            if (i >= files.length) {
                console.log('--- All uploaded. Finalizing server... ---');
                runFinal();
                return;
            }
            const f = files[i];
            console.log(`➜ Uploading ${f.local}...`);
            
            sftp.fastPut(f.local, f.remote, (err) => {
                if (err) {
                    // Try to mkdir
                    const dir = f.remote.substring(0, f.remote.lastIndexOf('/'));
                    conn.exec(`mkdir -p "${dir}"`, (err, stream) => {
                        stream.on('close', () => {
                            sftp.fastPut(f.local, f.remote, (err) => {
                                if (err) {
                                    console.error('❌ Final failure:', err);
                                    conn.end();
                                } else {
                                    console.log(`✅ Uploaded ${f.local}`);
                                    i++; next();
                                }
                            });
                        });
                    });
                } else {
                    console.log(`✅ Uploaded ${f.local}`);
                    i++; next();
                }
            });
        };

        const runFinal = () => {
            // Note: docker-compose build web might still use cache for some things, but since we manually updated files it should be okay.
            const cmd = 'cd /root/app && docker-compose build web && docker-compose up -d && docker exec -w /app app-web-1 npx prisma db push --url="postgresql://postgres:hFaNk+iB2GBi4h@db:5432/supportflow?schema=public" --accept-data-loss';
            conn.exec(cmd, (err, stream) => {
                stream.on('data', d => process.stdout.write(d))
                      .on('stderr', d => process.stderr.write(d))
                      .on('close', (code) => {
                          console.log('🎉 Done with code ' + code);
                          conn.end();
                      });
            });
        };

        next();
    });
}).connect({
    host: '93.183.83.53',
    username: 'root',
    password: 'hFaNk+iB2GBi4h',
    readyTimeout: 120000
});

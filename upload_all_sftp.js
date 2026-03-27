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
    { local: 'src/app/api/admin/media-cleanup/route.ts', remote: '/root/app/web/src/app/api/admin/media-cleanup/route.ts' },
    { local: 'src/lib/remnawave.ts', remote: '/root/app/web/src/lib/remnawave.ts' },
    { local: 'src/app/tickets/page.tsx', remote: '/root/app/web/src/app/tickets/page.tsx' },
    { local: 'src/app/api/tickets/[id]/typing/route.ts', remote: '/root/app/web/src/app/api/tickets/[id]/typing/route.ts' }
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
            // Protect server against Out Of Memory (OOM) during Next.js build
            const setupSwap = `
                if ! grep -q "swapfile" /proc/swaps; then
                    fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab
                    echo "✅ Swap file created!"
                else
                    echo "✅ Swap file already exists!"
                fi
            `;
            const cmd = `${setupSwap} && cd /root/app && docker-compose build web && docker-compose up -d && docker exec -w /app app-web-1 npx prisma db push --url="postgresql://postgres:hFaNk+iB2GBi4h@db:5432/supportflow?schema=public" --accept-data-loss`;
            
            console.log('➜ Initializing Swap and Building Docker Container...');
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

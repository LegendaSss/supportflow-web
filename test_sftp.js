const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
    console.log('✅ Connected.');
    conn.sftp((err, sftp) => {
        if (err) throw err;
        console.log('➜ SFTP session opened.');
        const local = 'prisma/schema.prisma';
        const remote = '/root/app/web/prisma/schema.prisma';
        console.log(`➜ Uploading ${local}...`);
        sftp.fastPut(local, remote, (err) => {
            if (err) {
                console.error('❌ Error:', err);
            } else {
                console.log('✅ Success!');
            }
            conn.end();
        });
    });
}).connect({
    host: '93.183.83.53',
    username: 'root',
    password: 'hFaNk+iB2GBi4h'
});

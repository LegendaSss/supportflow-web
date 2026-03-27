const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
const localFile = 'cleanup_legacy_media.js';
const remoteHostPath = '/root/app/web/cleanup_legacy_media.js';

conn.on('ready', () => {
    console.log('✅ Connected.');
    conn.sftp((err, sftp) => {
        if (err) throw err;
        console.log('➜ Uploading cleanup script to host...');
        
        sftp.fastPut(localFile, remoteHostPath, (err) => {
            if (err) {
                console.error('❌ Upload failed:', err);
                conn.end();
                return;
            }
            console.log('✅ Uploaded to host. Copying into container via docker cp...');
            
            const cpCmd = `docker cp ${remoteHostPath} app-web-1:/app/cleanup_legacy_media.js`;
            conn.exec(cpCmd, (err, stream) => {
                if (err) throw err;
                
                stream.on('data', d => process.stdout.write(d.toString()));
                stream.stderr.on('data', d => process.stderr.write(d.toString()));
                
                stream.on('close', (code) => {
                    if (code !== 0) {
                        console.log(`❌ docker cp failed with code ${code}`);
                        conn.end();
                        return;
                    }
                    console.log('✅ Injected into container. Running cleanup...');
                    const runCmd = 'docker exec -w /app app-web-1 node cleanup_legacy_media.js';
                    conn.exec(runCmd, (err, stream) => {
                        if (err) throw err;
                        stream.on('data', d => process.stdout.write(d.toString()));
                        stream.stderr.on('data', d => process.stderr.write(d.toString()));
                        stream.on('close', (code) => {
                            console.log(`\n🎉 Done with code ${code}`);
                            conn.end();
                        });
                    });
                });
            });
        });
    });
}).connect({
    host: '93.183.83.53',
    username: 'root',
    password: 'hFaNk+iB2GBi4h',
    readyTimeout: 120000,
    debug: (msg) => {} // disable verbose ssh debug to see clear output
});

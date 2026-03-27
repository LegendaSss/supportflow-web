const { Client } = require('ssh2');
const path = require('path');

const conn = new Client();
const MEDIA_DIR = '/root/app/web/public/media';

conn.on('ready', () => {
    console.log('✅ Connected to server.');
    
    // 1. Get messages
    const cmd1 = `cd /root/app && docker-compose exec -T db psql -U postgres -d supportflow -t -c "SELECT attachments::text FROM \\"Message\\" WHERE attachments IS NOT NULL"`;
    
    console.log('➜ Querying Message attachments...');
    conn.exec(cmd1, (err, stream1) => {
        if (err) throw err;
        let msgOut = '';
        stream1.on('data', d => msgOut += d).on('close', () => {
            
            // 2. Get broadcasts
            const cmd2 = `cd /root/app && docker-compose exec -T db psql -U postgres -d supportflow -t -c "SELECT \\"mediaUrl\\" FROM \\"Broadcast\\" WHERE \\"mediaUrl\\" IS NOT NULL"`;
            console.log('➜ Querying Broadcast media URLs...');
            
            conn.exec(cmd2, (err, stream2) => {
                if (err) throw err;
                let bdOut = '';
                stream2.on('data', d => bdOut += d).on('close', () => {
                    
                    // Parse referenced files
                    const referencedFiles = new Set();
                    
                    const processLine = (line) => {
                        const t = line.trim();
                        if (!t) return;
                        try {
                            const data = JSON.parse(t);
                            if (Array.isArray(data)) {
                                data.forEach(i => { if(typeof i==='string') referencedFiles.add(path.basename(i)); });
                            } else if (typeof data === 'string') {
                                referencedFiles.add(path.basename(data));
                            }
                        } catch (e) {
                            referencedFiles.add(path.basename(t));
                        }
                    };
                    
                    msgOut.split('\n').filter(Boolean).forEach(processLine);
                    bdOut.split('\n').filter(Boolean).forEach(processLine);
                    
                    console.log(`➜ Found ${referencedFiles.size} unique referenced files in DB.`);
                    
                    conn.sftp((err, sftp) => {
                        if (err) throw err;
                        
                        sftp.readdir(MEDIA_DIR, (err, list) => {
                            if (err) {
                                console.error('❌ Could not read media dir:', err);
                                conn.end(); return;
                            }
                            
                            let totalDeleted = 0;
                            let spaceSavedBytes = 0;
                            const toDelete = list.filter(f => f.filename !== '.gitkeep' && f.filename !== 'placeholder.txt' && !referencedFiles.has(f.filename));
                            
                            if (toDelete.length === 0) {
                                console.log('🎉 No unreferenced media found! Disk is clean.');
                                conn.end();
                                return;
                            }

                            console.log(`➜ Found ${toDelete.length} files to delete. Starting cleanup...`);
                            
                            let i = 0;
                            const deleteNext = () => {
                                if (i >= toDelete.length) {
                                    console.log('-----------------------------------');
                                    console.log(`🎉 Cleanup Finished!`);
                                    console.log(`Total files deleted: ${totalDeleted}`);
                                    console.log(`Total space freed: ${(spaceSavedBytes / 1024 / 1024).toFixed(2)} MB`);
                                    conn.end();
                                    return;
                                }
                                const file = toDelete[i];
                                spaceSavedBytes += file.attrs.size;
                                const fpath = `${MEDIA_DIR}/${file.filename}`;
                                
                                sftp.unlink(fpath, (err) => {
                                    if (!err) {
                                        totalDeleted++;
                                        console.log(`  [DELETED] ${file.filename} (${(file.attrs.size / 1024 / 1024).toFixed(2)} MB)`);
                                    }
                                    i++;
                                    deleteNext();
                                });
                            };
                            deleteNext();
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
    readyTimeout: 120000
});

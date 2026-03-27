console.log('--- DEBUG: SCRIPT STARTING ---');

try {
    const { PrismaClient } = require('/app/node_modules/.prisma/client/index.js');
    const { Pool } = require('pg');
    const { PrismaPg } = require('@prisma/adapter-pg');

    console.log('--- DEBUG: MODULES LOADED ---');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });


    const MEDIA_DIR = path.join(__dirname, 'public', 'media');

    async function main() {
        console.log('--- Legacy Media Cleanup Started ---');
        console.log(`Directory: ${MEDIA_DIR}`);

        if (!fs.existsSync(MEDIA_DIR)) {
            console.log('❌ Media directory not found. Nothing to clean.');
            return;
        }

        const files = fs.readdirSync(MEDIA_DIR);
        console.log(`Found ${files.length} files in public/media.`);

        // 1. Fetch all referenced media from Message table
        console.log('➜ Querying Database (Messages)...');
        const messages = await prisma.message.findMany({
            where: {
                attachments: { not: null }
            },
            select: { attachments: true }
        });

        const referencedFiles = new Set();
        messages.forEach(msg => {
            try {
                const data = JSON.parse(msg.attachments);
                if (Array.isArray(data)) {
                    data.forEach(item => {
                        if (typeof item === 'string') referencedFiles.add(path.basename(item));
                    });
                } else if (typeof data === 'string') {
                    referencedFiles.add(path.basename(data));
                }
            } catch (e) {
                referencedFiles.add(path.basename(msg.attachments));
            }
        });

        // 2. Fetch all referenced media from Broadcast table
        console.log('➜ Querying Database (Broadcasts)...');
        const broadcasts = await prisma.broadcast.findMany({
            select: { mediaUrl: true }
        });
        broadcasts.forEach(b => {
            if (b.mediaUrl) referencedFiles.add(path.basename(b.mediaUrl));
        });

        console.log(`Unique referenced filenames in DB: ${referencedFiles.size}`);

        let deletedCount = 0;
        let savedSpace = 0;

        for (const file of files) {
            if (file === '.gitkeep' || file === 'placeholder.txt') continue;

            if (!referencedFiles.has(file)) {
                const filePath = path.join(MEDIA_DIR, file);
                try {
                    const stats = fs.statSync(filePath);
                    console.log(`➜ [CLEANUP] Deleting: ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    savedSpace += stats.size;
                } catch (err) {
                    console.error(`❌ Error processing ${file}:`, err.message);
                }
            }
        }

        console.log('--- Cleanup Finished ---');
        console.log(`Total files deleted: ${deletedCount}`);
        console.log(`Total space freed: ${(savedSpace / 1024 / 1024).toFixed(2)} MB`);
    }

    main()
        .catch((e) => {
            console.error('❌ FATAL ERROR IN MAIN:', e);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });

} catch (err) {
    console.error('❌ FATAL ERROR DURING INIT:', err);
    process.exit(1);
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
    try {
        // Simple security check (could use a secret key from headers)
        const authHeader = req.headers.get('Authorization');
        if (authHeader !== `Bearer ${process.env.JWT_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const MEDIA_DIR = path.join(process.cwd(), 'public', 'media');
        
        if (!fs.existsSync(MEDIA_DIR)) {
            return NextResponse.json({ message: 'Media directory not found. Nothing to clean.' });
        }

        const files = fs.readdirSync(MEDIA_DIR);
        
        const messages = await prisma.message.findMany({
            where: { attachments: { not: null } },
            select: { attachments: true }
        });

        const broadcasts = await prisma.broadcast.findMany({
            where: { mediaUrl: { not: null } },
            select: { mediaUrl: true }
        });

        const referencedFiles = new Set<string>();
        
        // Parse message attachments
        messages.forEach(msg => {
            if (!msg.attachments) return;
            try {
                const data = JSON.parse(msg.attachments as string);
                if (Array.isArray(data)) {
                    data.forEach(item => {
                        if (typeof item === 'string') referencedFiles.add(path.basename(item));
                    });
                } else if (typeof data === 'string') {
                    referencedFiles.add(path.basename(data));
                }
            } catch (e) {
                referencedFiles.add(path.basename(msg.attachments as string));
            }
        });

        // Parse broadcast mediaUrls
        broadcasts.forEach(b => {
            if (b.mediaUrl) referencedFiles.add(path.basename(b.mediaUrl));
        });

        let deletedCount = 0;
        let savedSpaceBytes = 0;
        const deletedFiles: string[] = [];

        for (const file of files) {
            if (file === '.gitkeep' || file === 'placeholder.txt') continue;

            if (!referencedFiles.has(file)) {
                const filePath = path.join(MEDIA_DIR, file);
                try {
                    const stats = fs.statSync(filePath);
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    savedSpaceBytes += stats.size;
                    deletedFiles.push(file);
                } catch (err) {
                    console.error(`Failed to delete ${file}:`, err);
                }
            }
        }

        const savedMB = (savedSpaceBytes / 1024 / 1024).toFixed(2);
        
        return NextResponse.json({
            message: 'Cleanup successful',
            scannedFiles: files.length,
            deletedCount,
            savedSpaceMB: savedMB,
            deletedFiles
        });

    } catch (error: any) {
        console.error('Cleanup API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

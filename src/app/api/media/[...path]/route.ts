import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path: pathArray } = await params;
    const filePath = path.join(process.cwd(), 'public', 'media', ...pathArray);

    if (!fs.existsSync(filePath)) {
        return new NextResponse('Not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = pathArray[pathArray.length - 1].split('.').pop()?.toLowerCase();
    
    let mimeType = 'application/octet-stream';
    if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
    else if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'gif') mimeType = 'image/gif';
    else if (ext === 'webp') mimeType = 'image/webp';
    else if (ext === 'mp4') mimeType = 'video/mp4';
    else if (ext === 'webm') mimeType = 'video/webm';
    else if (ext === 'mp3') mimeType = 'audio/mpeg';
    else if (ext === 'ogg') mimeType = 'audio/ogg';

    return new NextResponse(fileBuffer, {
        headers: {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    });
}

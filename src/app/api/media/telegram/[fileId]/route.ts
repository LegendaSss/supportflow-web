export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ fileId: string }> }
) {
    try {
        const { fileId } = await params;
        if (!fileId) return new NextResponse('Missing fileId', { status: 400 });

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) return new NextResponse('Missing Bot Token', { status: 500 });
        
        // Step 1: Retrieve the temporary file path from Telegram
        const fileInfoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
        const fileInfo = await fileInfoRes.json();
        
        if (!fileInfo.ok) {
            return new NextResponse('Telegram file fetch error', { status: 404 });
        }
        
        const filePath = fileInfo.result.file_path;
        
        // Step 2: Proxy the actual file bytes natively to the client
        const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
        const fileStreamRes = await fetch(fileUrl);
        
        if (!fileStreamRes.ok) {
            return new NextResponse('Telegram download error', { status: 502 });
        }
        
        // Pipe the body stream with aggressive caching
        return new NextResponse(fileStreamRes.body, {
            headers: {
                'Content-Type': fileStreamRes.headers.get('Content-Type') || 'application/octet-stream',
                'Cache-Control': 'public, max-age=31536000, immutable',
            }
        });
    } catch (error) {
        console.error('Error proxying telegram file:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

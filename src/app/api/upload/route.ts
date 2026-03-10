export const dynamic = 'force-dynamic';

import { writeFile, mkdir } from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
    try {
        const data = await request.formData()
        const file: File | null = data.get('file') as unknown as File

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const mediaDir = path.join(process.cwd(), 'public', 'media')
        if (!existsSync(mediaDir)) {
            await mkdir(mediaDir, { recursive: true })
        }

        const filename = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`
        const filepath = path.join(mediaDir, filename)
        await writeFile(filepath, buffer)

        console.log('[Upload] File saved to:', filepath)
        return NextResponse.json({ success: true, url: `/media/${filename}` })
    } catch (error: any) {
        console.error('[Upload Error]:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

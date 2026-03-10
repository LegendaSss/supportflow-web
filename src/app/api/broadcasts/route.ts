import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Получить список рассылок
export async function GET() {
    try {
        const broadcasts = await prisma!.broadcast.findMany({
            orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json(broadcasts)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch broadcasts' }, { status: 500 })
    }
}

// Создать новую рассылку
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { title, content, mediaUrl, mediaType, targetFilters } = body

        const broadcast = await prisma!.broadcast.create({
            data: {
                title,
                content,
                mediaUrl: mediaUrl || null,
                mediaType: mediaType || null,
                targetFilters: targetFilters ? JSON.stringify(targetFilters) : null,
                status: 'draft'
            }
        })

        return NextResponse.json(broadcast)
    } catch (error) {
        console.error('[Broadcast Create Error]:', error)
        return NextResponse.json({ error: 'Failed to create broadcast' }, { status: 500 })
    }
}

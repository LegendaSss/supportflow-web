import { prisma } from '@/lib/prisma'
import { editBroadcastToTelegram } from '@/lib/bot'
import { NextResponse } from 'next/server'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const { content } = await request.json()

    if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 })

    try {
        const broadcast = await prisma!.broadcast.findUnique({
            where: { id },
            include: { recipients: { where: { status: 'sent' } } }
        })

        if (!broadcast) {
            return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })
        }

        // Обновляем текст в базе
        await prisma!.broadcast.update({
            where: { id },
            data: { content }
        })

        // Фоновый процесс редактирования
        const editMessages = async () => {
            const CONCURRENCY = 5
            const recipients = broadcast.recipients

            for (let i = 0; i < recipients.length; i += CONCURRENCY) {
                const chunk = recipients.slice(i, i + CONCURRENCY)
                await Promise.all(chunk.map(async (recipient) => {
                    await editBroadcastToTelegram(
                        recipient.telegramId,
                        recipient.messageId,
                        content,
                        !!broadcast.mediaUrl
                    )
                }))

                // Small delay to prevent hitting burst limits
                await new Promise(r => setTimeout(r, 100))
            }
        }

        editMessages()

        return NextResponse.json({ success: true, count: broadcast.recipients.length })

    } catch (error) {
        console.error('[Broadcast Edit Sent Error]:', error)
        return NextResponse.json({ error: 'Failed to edit sent messages' }, { status: 500 })
    }
}

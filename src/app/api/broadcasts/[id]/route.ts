export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma'
import { deleteBroadcastToTelegram } from '@/lib/bot'
import { NextResponse } from 'next/server'

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    try {
        const broadcast = await prisma!.broadcast.findUnique({
            where: { id },
            include: { recipients: { where: { status: 'sent' } } }
        })

        if (!broadcast) {
            return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })
        }

        // Фоновый процесс удаления сообщений из Telegram (параллельно)
        const deleteFromTelegram = async () => {
            const CONCURRENCY = 10
            const recipients = broadcast.recipients

            for (let i = 0; i < recipients.length; i += CONCURRENCY) {
                const chunk = recipients.slice(i, i + CONCURRENCY)
                await Promise.all(chunk.map(async (recipient) => {
                    await deleteBroadcastToTelegram(recipient.telegramId, recipient.messageId)
                }))
                // Небольшая пауза для соблюдения лимитов
                await new Promise(r => setTimeout(r, 50))
            }
        }

        // Запускаем удаление в Telegram
        await deleteFromTelegram()

        // Теперь удаляем из базы (каскадно или вручную)
        await prisma!.broadcastRecipient.deleteMany({
            where: { broadcastId: id }
        })

        await prisma!.broadcast.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[Broadcast Delete Error]:', error)
        return NextResponse.json({ error: 'Failed to delete broadcast and remote messages' }, { status: 500 })
    }
}

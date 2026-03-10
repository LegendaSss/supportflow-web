export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { editTelegramMessage, deleteTelegramMessage } from '@/lib/bot'

// Редактирование сообщения
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string, msgId: string }> }
) {
    const { id, msgId } = await params
    const body = await request.json()

    const message = await prisma!.message.findUnique({
        where: { id: msgId },
        include: { ticket: { include: { client: true } } }
    })

    if (!message) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (message.mediaType) {
        return NextResponse.json({ error: 'Cannot edit media messages' }, { status: 400 })
    }

    // Если есть ID сообщения в ТГ и клиент привязан — редактируем в ТГ
    if (message.telegramMsgId && message.ticket.client?.telegramId) {
        const success = await editTelegramMessage(
            message.ticket.client.telegramId,
            message.telegramMsgId,
            body.content,
            !!message.mediaType
        )
        if (!success) {
            console.error('Failed to edit telegram message')
        }
    }

    // Обновляем в БД
    const updated = await prisma!.message.update({
        where: { id: msgId },
        data: {
            content: body.content,
            isEdited: true,
        },
    })

    return NextResponse.json(updated)
}

// Удаление сообщения
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string, msgId: string }> }
) {
    const { id, msgId } = await params

    const message = await prisma!.message.findUnique({
        where: { id: msgId },
        include: { ticket: { include: { client: true } } }
    })

    if (!message) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Удаляем в ТГ
    if (message.telegramMsgId && message.ticket.client?.telegramId) {
        const success = await deleteTelegramMessage(
            message.ticket.client.telegramId,
            message.telegramMsgId
        )
        if (!success) {
            console.error('Failed to delete telegram message')
        }
    }

    // Удаляем из БД
    await prisma!.message.delete({
        where: { id: msgId },
    })

    return NextResponse.json({ success: true })
}

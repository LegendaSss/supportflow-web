export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { sendToTelegram } from '@/lib/bot'
import path from 'path'
import fs from 'fs'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    const contentType = request.headers.get('content-type') || ''

    let content = ''
    let senderType = 'operator'
    let operatorId: string | undefined = undefined
    let mediaType: string | undefined = undefined
    let mediaUrl: string | undefined = undefined
    let fileName: string | undefined = undefined

    let isInternal = false

    if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData()
        content = (formData.get('content') as string) || ''
        senderType = (formData.get('senderType') as string) || 'operator'
        operatorId = (formData.get('operatorId') as string) || undefined
        mediaType = (formData.get('mediaType') as string) || undefined
        isInternal = formData.get('isInternal') === 'true'

        const file = formData.get('file') as File | null
        if (file) {
            const bytes = await file.arrayBuffer()
            const buffer = Buffer.from(bytes)

            const MEDIA_DIR = path.join(process.cwd(), 'public', 'media')
            if (!fs.existsSync(MEDIA_DIR)) {
                fs.mkdirSync(MEDIA_DIR, { recursive: true })
            }

            const ext = file.name ? file.name.split('.').pop() : 'bin'
            fileName = file.name
            const saveName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
            const localPath = path.join(MEDIA_DIR, saveName)

            fs.writeFileSync(localPath, buffer)

            mediaUrl = `/media/${saveName}`
            if (!mediaType) mediaType = 'document'
        }
    } else {
        const body = await request.json()
        content = body.content || ''
        senderType = body.senderType || 'operator'
        operatorId = body.operatorId || undefined
        isInternal = !!body.isInternal
    }

    // Обновляем статус тикета на "open" если он был "new"
    const ticket = await prisma!.ticket.findUnique({
        where: { id },
        include: { client: true },
    })

    if (ticket && ticket.status === 'new') {
        await prisma!.ticket.update({
            where: { id },
            data: { status: 'open' },
        })
    }

    let message;

    // Если клиент привязан к Telegram, отправляем и сохраняем через бота
    // НО: системные сообщения (диагностика и т.д.) и ВНУТРЕННИЕ заметки в Телеграм НЕ отправляем
    if (ticket?.client?.telegramId && senderType !== 'system' && !isInternal) {
        const media = mediaUrl && mediaType ? { url: mediaUrl, type: mediaType, fileName } : undefined
        message = await sendToTelegram(
            ticket.client.telegramId,
            content,
            id,
            operatorId,
            media
        )
    }

    // Если бот не отправлял/не сохранял, сохраняем вручную (например, внутренние заметки или нет ТГ)
    if (!message) {
        message = await prisma!.message.create({
            data: {
                ticketId: id,
                content: content,
                senderType,
                operatorId,
                mediaType,
                mediaUrl,
                fileName,
                isInternal,
            },
        })
    }

    return NextResponse.json(message)
}

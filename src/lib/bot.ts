import { Bot, Context, InputFile } from 'grammy'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/logger'
import fs from 'fs'
import path from 'path'

// Защита от одновременного создания тикетов для одного клиента
const pendingTicketCreations = new Set<string>()

let botInstance: Bot | null = null
let isRunning = false

// Папка для хранения медиа-файлов
const MEDIA_DIR = path.join(process.cwd(), 'public', 'media')

function ensureMediaDir() {
    if (!fs.existsSync(MEDIA_DIR)) {
        fs.mkdirSync(MEDIA_DIR, { recursive: true })
    }
}

// Ленивая инициализация бота
function getBot(): Bot | null {
    if (botInstance) return botInstance
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return null
    botInstance = new Bot(token)
    return botInstance
}

// Скачивание файла из Telegram
async function downloadFile(bot: Bot, fileId: string, ext: string): Promise<string> {
    ensureMediaDir()
    const file = await bot.api.getFile(fileId)
    const filePath = file.file_path!
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const localPath = path.join(MEDIA_DIR, fileName)

    const url = `https://api.telegram.org/file/bot${bot.token}/${filePath}`
    const response = await fetch(url)
    const buffer = Buffer.from(await response.arrayBuffer())
    fs.writeFileSync(localPath, buffer)

    return `/media/${fileName}`
}

// Получить или создать клиента
async function getOrCreateClient(from: Context['from']) {
    if (!from) return null

    let client = await prisma!.client.findUnique({
        where: { telegramId: String(from.id) },
    })

    if (!client) {
        client = await prisma!.client.create({
            data: {
                telegramId: String(from.id),
                username: from.username || null,
                firstName: from.first_name || null,
                lastName: from.last_name || null,
            },
        })
        logActivity('user_joined', `Новый пользователь: ${from.first_name || ''} ${from.last_name || ''} (@${from.username || 'ID:' + from.id})`.trim(), { telegramId: from.id })
    } else {
        // Обновляем данные клиента
        await prisma!.client.update({
            where: { id: client.id },
            data: {
                username: from.username || client.username,
                firstName: from.first_name || client.firstName,
                lastName: from.last_name || client.lastName,
            },
        })
    }

    return client
}

// Получить или создать активный тикет для клиента
async function getOrCreateTicket(clientId: string) {
    // Ждем, если тикет для этого клиента сейчас создается в другом потоке
    let attempts = 0
    while (pendingTicketCreations.has(clientId) && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500))
        attempts++
    }

    // Ищем последний тикет клиента (любой кроме возможно совсем старых, но для начала ищем активный)
    let ticket = await prisma!.ticket.findFirst({
        where: {
            clientId,
            status: { in: ['new', 'open', 'pending', 'resolved'] },
        },
        orderBy: { createdAt: 'desc' },
    })

    // Если нашли решенный тикет - открываем его снова
    if (ticket && ticket.status === 'resolved') {
        ticket = await prisma!.ticket.update({
            where: { id: ticket.id },
            data: { status: 'open', updatedAt: new Date() }
        })
        return ticket
    }

    if (ticket) return ticket

    // Если активного нет - создаем новый, блокируя повторные запросы
    pendingTicketCreations.add(clientId)
    try {
        // Повторная проверка внутри "замка"
        const doubleCheck = await prisma!.ticket.findFirst({
            where: { clientId, status: { in: ['new', 'open', 'pending'] } },
            orderBy: { createdAt: 'desc' },
        })
        if (doubleCheck) return doubleCheck

        const count = await prisma!.ticket.count()
        ticket = await prisma!.ticket.create({
            data: {
                clientId,
                number: count + 1,
                status: 'new',
            },
        })
        logActivity('ticket_created', `Создан новый тикет #${ticket.number}`, { ticketId: ticket.id, clientId: ticket.clientId })
        return ticket
    } finally {
        pendingTicketCreations.delete(clientId)
    }
}

// Сохранить сообщение
async function saveMessage(data: {
    ticketId: string
    clientId: string
    content: string
    mediaType?: string
    mediaUrl?: string
    mediaFileId?: string
    fileName?: string
    duration?: number
    telegramMsgId?: number
}) {
    const msg = await prisma!.message.create({
        data: {
            ticketId: data.ticketId,
            content: data.content,
            senderType: 'client',
            clientId: data.clientId,
            mediaType: data.mediaType || null,
            mediaUrl: data.mediaUrl || null,
            mediaFileId: data.mediaFileId || null,
            fileName: data.fileName || null,
            duration: data.duration || null,
            telegramMsgId: data.telegramMsgId || null,
        },
    })

    // Log activity for admin notifications
    const client = await prisma!.client.findUnique({ where: { id: data.clientId }, select: { firstName: true, username: true } })
    const name = client?.firstName || client?.username || 'Пользователь'
    const preview = data.mediaType ? `📎 ${data.mediaType}` : data.content.substring(0, 50)
    await logActivity('message_received', `💬 ${name}: ${preview}`)

    return msg
}

// Проверка авто-ответов
async function checkAutoResponses(text: string): Promise<string | null> {
    const autoResponses = await prisma!.autoResponse.findMany({
        where: { isActive: true },
    })

    const lowerText = text.toLowerCase()

    for (const ar of autoResponses) {
        try {
            const keywords: string[] = JSON.parse(ar.keywords)
            for (const kw of keywords) {
                if (lowerText.includes(kw.toLowerCase())) {
                    return ar.responseText
                }
            }
        } catch {
            continue
        }
    }

    return null
}

// Отправить ответ клиенту в Telegram
export async function sendToTelegram(
    telegramId: string,
    text: string,
    ticketId: string,
    operatorId?: string,
    media?: {
        url: string
        type: string
        fileName?: string
    }
) {
    const bot = getBot()
    if (!bot) {
        console.error('[sendToTelegram] Bot not initialized (no token or instance)')
        return null
    }

    try {
        console.log(`[sendToTelegram] Sending to ${telegramId}, text length: ${text.length}, media:`, media)
        let sent;
        if (media) {
            const cleanUrl = media.url.startsWith('/') ? media.url.slice(1) : media.url
            const localPath = path.join(process.cwd(), 'public', cleanUrl)

            console.log(`[sendToTelegram] Local path: ${localPath}, exists: ${fs.existsSync(localPath)}`)

            if (!fs.existsSync(localPath)) {
                console.error('Media file not found at:', localPath)
                return null
            }

            const inputFile = new InputFile(localPath, media.fileName)

            if (media.type === 'photo') {
                sent = await bot.api.sendPhoto(telegramId, inputFile, { caption: text })
            } else if (media.type === 'video') {
                sent = await bot.api.sendVideo(telegramId, inputFile, { caption: text })
            } else if (media.type === 'voice') {
                sent = await bot.api.sendVoice(telegramId, inputFile)
            } else {
                sent = await bot.api.sendDocument(telegramId, inputFile, { caption: text })
            }
        } else {
            sent = await bot.api.sendMessage(telegramId, text)
        }

        console.log(`[sendToTelegram] Successfully sent, msgId: ${sent.message_id}`)

        const message = await prisma!.message.create({
            data: {
                ticketId,
                content: text,
                senderType: 'operator',
                operatorId: operatorId || null,
                telegramMsgId: sent.message_id,
                mediaType: media?.type || null,
                mediaUrl: media?.url || null,
                fileName: media?.fileName || null,
            },
        })

        return message
    } catch (error) {
        console.error('[sendToTelegram] ERROR:', error)
        return null
    }
}

// Отправить массовую рассылку (без тикета)
export async function broadcastToTelegram(
    telegramId: string,
    text: string,
    media?: {
        url: string
        type: string
        fileName?: string
    }
) {
    const bot = getBot()
    if (!bot) return { success: false, error: 'Bot not initialized' }

    try {
        const options: any = {
            parse_mode: 'HTML',
        }

        let sent;
        if (media) {
            const cleanUrl = media.url.startsWith('/') ? media.url.slice(1) : media.url
            const localPath = path.join(process.cwd(), 'public', cleanUrl)

            if (!fs.existsSync(localPath)) {
                // Fallback to text if file missing
                sent = await bot.api.sendMessage(telegramId, text, options)
                return { success: true, messageId: sent.message_id }
            }

            const inputFile = new InputFile(localPath, media.fileName)
            if (media.type === 'photo') {
                sent = await bot.api.sendPhoto(telegramId, inputFile, { ...options, caption: text })
            } else if (media.type === 'video') {
                sent = await bot.api.sendVideo(telegramId, inputFile, { ...options, caption: text })
            } else {
                sent = await bot.api.sendDocument(telegramId, inputFile, { ...options, caption: text })
            }
        } else {
            sent = await bot.api.sendMessage(telegramId, text, options)
        }

        return { success: true, messageId: sent.message_id }
    } catch (error: any) {
        console.error(`[broadcastToTelegram] Error sending to ${telegramId}:`, error.message)
        return { success: false, error: error.message }
    }
}

// Редактировать уже отправленное сообщение рассылки
export async function editBroadcastToTelegram(
    telegramId: string,
    messageId: number,
    newText: string,
    hasMedia: boolean
) {
    const bot = getBot()
    if (!bot) return { success: false, error: 'Bot not initialized' }

    try {
        if (hasMedia) {
            await bot.api.editMessageCaption(telegramId, messageId, { caption: newText, parse_mode: 'HTML' })
        } else {
            await bot.api.editMessageText(telegramId, messageId, newText, { parse_mode: 'HTML' })
        }
        return { success: true }
    } catch (error: any) {
        if (error.message?.includes('message is not modified')) return { success: true }
        console.error(`[editBroadcastToTelegram] Error editing ${messageId} for ${telegramId}:`, error.message)
        return { success: false, error: error.message }
    }
}

// Удалить уже отправленное сообщение рассылки
export async function deleteBroadcastToTelegram(
    telegramId: string,
    messageId: number
) {
    const bot = getBot()
    if (!bot) return { success: false, error: 'Bot not initialized' }

    try {
        await bot.api.deleteMessage(telegramId, messageId)
        return { success: true }
    } catch (error: any) {
        // Если сообщение уже удалено или не существует — считаем успехом
        if (error.message?.includes('message to delete not found')) return { success: true }
        console.error(`[deleteBroadcastToTelegram] Error deleting ${messageId} for ${telegramId}:`, error.message)
        return { success: false, error: error.message }
    }
}

// Инициализация и запуск бота
export async function startBot(): Promise<{ success: boolean; error?: string }> {
    const token = process.env.TELEGRAM_BOT_TOKEN

    if (!token) {
        return { success: false, error: 'TELEGRAM_BOT_TOKEN не установлен в .env' }
    }

    if (isRunning && botInstance) {
        return { success: true }
    }

    try {
        const bot = getBot()
        if (!bot) return { success: false, error: 'TELEGRAM_BOT_TOKEN не установлен' }

        // Перед запуском polling удаляем вебхук на случай, если он был установлен ранее
        try {
            await bot.api.deleteWebhook({ drop_pending_updates: true })
        } catch (e) {
            console.log('No webhook to delete')
        }

        // === ОБРАБОТКА ТЕКСТОВЫХ СООБЩЕНИЙ ===
        bot.on('message:text', async (ctx) => {
            const client = await getOrCreateClient(ctx.from)
            if (!client || client.isBlocked) return

            const ticket = await getOrCreateTicket(client.id)

            await saveMessage({
                ticketId: ticket.id,
                clientId: client.id,
                content: ctx.message.text,
                telegramMsgId: ctx.message.message_id,
            })

            // Проверяем авто-ответы
            const autoReply = await checkAutoResponses(ctx.message.text)
            if (autoReply) {
                const sent = await ctx.reply(autoReply)
                await prisma!.message.create({
                    data: {
                        ticketId: ticket.id,
                        content: autoReply,
                        senderType: 'system',
                        telegramMsgId: sent.message_id,
                    },
                })
            }
        })

        // === ОБРАБОТКА ФОТО ===
        bot.on('message:photo', async (ctx) => {
            const client = await getOrCreateClient(ctx.from)
            if (!client || client.isBlocked) return

            const ticket = await getOrCreateTicket(client.id)
            const photo = ctx.message.photo[ctx.message.photo.length - 1] // Максимальное качество

            let mediaUrl: string | undefined
            try {
                mediaUrl = await downloadFile(bot, photo.file_id, 'jpg')
            } catch (e) {
                console.error('Failed to download photo:', e)
            }

            await saveMessage({
                ticketId: ticket.id,
                clientId: client.id,
                content: ctx.message.caption || '📷 Фото',
                mediaType: 'photo',
                mediaUrl,
                mediaFileId: photo.file_id,
                telegramMsgId: ctx.message.message_id,
            })
        })

        // === ОБРАБОТКА ВИДЕО ===
        bot.on('message:video', async (ctx) => {
            const client = await getOrCreateClient(ctx.from)
            if (!client || client.isBlocked) return

            const ticket = await getOrCreateTicket(client.id)
            const video = ctx.message.video

            let mediaUrl: string | undefined
            try {
                mediaUrl = await downloadFile(bot, video.file_id, 'mp4')
            } catch (e) {
                console.error('Failed to download video:', e)
            }

            await saveMessage({
                ticketId: ticket.id,
                clientId: client.id,
                content: ctx.message.caption || '🎬 Видео',
                mediaType: 'video',
                mediaUrl,
                mediaFileId: video.file_id,
                fileName: video.file_name || undefined,
                duration: video.duration,
                telegramMsgId: ctx.message.message_id,
            })
        })

        // === ОБРАБОТКА ГОЛОСОВЫХ ===
        bot.on('message:voice', async (ctx) => {
            const client = await getOrCreateClient(ctx.from)
            if (!client || client.isBlocked) return

            const ticket = await getOrCreateTicket(client.id)
            const voice = ctx.message.voice

            let mediaUrl: string | undefined
            try {
                mediaUrl = await downloadFile(bot, voice.file_id, 'ogg')
            } catch (e) {
                console.error('Failed to download voice:', e)
            }

            await saveMessage({
                ticketId: ticket.id,
                clientId: client.id,
                content: '🎤 Голосовое сообщение',
                mediaType: 'voice',
                mediaUrl,
                mediaFileId: voice.file_id,
                duration: voice.duration,
                telegramMsgId: ctx.message.message_id,
            })
        })

        // === ОБРАБОТКА АУДИО ===
        bot.on('message:audio', async (ctx) => {
            const client = await getOrCreateClient(ctx.from)
            if (!client || client.isBlocked) return

            const ticket = await getOrCreateTicket(client.id)
            const audio = ctx.message.audio

            let mediaUrl: string | undefined
            try {
                const ext = audio.file_name?.split('.').pop() || 'mp3'
                mediaUrl = await downloadFile(bot, audio.file_id, ext)
            } catch (e) {
                console.error('Failed to download audio:', e)
            }

            await saveMessage({
                ticketId: ticket.id,
                clientId: client.id,
                content: `🎵 ${audio.title || audio.file_name || 'Аудио'}`,
                mediaType: 'audio',
                mediaUrl,
                mediaFileId: audio.file_id,
                fileName: audio.file_name || undefined,
                duration: audio.duration,
                telegramMsgId: ctx.message.message_id,
            })
        })

        // === ОБРАБОТКА ДОКУМЕНТОВ ===
        bot.on('message:document', async (ctx) => {
            const client = await getOrCreateClient(ctx.from)
            if (!client || client.isBlocked) return

            const ticket = await getOrCreateTicket(client.id)
            const doc = ctx.message.document

            let mediaUrl: string | undefined
            try {
                const ext = doc.file_name?.split('.').pop() || 'bin'
                mediaUrl = await downloadFile(bot, doc.file_id, ext)
            } catch (e) {
                console.error('Failed to download document:', e)
            }

            await saveMessage({
                ticketId: ticket.id,
                clientId: client.id,
                content: ctx.message.caption || `📎 ${doc.file_name || 'Документ'}`,
                mediaType: 'document',
                mediaUrl,
                mediaFileId: doc.file_id,
                fileName: doc.file_name || undefined,
                telegramMsgId: ctx.message.message_id,
            })
        })

        // === ОБРАБОТКА СТИКЕРОВ ===
        bot.on('message:sticker', async (ctx) => {
            const client = await getOrCreateClient(ctx.from)
            if (!client || client.isBlocked) return

            const ticket = await getOrCreateTicket(client.id)
            const sticker = ctx.message.sticker

            let mediaUrl: string | undefined
            try {
                if (sticker.thumbnail) {
                    mediaUrl = await downloadFile(bot, sticker.thumbnail.file_id, 'webp')
                }
            } catch (e) {
                console.error('Failed to download sticker:', e)
            }

            await saveMessage({
                ticketId: ticket.id,
                clientId: client.id,
                content: sticker.emoji || '🏷️ Стикер',
                mediaType: 'sticker',
                mediaUrl,
                mediaFileId: sticker.file_id,
                telegramMsgId: ctx.message.message_id,
            })
        })

        // === ОБРАБОТКА РЕДАКТИРОВАНИЯ СООБЩЕНИЙ ===
        bot.on('edited_message', async (ctx) => {
            if (!ctx.editedMessage) return
            const msgId = ctx.editedMessage.message_id
            const newText = ctx.editedMessage.text || ctx.editedMessage.caption || ''

            await prisma!.message.updateMany({
                where: { telegramMsgId: msgId },
                data: { content: newText, isEdited: true },
            })
        })

        // === ОБРАБОТКА ВИДЕО-СООБЩЕНИЙ (КРУЖОЧКИ) ===
        bot.on('message:video_note', async (ctx) => {
            const client = await getOrCreateClient(ctx.from)
            if (!client || client.isBlocked) return

            const ticket = await getOrCreateTicket(client.id)
            const videoNote = ctx.message.video_note

            let mediaUrl: string | undefined
            try {
                mediaUrl = await downloadFile(bot, videoNote.file_id, 'mp4')
            } catch (e) {
                console.error('Failed to download video note:', e)
            }

            await saveMessage({
                ticketId: ticket.id,
                clientId: client.id,
                content: '🔵 Видеосообщение',
                mediaType: 'video',
                mediaUrl,
                mediaFileId: videoNote.file_id,
                duration: videoNote.duration,
                telegramMsgId: ctx.message.message_id,
            })
        })

        // Обработка ошибок
        bot.catch((err) => {
            console.error('Bot error:', err)
        })

        // Запуск через polling
        bot.start({
            onStart: () => {
                console.log('🤖 SupportFlow Bot запущен!')
            },
        })

        botInstance = bot
        isRunning = true

        return { success: true }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('Failed to start bot:', message)
        return { success: false, error: message }
    }
}

// Остановка бота
export async function stopBot(): Promise<void> {
    if (botInstance) {
        await botInstance.stop()
        botInstance = null
        isRunning = false
    }
}

// Статус бота
export function getBotStatus(): { running: boolean; hasToken: boolean } {
    return {
        running: isRunning,
        hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
    }
}

// Редактирование сообщения
export async function editTelegramMessage(
    telegramId: string,
    telegramMsgId: number,
    newText: string,
    hasMedia: boolean
): Promise<boolean> {
    const bot = getBot()
    if (!bot) return false
    try {
        if (hasMedia) {
            await bot.api.editMessageCaption(telegramId, telegramMsgId, { caption: newText })
        } else {
            await bot.api.editMessageText(telegramId, telegramMsgId, newText)
        }
        return true
    } catch (error) {
        console.error('Failed to edit in Telegram:', error)
        return false
    }
}

// Удаление сообщения
export async function deleteTelegramMessage(
    telegramId: string,
    telegramMsgId: number
): Promise<boolean> {
    const bot = getBot()
    if (!bot) return false
    try {
        await bot.api.deleteMessage(telegramId, telegramMsgId)
        return true
    } catch (error) {
        console.error('Failed to delete in Telegram:', error)
        return false
    }
}

// Автозапуск бота при загрузке модуля (с защитой от повторного запуска при HMR)
const globalAny = globalThis as any
if (process.env.TELEGRAM_BOT_TOKEN && !isRunning && !globalAny.__botAutoStarted) {
    globalAny.__botAutoStarted = true
    startBot().then((result) => {
        if (result.success) {
            console.log('✅ Бот запущен автоматически')
        } else {
            globalAny.__botAutoStarted = false
            console.error('❌ Ошибка автозапуска бота:', result.error)
        }
    })
}

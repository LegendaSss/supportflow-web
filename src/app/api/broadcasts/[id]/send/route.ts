export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma'
import { broadcastToTelegram } from '@/lib/bot'
import { logActivity } from '@/lib/logger'
import { NextResponse } from 'next/server'
import { remnawave } from '@/lib/remnawave'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    try {
        const broadcast = await prisma!.broadcast.findUnique({
            where: { id }
        })

        if (!broadcast) {
            return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })
        }

        if (broadcast.status === 'sending') {
            return NextResponse.json({ error: 'Broadcast already in progress' }, { status: 400 })
        }

        // Парсим фильтры
        const filters = broadcast.targetFilters ? JSON.parse(broadcast.targetFilters) : {}

        // Формируем запрос к клиентам
        const where: any = {
            isBlocked: false
        }

        if (filters.tariffId) where.tariffId = filters.tariffId
        if (filters.minBalance) where.balance = { gte: parseFloat(filters.minBalance) }

        // Получаем клиентов из локальной БД
        let clients = await prisma!.client.findMany({ where })

        // Фильтрация по VPN Аудитории (если указано)
        if (filters.vpnAudience && filters.vpnAudience !== 'all') {
            // Чтобы не делать тысячи запросов, загружаем всех пользователей из Ремнавэйв один раз
            // (или можно было бы постранично, но /api/users обычно возвращает всех)
            const rwResponse: any = await remnawave.getUsers()
            const rwUsers = rwResponse?.users || []

            const rwMap = new Map()
            rwUsers.forEach((u: any) => {
                if (u.uuid) rwMap.set(u.uuid, u)
            })

            const now = Date.now()
            const threeDaysMs = 3 * 24 * 60 * 60 * 1000

            clients = clients.filter(client => {
                const rwUser = rwMap.get(client.remnawareId)
                if (!rwUser) return false

                if (filters.vpnAudience === 'low_traffic') {
                    const limit = rwUser.trafficLimitBytes || 0
                    const used = rwUser.userTraffic?.usedTrafficBytes || 0
                    return limit > 0 && (used / limit) > 0.8
                }

                if (filters.vpnAudience === 'expiring_soon') {
                    if (!rwUser.expireAt) return false
                    const expireTime = new Date(rwUser.expireAt).getTime()
                    return expireTime > now && (expireTime - now) < threeDaysMs
                }

                if (filters.vpnAudience === 'expired') {
                    const isExpiredDate = rwUser.expireAt && new Date(rwUser.expireAt).getTime() < now
                    const isNotActive = rwUser.status !== 'ACTIVE'
                    const isTrafficExceeded = rwUser.trafficLimitBytes > 0 && (rwUser.userTraffic?.usedTrafficBytes >= rwUser.trafficLimitBytes)
                    return isExpiredDate || isNotActive || isTrafficExceeded
                }

                return true
            })
        }

        // Обновляем статус рассылки
        await prisma!.broadcast.update({
            where: { id },
            data: {
                status: 'sending',
                totalCount: clients.length,
                sentCount: 0,
                errorCount: 0,
                sentAt: new Date()
            }
        })

        // Фоновый процесс отправки (в Next.js это непросто без очередей, 
        // но для начала сделаем асинхронную итерацию)

        const sendMessages = async () => {
            const CONCURRENCY = 5
            const chunks: any[][] = []
            for (let i = 0; i < clients.length; i += CONCURRENCY) {
                chunks.push(clients.slice(i, i + CONCURRENCY))
            }

            let sentCount = 0
            let errorCount = 0

            for (const chunk of chunks) {
                const results = await Promise.all(chunk.map(async (client) => {
                    const result = await broadcastToTelegram(
                        client.telegramId,
                        broadcast.content,
                        broadcast.mediaUrl ? {
                            url: broadcast.mediaUrl,
                            type: broadcast.mediaType || 'photo'
                        } : undefined
                    )

                    if (result.success && result.messageId) {
                        return { client, messageId: result.messageId, success: true }
                    }
                    return { client, success: false }
                }))

                // Batch create recipients for the chunk
                const recipientsData = results
                    .filter(r => r.success)
                    .map(r => ({
                        broadcastId: id,
                        clientId: r.client.id,
                        telegramId: r.client.telegramId,
                        messageId: r.messageId!,
                        status: 'sent'
                    }))

                if (recipientsData.length > 0) {
                    await prisma!.broadcastRecipient.createMany({
                        data: recipientsData
                    })
                    sentCount += recipientsData.length
                }

                errorCount += (results.length - recipientsData.length)

                // Update broadcast progress
                await prisma!.broadcast.update({
                    where: { id },
                    data: {
                        sentCount,
                        errorCount,
                        status: (sentCount + errorCount) >= clients.length ? 'completed' : 'sending'
                    }
                })

                // Small delay to prevent hitting burst limits
                await new Promise(r => setTimeout(r, 100))
            }

            logActivity('broadcast_completed', `Рассылка "${broadcast.title}" завершена: ${sentCount} успешно, ${errorCount} ошибок`, { broadcastId: id })
        }

        // Запускаем без ожидания (fire and forget)
        sendMessages()

        return NextResponse.json({ success: true, targetCount: clients.length })

    } catch (error) {
        console.error('[Broadcast Send Error]:', error)
        return NextResponse.json({ error: 'Failed to start broadcast' }, { status: 500 })
    }
}

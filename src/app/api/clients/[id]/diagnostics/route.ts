import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { remnawave } from '@/lib/remnawave'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: clientId } = await params
        if (!clientId) return NextResponse.json({ error: 'Missing client id' }, { status: 400 })

        const client = await prisma!.client.findUnique({
            where: { id: clientId }
        })
        if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
        if (!client.remnawareId) return NextResponse.json({ error: 'Client not linked to VPN' }, { status: 400 })

        const rwUser = await remnawave.getUserByUuid(client.remnawareId)
        if (!rwUser) {
            return NextResponse.json({ error: 'Failed to fetch VPN status' }, { status: 500 })
        }

        // Construct Diagnostic Report
        const limitBytes = rwUser.trafficLimitBytes || 0
        const usedBytes = rwUser.userTraffic?.usedTrafficBytes || 0

        const isExpiredByDate = rwUser.expireAt && new Date(rwUser.expireAt).getTime() < Date.now()
        const isExhaustedByTraffic = limitBytes > 0 && usedBytes >= limitBytes
        const isActive = rwUser.status === 'ACTIVE'

        const warnings: string[] = []
        if (isExpiredByDate) warnings.push('Подписка истекла по времени.')
        if (isExhaustedByTraffic) warnings.push('Лимит трафика полностью исчерпан.')
        if (!isActive && rwUser.status !== 'ACTIVE') warnings.push(`Аккаунт отключен (Статус: ${rwUser.status}).`)

        // Calculate days remaining
        const daysRemaining = rwUser.expireAt
            ? Math.max(0, Math.ceil((new Date(rwUser.expireAt).getTime() - Date.now()) / 86400000))
            : null

        // Traffic percentage
        const trafficPercent = limitBytes > 0 ? Math.round((usedBytes / limitBytes) * 100) : 0

        // Online status
        const onlineAt = rwUser.onlineAt || rwUser.lastTrafficAt || null
        const isOnline = onlineAt && (Date.now() - new Date(onlineAt).getTime()) < 300000 // 5 min

        return NextResponse.json({
            username: rwUser.username || null,
            status: rwUser.status,
            expireAt: rwUser.expireAt,
            daysRemaining,
            trafficLimitBytes: limitBytes,
            usedTrafficBytes: usedBytes,
            trafficPercent,
            isOnline: !!isOnline,
            onlineAt,
            createdAt: rwUser.createdAt || null,
            hasSubscription: true,
            warnings,
            ok: warnings.length === 0,
        })

    } catch (error: any) {
        console.error('Diagnostics API error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

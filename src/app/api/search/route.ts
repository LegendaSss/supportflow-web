import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')

    if (!q || q.length < 2) {
        return NextResponse.json([])
    }

    try {
        // Поиск по тикетам (номер), клиентам (имя, юзернейм) и сообщениям (текст)
        const ticketsByName = await prisma!.ticket.findMany({
            where: {
                client: {
                    OR: [
                        { firstName: { contains: q } },
                        { lastName: { contains: q } },
                        { username: { contains: q } },
                        { telegramId: { contains: q } }
                    ]
                }
            },
            include: { client: true },
            take: 5
        })

        const messagesByContent = await prisma!.message.findMany({
            where: {
                content: { contains: q }
            },
            include: {
                ticket: { include: { client: true } }
            },
            take: 5
        })

        // Попробуем поискать по номеру тикета, если запрос похож на число
        let ticketsByNumber: any[] = []
        if (!isNaN(Number(q))) {
            ticketsByNumber = await prisma!.ticket.findMany({
                where: { number: Number(q) },
                include: { client: true },
                take: 2
            })
        }

        // Собираем уникальные результаты
        const resultsMap = new Map()

        ticketsByName.forEach(t => {
            if (!resultsMap.has(t.id)) resultsMap.set(t.id, { type: 'client', ticket: t })
        })

        ticketsByNumber.forEach(t => {
            if (!resultsMap.has(t.id)) resultsMap.set(t.id, { type: 'number', ticket: t })
        })

        messagesByContent.forEach(m => {
            if (!resultsMap.has(m.ticketId)) {
                resultsMap.set(m.ticketId, { type: 'message', ticket: m.ticket, match: m.content })
            }
        })

        return NextResponse.json(Array.from(resultsMap.values()))

    } catch (error) {
        console.error('Search error:', error)
        return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }
}

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || '7' // days

    try {
        const isAllTime = period === 'all'
        const days = isAllTime ? 90 : parseInt(period) // For charts we still need a span, taking 90 as default for 'all'

        const startDate = new Date()
        if (isAllTime) {
            startDate.setFullYear(2020, 0, 1) // Since inception
        } else {
            startDate.setDate(startDate.getDate() - days)
        }

        // 1. Tickets per day
        const tickets = await prisma!.ticket.findMany({
            where: { createdAt: { gte: startDate } },
            select: { createdAt: true, status: true }
        })

        const ticketsByDay: Record<string, number> = {}
        // For 'all' time, we group by month if it's too long? 
        // For now, let's keep daily but limit to last 30 days of activity for the chart even in 'all' view to prevent UI clutter
        const chartDays = isAllTime ? 30 : days
        for (let i = 0; i < chartDays; i++) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            ticketsByDay[d.toISOString().split('T')[0]] = 0
        }
        tickets.forEach(t => {
            const key = t.createdAt.toISOString().split('T')[0]
            if (ticketsByDay[key] !== undefined) ticketsByDay[key]++
        })

        const ticketsPerDay = Object.entries(ticketsByDay)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date))

        // 2. Average response time (time between first client msg and first operator msg)
        const ticketsWithMessages = await prisma!.ticket.findMany({
            where: { createdAt: { gte: startDate } },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    select: { senderType: true, createdAt: true }
                }
            }
        })

        let totalResponseTime = 0
        let responseCount = 0

        ticketsWithMessages.forEach(ticket => {
            const firstClient = ticket.messages.find(m => m.senderType === 'client')
            const firstOperator = ticket.messages.find(m => m.senderType === 'operator')
            if (firstClient && firstOperator) {
                const diff = firstOperator.createdAt.getTime() - firstClient.createdAt.getTime()
                if (diff > 0) {
                    totalResponseTime += diff
                    responseCount++
                }
            }
        })

        const avgResponseMinutes = responseCount > 0
            ? Math.round(totalResponseTime / responseCount / 60000)
            : 0

        // 3. Ticket status distribution
        const statusCounts = {
            new: await prisma!.ticket.count({ where: { status: 'new' } }),
            open: await prisma!.ticket.count({ where: { status: 'open' } }),
            pending: await prisma!.ticket.count({ where: { status: 'pending' } }),
            resolved: await prisma!.ticket.count({ where: { status: 'resolved' } }),
            closed: await prisma!.ticket.count({ where: { status: 'closed' } }),
        }

        // 4. Tariff distribution
        const tariffs = await prisma!.tariff.findMany({
            include: { _count: { select: { clients: true } } }
        })
        const tariffDistribution = tariffs.map(t => ({
            name: t.name,
            count: t._count.clients,
            price: t.price
        }))

        // 5. Revenue per day
        const transactions = await prisma!.transaction.findMany({
            where: { type: 'credit', createdAt: { gte: startDate } },
            select: { amount: true, createdAt: true }
        })

        const revenueByDay: Record<string, number> = {}
        for (let i = 0; i < chartDays; i++) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            revenueByDay[d.toISOString().split('T')[0]] = 0
        }
        transactions.forEach(tx => {
            const key = tx.createdAt.toISOString().split('T')[0]
            if (revenueByDay[key] !== undefined) revenueByDay[key] += tx.amount
        })

        const revenuePerDay = Object.entries(revenueByDay)
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date))

        // 6. Totals
        const totalTickets = await prisma!.ticket.count()
        const totalMessages = await prisma!.message.count()
        const totalClients = await prisma!.client.count()

        const totalRevenue = (await prisma!.transaction.aggregate({
            where: { type: 'credit' },
            _sum: { amount: true }
        }))._sum.amount || 0

        return NextResponse.json({
            ticketsPerDay,
            revenuePerDay,
            avgResponseMinutes,
            statusCounts,
            tariffDistribution,
            totals: { totalTickets, totalMessages, totalClients, totalRevenue }
        })

    } catch (error) {
        console.error('[Analytics API Error]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

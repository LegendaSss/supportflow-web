import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getBot } from '@/lib/bot'

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const ticketId = params.id
        if (!ticketId) return NextResponse.json({ error: 'Missing ticket ID' }, { status: 400 })

        // Find the ticket and the client to get telegramId
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            include: { client: true }
        })

        if (!ticket || !ticket.client?.telegramId) {
            return NextResponse.json({ error: 'Ticket or client not found' }, { status: 404 })
        }

        // Send 'typing' chat action via Telegram Bot API
        const bot = getBot()
        if (bot) {
            await bot.api.sendChatAction(ticket.client.telegramId, 'typing')
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[API Tickets Typing Error]', error)
        return NextResponse.json({ error: 'Failed to send typing action' }, { status: 500 })
    }
}

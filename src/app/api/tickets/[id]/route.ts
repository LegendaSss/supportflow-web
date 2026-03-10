export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    const ticket = await prisma!.ticket.findUnique({
        where: { id },
        include: {
            client: {
                include: {
                    tariff: true,
                    transactions: {
                        take: 10,
                        orderBy: { createdAt: 'desc' },
                    },
                },
            },
            operator: true,
            messages: {
                orderBy: { createdAt: 'asc' },
            },
        },
    })

    if (!ticket) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Отмечаем сообщения клиента как прочитанные
    const hasUnread = ticket.messages.some(m => m.senderType === 'client' && !m.isRead)
    if (hasUnread) {
        await prisma!.message.updateMany({
            where: {
                ticketId: id,
                senderType: 'client',
                isRead: false,
            },
            data: { isRead: true },
        })

        // Перезапрашиваем тикет с обновленными статусами
        const updatedTicket = await prisma!.ticket.findUnique({
            where: { id },
            include: {
                client: {
                    include: {
                        tariff: true,
                        transactions: { take: 10, orderBy: { createdAt: 'desc' } },
                    },
                },
                operator: true,
                messages: { orderBy: { createdAt: 'asc' } },
            }
        })
        return NextResponse.json(updatedTicket)
    }

    return NextResponse.json(ticket)
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const body = await request.json()

    const ticket = await prisma!.ticket.update({
        where: { id },
        data: {
            ...(body.status && { status: body.status }),
            ...(body.priority && { priority: body.priority }),
            ...(body.operatorId && { operatorId: body.operatorId }),
            ...(body.status === 'closed' && { closedAt: new Date() }),
        },
    })

    return NextResponse.json(ticket)
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    // 1. Удаляем все сообщения тикета
    await prisma!.message.deleteMany({
        where: { ticketId: id }
    })

    // 2. Удаляем сам тикет
    const ticket = await prisma!.ticket.delete({
        where: { id }
    })

    return NextResponse.json({ success: true, id: ticket.id })
}

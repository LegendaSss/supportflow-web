export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    try {
        const client = await prisma!.client.findUnique({
            where: { id },
            include: {
                tariff: true,
                tickets: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    include: { messages: { take: 1, orderBy: { createdAt: 'desc' } } }
                },
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 15
                },
                subscriptions: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            }
        })

        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 })
        }

        const totalSpent = client.transactions
            .filter(t => t.type === 'credit')
            .reduce((sum, t) => sum + t.amount, 0)

        return NextResponse.json({
            ...client,
            totalSpent,
            ticketCount: client.tickets.length,
        })

    } catch (error) {
        console.error('[Client Profile API Error]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

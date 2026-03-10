export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let where: any = {}
    if (status === 'active') {
        where = { status: { in: ['new', 'open', 'pending'] } }
    } else if (status && status !== 'all') {
        where = { status }
    }

    const tickets = await prisma!.ticket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            client: true,
            operator: true,
            messages: {
                take: 1,
                orderBy: { createdAt: 'desc' },
            },
        },
    })

    return NextResponse.json(tickets)
}

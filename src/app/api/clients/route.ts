export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const clients = await prisma!.client.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                tariff: { select: { name: true } },
                _count: { select: { tickets: true, transactions: true } }
            }
        })
        return NextResponse.json(clients)
    } catch (error) {
        console.error('[Clients List Error]:', error)
        return NextResponse.json([], { status: 500 })
    }
}

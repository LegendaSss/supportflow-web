import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
    const logs: string[] = []
    try {
        logs.push('Testing totalRevenue aggregate...')
        const revenue = await prisma!.transaction.aggregate({
            _sum: { amount: true },
            where: { type: 'credit', status: 'completed' }
        })
        logs.push(`Revenue Result: ${JSON.stringify(revenue)}`)

        logs.push('Testing client count...')
        const clientCount = await prisma!.client.count()
        logs.push(`Client count: ${clientCount}`)

        logs.push('Testing tariff query...')
        const tariffs = await prisma!.tariff.findMany({
            include: { _count: { select: { clients: true } } }
        })
        logs.push(`Tariffs found: ${tariffs.length}`)

        return NextResponse.json({ success: true, logs })
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            logs,
            error: error.message,
            stack: error.stack,
            code: error.code // Prisma error codes
        })
    }
}

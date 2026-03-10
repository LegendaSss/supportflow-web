import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const activities = await prisma!.activityLog.findMany({
            take: 20,
            orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json(activities)
    } catch (error) {
        console.error('[Activities API Error]:', error)
        return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
    }
}

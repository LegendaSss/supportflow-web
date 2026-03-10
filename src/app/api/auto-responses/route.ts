import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
    const items = await prisma!.autoResponse.findMany({
        orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(items)
}

export async function POST(request: Request) {
    const body = await request.json()
    const item = await prisma!.autoResponse.create({
        data: {
            name: body.name,
            keywords: body.keywords,
            responseText: body.responseText,
        },
    })
    return NextResponse.json(item)
}

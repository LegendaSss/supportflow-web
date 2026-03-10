export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
    const templates = await prisma!.template.findMany({
        orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(templates)
}

export async function POST(request: Request) {
    const body = await request.json()
    const template = await prisma!.template.create({
        data: {
            title: body.title,
            content: body.content,
            category: body.category || null,
        },
    })
    return NextResponse.json(template)
}

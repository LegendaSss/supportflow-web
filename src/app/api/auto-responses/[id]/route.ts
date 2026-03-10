export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const body = await request.json()

    const item = await prisma!.autoResponse.update({
        where: { id },
        data: {
            ...(body.name !== undefined && { name: body.name }),
            ...(body.keywords !== undefined && { keywords: body.keywords }),
            ...(body.responseText !== undefined && { responseText: body.responseText }),
            ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
    })

    return NextResponse.json(item)
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    await prisma!.autoResponse.delete({ where: { id } })
    return NextResponse.json({ success: true })
}

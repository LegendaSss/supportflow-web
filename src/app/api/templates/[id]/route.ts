import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const body = await request.json()

    const template = await prisma!.template.update({
        where: { id },
        data: {
            title: body.title,
            content: body.content,
            category: body.category || null,
        },
    })

    return NextResponse.json(template)
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    await prisma!.template.delete({ where: { id } })
    return NextResponse.json({ success: true })
}

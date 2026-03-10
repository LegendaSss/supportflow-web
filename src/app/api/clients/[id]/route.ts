import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const body = await request.json()

    try {
        const client = await prisma!.client.update({
            where: { id },
            data: {
                ...(body.tags !== undefined && { tags: body.tags }),
            },
        })
        return NextResponse.json(client)
    } catch (error) {
        console.error('Error updating client:', error)
        return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
    }
}

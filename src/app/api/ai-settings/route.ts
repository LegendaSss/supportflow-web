import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
    let settings = await prisma!.aISettings.findFirst()
    if (!settings) {
        settings = await prisma!.aISettings.create({
            data: {
                id: 'default',
                isEnabled: false,
                model: 'gemini-2.0-flash',
                systemPrompt: '',
            },
        })
    }
    return NextResponse.json(settings)
}

export async function PUT(request: Request) {
    const body = await request.json()
    const settings = await prisma!.aISettings.upsert({
        where: { id: body.id || 'default' },
        update: {
            isEnabled: body.isEnabled,
            model: body.model,
            systemPrompt: body.systemPrompt,
            ragEnabled: body.ragEnabled,
            maxKnowledgeRecords: body.maxKnowledgeRecords,
            balanceOnErrors: body.balanceOnErrors,
        },
        create: {
            id: 'default',
            isEnabled: body.isEnabled ?? false,
            model: body.model ?? 'gemini-2.0-flash',
            systemPrompt: body.systemPrompt ?? '',
        },
    })
    return NextResponse.json(settings)
}

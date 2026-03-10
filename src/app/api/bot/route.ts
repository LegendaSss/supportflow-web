import { NextResponse } from 'next/server'
import { startBot, stopBot, getBotStatus } from '@/lib/bot'

// Получить статус бота
export async function GET() {
    const status = getBotStatus()
    return NextResponse.json(status)
}

// Запустить или остановить бота
export async function POST(request: Request) {
    const body = await request.json()

    if (body.action === 'start') {
        const result = await startBot()
        return NextResponse.json(result)
    }

    if (body.action === 'stop') {
        await stopBot()
        return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

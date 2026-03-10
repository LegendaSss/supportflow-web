import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/billing/balance?telegramId=123
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const telegramId = searchParams.get('telegramId');

        if (!telegramId) {
            return NextResponse.json({ error: 'Missing telegramId' }, { status: 400 });
        }

        const client = await prisma!.client.findUnique({
            where: { telegramId }
        });

        if (!client) {
            // If client doesn't exist, balance is 0
            return NextResponse.json({ balance: 0 });
        }

        return NextResponse.json({ balance: client.balance });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

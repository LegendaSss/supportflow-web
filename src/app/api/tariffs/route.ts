import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const tariffs = await prisma!.tariff.findMany({
            where: { isActive: true },
            orderBy: { price: 'asc' }
        });
        return NextResponse.json(tariffs);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

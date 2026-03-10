export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { remnawave } from '@/lib/remnawave';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: clientId } = await params;
        const body = await request.json();
        const { action, limit } = body;

        // Get client
        const client = await prisma!.client.findUnique({
            where: { id: clientId }
        });

        if (!client || !client.remnawareId) {
            return NextResponse.json({ error: 'Client not found or has no active RemnaWave connection' }, { status: 404 });
        }

        if (action === 'reset') {
            await remnawave.resetUserHwid(client.remnawareId);
            return NextResponse.json({ success: true, message: 'HWID reset successfully' });
        } else if (action === 'set_limit') {
            const limitVal = parseInt(limit);
            if (isNaN(limitVal)) {
                return NextResponse.json({ error: 'Invalid limit' }, { status: 400 });
            }
            await remnawave.updateUser(client.remnawareId, { hwidDeviceLimit: limitVal === 0 ? null : limitVal });
            return NextResponse.json({ success: true, message: 'HWID limit updated' });
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Error in HWID endpoint:', error.message);
        return NextResponse.json(
            { error: 'Failed to handle HWID action', details: error.message },
            { status: 500 }
        );
    }
}

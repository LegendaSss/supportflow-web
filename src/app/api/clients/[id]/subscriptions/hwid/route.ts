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

        let rwUser = null;

        if (client?.remnawareId) {
            try { rwUser = await remnawave.getUserByUuid(client.remnawareId); } catch(e){}
        }

        if (!rwUser && client?.telegramId) {
            rwUser = await remnawave.getUserByTelegramId(client.telegramId);
            if (rwUser && rwUser.uuid) {
                await prisma!.client.update({
                    where: { id: clientId },
                    data: { remnawareId: rwUser.uuid }
                });
            }
        }

        if (!client || !rwUser) {
            return NextResponse.json({ error: 'Client not found or has no active VPN connection' }, { status: 404 });
        }

        if (action === 'reset') {
            await remnawave.resetUserHwid(rwUser.uuid);
            return NextResponse.json({ success: true, message: 'HWID reset successfully' });
        } else if (action === 'set_limit') {
            const limitVal = parseInt(limit);
            if (isNaN(limitVal)) {
                return NextResponse.json({ error: 'Invalid limit' }, { status: 400 });
            }
            await remnawave.updateUser(rwUser.uuid, { hwidDeviceLimit: limitVal === 0 ? null : limitVal });
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

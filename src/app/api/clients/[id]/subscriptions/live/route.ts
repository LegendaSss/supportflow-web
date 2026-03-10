import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { remnawave } from '@/lib/remnawave';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: clientId } = await params;

        // Get client to find remnawareId or telegramId
        const client = await prisma!.client.findUnique({
            where: { id: clientId }
        });

        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        let rwUser = null;

        // Try to fetch by remnawareId first
        if (client.remnawareId) {
            try {
                rwUser = await remnawave.getUserByUuid(client.remnawareId);
            } catch (e) {
                console.log('User not found by UUID:', client.remnawareId);
            }
        }

        // Fallback to fetch by telegramId if no UUID was stored or found
        if (!rwUser && client.telegramId) {
            rwUser = await remnawave.getUserByTelegramId(client.telegramId);
            // If found, update the DB so we don't have to search next time
            if (rwUser && rwUser.uuid) {
                await prisma!.client.update({
                    where: { id: clientId },
                    data: { remnawareId: rwUser.uuid }
                });
            }
        }

        if (!rwUser) {
            return NextResponse.json({ error: 'No active VPN subscription found on RemnaWave for this client' }, { status: 404 });
        }

        // Get the subscription link
        const subUrl = await remnawave.getUserSubscriptionUrl(rwUser.uuid, '', rwUser.shortUuid);

        return NextResponse.json({
            success: true,
            subscription: {
                ...rwUser,
                url: subUrl,
                squads: rwUser.activeInternalSquads || []
            }
        });

    } catch (error: any) {
        console.error('Error fetching live subscription:', error.message);
        return NextResponse.json(
            { error: 'Failed to fetch subscription data', details: error.message },
            { status: 500 }
        );
    }
}

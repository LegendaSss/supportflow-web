import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { remnawave } from '@/lib/remnawave';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: clientId } = await params;

        // Get client
        const client = await prisma!.client.findUnique({
            where: { id: clientId }
        });

        if (!client || !client.remnawareId) {
            return NextResponse.json({ error: 'Client not found or has no active RemnaWave connection' }, { status: 404 });
        }

        const rwUser = await remnawave.getUserByUuid(client.remnawareId);

        if (!rwUser) {
            return NextResponse.json({ error: 'User does not exist in RemnaWave' }, { status: 404 });
        }

        // 1. Delete old user
        await remnawave.deleteUser(rwUser.uuid);

        // 2. Extract quotas from old user to carry over
        const remainingTrafficBytes = rwUser.trafficLimitBytes > 0
            ? Math.max(0, rwUser.trafficLimitBytes - (rwUser.usedTrafficBytes || 0))
            : 0;

        const limitGb = remainingTrafficBytes / 1073741824;

        // 3. Create new user with same telegramId, limit, and expireDate
        const newRwUser = await remnawave.createUser(
            client.telegramId,
            limitGb,
            new Date(rwUser.expireAt),
            rwUser.description || `Reissued for ${client.telegramId}`,
            rwUser.activeInternalSquads || []
        );

        // 4. Update the DB with the new UUID
        await prisma!.client.update({
            where: { id: clientId },
            data: { remnawareId: newRwUser.uuid }
        });

        return NextResponse.json({
            success: true,
            message: 'Config reissued successfully',
            newUuid: newRwUser.uuid
        });

    } catch (error: any) {
        console.error('Error reissuing config:', error.message);
        return NextResponse.json(
            { error: 'Failed to reissue config', details: error.message },
            { status: 500 }
        );
    }
}

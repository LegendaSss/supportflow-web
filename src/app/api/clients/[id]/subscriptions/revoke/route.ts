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
            return NextResponse.json({ error: 'Client not found or already has no active RemnaWave connection' }, { status: 404 });
        }

        // Delete from RemnaWave
        try {
            await remnawave.deleteUser(client.remnawareId);
        } catch (e: any) {
            console.error('Failed to delete from RemnaWave, maybe already deleted:', e.message);
            // We continue anyway to clean up our DB reference
        }

        // Clean up our DB
        await prisma!.client.update({
            where: { id: clientId },
            data: { remnawareId: null }
        });

        return NextResponse.json({
            success: true,
            message: 'Subscription revoked and user isolated.'
        });

    } catch (error: any) {
        console.error('Error revoking subscription:', error.message);
        return NextResponse.json(
            { error: 'Failed to revoke subscription', details: error.message },
            { status: 500 }
        );
    }
}

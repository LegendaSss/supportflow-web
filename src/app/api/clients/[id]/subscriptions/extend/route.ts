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
        const { addDays, addHours, limitGb } = body;

        if (addDays === undefined && addHours === undefined && limitGb === undefined) {
            return NextResponse.json({ error: 'Must specify days, hours, or limit to update' }, { status: 400 });
        }

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

        const updateData: any = {};

        if (addDays !== undefined || addHours !== undefined) {
            let currentExpiry = new Date(rwUser.expireAt);
            // If already expired, start from now
            if (currentExpiry.getTime() < Date.now()) {
                currentExpiry = new Date();
            }

            if (addDays) {
                currentExpiry.setDate(currentExpiry.getDate() + parseInt(addDays));
            }
            if (addHours) {
                currentExpiry.setHours(currentExpiry.getHours() + parseInt(addHours));
            }
            updateData.expireAt = currentExpiry.toISOString();
        }

        if (limitGb !== undefined) {
            updateData.trafficLimitBytes = parseInt(limitGb) * 1073741824;
        }

        // Update in RemnaWave
        if (Object.keys(updateData).length > 0) {
            await remnawave.updateUser(rwUser.uuid, updateData);
        }

        return NextResponse.json({
            success: true,
            updated: updateData
        });

    } catch (error: any) {
        console.error('Error extending subscription:', error.message);
        return NextResponse.json(
            { error: 'Failed to extend subscription', details: error.message },
            { status: 500 }
        );
    }
}

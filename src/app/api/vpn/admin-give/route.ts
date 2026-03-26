export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { remnawave } from '@/lib/remnawave';
import { checkVpnAuth } from '../auth';

// POST /api/vpn/admin-give
// Body: { telegramId: number, days: number, description: string }
export async function POST(req: Request) {
    const authError = checkVpnAuth(req);
    if (authError) return authError;

    try {
        const { telegramId, days, description } = await req.json();

        if (!telegramId || (days === undefined)) {
            return NextResponse.json({ error: 'Missing telegramId or days' }, { status: 400 });
        }

        const expireAt = new Date();
        expireAt.setDate(expireAt.getDate() + days);

        // First, check if user exists
        let user = await remnawave.getUserByTelegramId(telegramId);
        const squadIds = await remnawave.getDefaultSquadId();

        if (!user) {
            // Create user if not exists
            user = await remnawave.createUser(telegramId, 0, expireAt, description, squadIds);
        } else {
            // Update existing user
            const currentExpire = new Date(user.expireAt);
            const baseDate = currentExpire > new Date() ? currentExpire : new Date();
            baseDate.setDate(baseDate.getDate() + days);

            user = await remnawave.updateUser(user.uuid, {
                expireAt: baseDate.toISOString(),
                description: description,
                activeInternalSquads: squadIds
            });
        }

        const subUrl = await remnawave.getUserSubscriptionUrl(user.uuid, process.env.REMNAWAVE_PUBLIC_URL || '');

        return NextResponse.json({
            success: true,
            user_uuid: user.uuid,
            subscription_url: subUrl,
            message: 'Подписка успешно выдана администратором'
        }, { status: 200 });

    } catch (error: any) {
        console.error('[API Admin-Give Error]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

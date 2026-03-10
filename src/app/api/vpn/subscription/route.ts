export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { remnawave } from '@/lib/remnawave';

// GET /api/vpn/subscription?telegramId=123
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const telegramId = searchParams.get('telegramId');

        if (!telegramId) {
            return NextResponse.json({ error: 'Missing telegramId' }, { status: 400 });
        }

        const user = await remnawave.getUserByTelegramId(telegramId);

        if (!user) {
            return NextResponse.json({ found: false, message: 'Подписка не найдена' });
        }

        const publicUrl = process.env.REMNAWAVE_PUBLIC_URL || process.env.REMNAWAVE_URL || '';
        const correctSubscriptionUrl = `${publicUrl.replace(/\/$/, '')}/api/sub/${user.shortUuid || user.uuid}`;

        // Calculate status
        const now = new Date();
        const expireAt = new Date(user.expireAt || 0);
        const isActive = user.status === 'active' && expireAt > now;
        const diffMs = expireAt.getTime() - now.getTime();
        const daysLeft = isActive ? Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24))) : 0;

        const usedTrafficBytes = user.usedTrafficBytes || (user.userTraffic ? user.userTraffic.usedTrafficBytes : 0) || 0;
        const trafficLimitBytes = user.trafficLimitBytes || 0;

        const trafficUsedGb = usedTrafficBytes / (1024 ** 3);
        const trafficLimitGb = trafficLimitBytes / (1024 ** 3);

        return NextResponse.json({
            found: true,
            is_active: isActive,
            status: user.status,
            expire_at: expireAt.toISOString(),
            days_left: daysLeft,
            traffic_used_gb: Number(trafficUsedGb.toFixed(2)),
            traffic_limit_gb: trafficLimitGb > 0 ? Number(trafficLimitGb.toFixed(2)) : 'Безлимит',
            subscription_url: correctSubscriptionUrl,
            happ_link: user.happLink || '',
            user_uuid: user.uuid,
        }, { status: 200 });

    } catch (error: any) {
        console.error('[API Subscription Error]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

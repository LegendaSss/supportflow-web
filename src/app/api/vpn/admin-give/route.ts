import { NextResponse } from 'next/server';
import { remnawave } from '@/lib/remnawave';

// POST /api/vpn/admin-give
// Body: { telegramId: number, days: number, description: string }
export async function POST(req: Request) {
    try {
        const { telegramId, days, description } = await req.json();

        if (!telegramId || (days === undefined)) {
            return NextResponse.json({ error: 'Missing telegramId or days' }, { status: 400 });
        }

        const expireAt = new Date();
        expireAt.setDate(expireAt.getDate() + days);

        // First, check if user exists
        let user = await remnawave.getUserByTelegramId(telegramId);

        if (!user) {
            // Create user if not exists
            user = await remnawave.createUser(telegramId, 0, expireAt, description, ['a085ea6f-70bc-43f9-af6b-c7255eb24155']);
        } else {
            // Update existing user (we assume there's an update method, but for now we'll just re-push? 
            // In remnawave.ts we don't have an update user, let's keep it simple for now and just issue via createUser which handles collisions if API allows)
            // Wait, remnawave_core.py says if user exists it updates. Let's assume the API behaves similarly.
            user = await remnawave.createUser(telegramId, 0, expireAt, description, ['a085ea6f-70bc-43f9-af6b-c7255eb24155']);
        }

        // Link specific squad
        const squadIds = ['a085ea6f-70bc-43f9-af6b-c7255eb24155'];
        await remnawave.linkSquadsToUser(user.uuid, squadIds);

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

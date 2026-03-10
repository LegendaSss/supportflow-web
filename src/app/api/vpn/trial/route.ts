export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { remnawave } from '@/lib/remnawave';

// Этот эндпоинт будет вызывать Telegram-бот (или сам сайт)
// POST /api/vpn/trial
export async function POST(req: Request) {
    try {
        const { telegramId } = await req.json();

        if (!telegramId) {
            return NextResponse.json({ error: 'Missing telegramId' }, { status: 400 });
        }

        // 1. Ищем клиента в БД SupportFlow
        let client = await prisma!.client.findUnique({
            where: { telegramId: telegramId.toString() }
        });

        if (!client) {
            client = await prisma!.client.create({
                data: {
                    telegramId: telegramId.toString(),
                    username: 'Unknown',
                }
            });
        }

        // 2. Используем фиксированный сквад (сервер)
        const squadIds = ['a085ea6f-70bc-43f9-af6b-c7255eb24155'];

        // 3. Создаем юзера в RemnaWave (Тестово на 3 дня, например)
        const expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + 3);

        const rwUser = await remnawave.createUser(telegramId, 0, expireDate, 'Trial from Bot', squadIds);

        // 5. Сохраняем подписку в базе SupportFlow
        await prisma!.subscription.create({
            data: {
                clientId: client.id,
                remnawaveId: rwUser.uuid,
                remnawaveShortId: rwUser.shortUuid,
                expireAt: expireDate,
            }
        });

        // Получаем ссылку
        // Получаем ссылку
        const subUrl = await remnawave.getUserSubscriptionUrl(rwUser.uuid, process.env.REMNAWAVE_PUBLIC_URL || '', rwUser.shortUuid);

        // Возвращаем боту результат
        return NextResponse.json({ success: true, url: subUrl, expireAt: expireDate });

    } catch (error: any) {
        console.error('[API Trial Error]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { remnawave } from '@/lib/remnawave';
import { logActivity } from '@/lib/logger';

// POST /api/vpn/purchase
export async function POST(req: Request) {
    try {
        const { telegramId, tariffId } = await req.json();

        if (!telegramId || !tariffId) {
            return NextResponse.json({ error: 'Missing telegramId or tariffId' }, { status: 400 });
        }

        // 1. Ищем клиента и тариф
        const client = await prisma!.client.findUnique({
            where: { telegramId: telegramId.toString() }
        });

        const tariff = await prisma!.tariff.findUnique({
            where: { id: tariffId }
        });

        if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        if (!tariff) return NextResponse.json({ error: 'Tariff not found' }, { status: 404 });

        // 2. Проверяем баланс
        if (client.balance < tariff.price) {
            return NextResponse.json({
                error: 'Insufficient funds',
                balance: client.balance,
                price: tariff.price
            }, { status: 402 }); // 402 Payment Required
        }

        // 3. Выполняем транзакцию в БД (списание средств)
        await prisma!.$transaction(async (tx) => {
            await tx.client.update({
                where: { id: client.id },
                data: { balance: client.balance - tariff.price }
            });

            await tx.transaction.create({
                data: {
                    clientId: client.id,
                    amount: tariff.price,
                    type: 'debit',
                    category: 'renewal',
                    description: `Оплата тарифа: ${tariff.name}`
                }
            });
        });

        // 4. Интеграция с RemnaWave (продление или создание)
        const squadIds = ['a085ea6f-70bc-43f9-af6b-c7255eb24155'];

        // Проверяем, есть ли уже юзер в RemnaWave по telegramId
        let rwUser = await remnawave.getUserByTelegramId(telegramId.toString());
        let expireDate = new Date();

        if (rwUser) {
            // Продлеваем существующего
            const currentExpire = new Date(rwUser.expireAt);
            const baseDate = currentExpire > new Date() ? currentExpire : new Date();
            baseDate.setDate(baseDate.getDate() + tariff.duration);
            expireDate = baseDate;

            await remnawave.updateUser(rwUser.uuid, {
                expireAt: expireDate.toISOString(),
                activeInternalSquads: squadIds
            });
            console.log(`[API Purchase] Extended subscription for ${telegramId} until ${expireDate.toISOString()}`);
        } else {
            // Создаем нового
            expireDate.setDate(expireDate.getDate() + tariff.duration);
            rwUser = await remnawave.createUser(telegramId.toString(), 0, expireDate, `Purchase: ${tariff.name}`, squadIds);
            console.log(`[API Purchase] Created new subscription for ${telegramId} until ${expireDate.toISOString()}`);
        }

        // 5. Обновляем клиента и подписку в БД SupportFlow
        await prisma!.client.update({
            where: { id: client.id },
            data: {
                tariffId: tariff.id,
                remnawareId: rwUser.uuid // Сохраняем/обновляем UUID
            }
        });

        // Пытаемся найти существующую запись подписки
        const existingSub = await prisma!.subscription.findFirst({
            where: { clientId: client.id }
        });

        if (existingSub) {
            await prisma!.subscription.update({
                where: { id: existingSub.id },
                data: {
                    remnawaveId: rwUser.uuid,
                    remnawaveShortId: rwUser.shortUuid,
                    expireAt: expireDate,
                    status: 'active'
                }
            });
        } else {
            await prisma!.subscription.create({
                data: {
                    clientId: client.id,
                    remnawaveId: rwUser.uuid,
                    remnawaveShortId: rwUser.shortUuid,
                    expireAt: expireDate,
                }
            });
        }

        // Получаем ссылку
        const subUrl = await remnawave.getUserSubscriptionUrl(rwUser.uuid, process.env.REMNAWAVE_PUBLIC_URL || '', rwUser.shortUuid);

        logActivity('payment_received', `Клиент ${client.firstName || client.username || client.telegramId} оплатил тариф ${tariff.name} (${tariff.price}₽)`, { clientId: client.id, tariffId: tariff.id, amount: tariff.price });

        return NextResponse.json({
            success: true,
            url: subUrl,
            expireAt: expireDate,
            newBalance: client.balance - tariff.price
        });

    } catch (error: any) {
        console.error('[API Purchase Error]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload || !payload.userId) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const adminId = payload.userId;

        const body = await request.json();
        const { clientId, amount, type, category, description } = body;

        // Валидация
        if (!clientId || !amount || amount <= 0 || !type || !category) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        if (type !== 'credit' && type !== 'debit') {
            return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
        }

        const client = await prisma!.client.findUnique({
            where: { id: clientId }
        });

        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        if (type === 'debit' && client.balance < amount) {
            return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
        }

        // Выполняем транзакцию атомарно
        const result = await prisma!.$transaction(async (tx) => {
            // 1. Создаем транзакцию
            const transaction = await tx.transaction.create({
                data: {
                    clientId,
                    amount,
                    type,
                    category,
                    status: 'completed',
                    description: description || `Manual ${type}`,
                    operatorId: adminId
                }
            });

            // 2. Обновляем баланс клиента
            await tx.client.update({
                where: { id: clientId },
                data: {
                    balance: type === 'credit'
                        ? { increment: amount }
                        : { decrement: amount }
                }
            });

            return transaction;
        });

        return NextResponse.json({ success: true, transaction: result });

    } catch (error) {
        console.error('[Manual Transaction Error]:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

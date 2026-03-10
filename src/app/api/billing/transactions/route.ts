import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Получение истории транзакций клиента
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
        return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
    }

    try {
        const transactions = await prisma!.transaction.findMany({
            where: { clientId },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(transactions);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Пополнение или списание баланса вручную (Админом)
export async function POST(req: Request) {
    try {
        const { clientId, amount, type, description, category, operatorId } = await req.json();

        if (!clientId || !amount || !type || !['credit', 'debit'].includes(type)) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        // Выполняем транзакцию в БД
        const result = await prisma!.$transaction(async (tx) => {
            const client = await tx.client.findUnique({ where: { id: clientId } });
            if (!client) throw new Error('Client not found');

            let newBalance = client.balance;
            if (type === 'credit') {
                newBalance += amount;
            } else {
                newBalance -= amount;
                if (newBalance < 0) throw new Error('Insufficient funds');
            }

            await tx.client.update({
                where: { id: clientId },
                data: { balance: newBalance },
            });

            const transaction = await tx.transaction.create({
                data: {
                    clientId,
                    operatorId,
                    amount,
                    type,
                    category: category || (type === 'credit' ? 'payment' : 'renewal'),
                    status: 'completed',
                    description: description || (type === 'credit' ? 'Manual Top-up' : 'Manual Deduction'),
                },
            });

            return { balance: newBalance, transaction };
        });

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

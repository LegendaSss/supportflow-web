export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { transactionId, operatorId } = await req.json();

        if (!transactionId) {
            return NextResponse.json({ error: 'Missing transactionId' }, { status: 400 });
        }

        const result = await prisma!.$transaction(async (tx) => {
            const transaction = await tx.transaction.findUnique({
                where: { id: transactionId },
                include: { client: true }
            });

            if (!transaction) throw new Error('Transaction not found');
            if (transaction.status === 'refunded') throw new Error('Transaction already refunded');

            // Adjust balance based on original type
            let newBalance = transaction.client.balance;
            if (transaction.type === 'credit') {
                newBalance -= transaction.amount;
            } else {
                newBalance += transaction.amount;
            }

            if (newBalance < 0) throw new Error('Insufficient funds to perform refund');

            // Update original transaction
            await tx.transaction.update({
                where: { id: transactionId },
                data: { status: 'refunded' }
            });

            // Update client balance
            await tx.client.update({
                where: { id: transaction.clientId },
                data: { balance: newBalance }
            });

            // Create refund audit transaction
            const refundTx = await tx.transaction.create({
                data: {
                    clientId: transaction.clientId,
                    operatorId,
                    amount: transaction.amount,
                    type: transaction.type === 'credit' ? 'debit' : 'credit',
                    category: 'refund',
                    status: 'completed',
                    description: `Возврат по транзакции ${transaction.id.substring(0, 8)}: ${transaction.description}`
                }
            });

            return { success: true, newBalance, refundTx };
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[Refund API Error]:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

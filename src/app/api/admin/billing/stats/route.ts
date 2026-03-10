export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const period = searchParams.get('period') || 'all'; // 'today', '7d', '30d', 'all'

        let startDate: Date | undefined;
        let endDate = new Date();

        if (period === 'today') {
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
        } else if (period === '7d') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
        } else if (period === '30d') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
        }

        const dateFilter = startDate ? { gte: startDate, lte: endDate } : undefined;

        // 1. Общие показатели с учетом фильтра
        const totalRevenueResult = await prisma!.transaction.aggregate({
            where: {
                type: 'credit',
                status: 'completed',
                category: { not: 'refund' },
                ...(dateFilter ? { createdAt: dateFilter } : {})
            },
            _sum: { amount: true }
        });
        const totalRevenue = totalRevenueResult?._sum?.amount ?? 0;

        // Balance and total clients and active subs are snapshot metrics, usually not date-filtered
        const totalBalanceResult = await prisma!.client.aggregate({
            _sum: { balance: true }
        });
        const totalBalance = totalBalanceResult?._sum?.balance ?? 0;

        const activeSubsCount = await prisma!.subscription.count({
            where: {
                status: 'active',
                expireAt: { gt: new Date() }
            }
        });

        const totalClients = await prisma!.client.count({
            ...(dateFilter ? { where: { createdAt: dateFilter } } : {})
        });
        const arpu = totalClients > 0 ? totalRevenue / totalClients : 0;

        // 2. Выручка по дням (всегда последние 7 или 30 дней для графика)
        const chartDays = period === '30d' ? 30 : 7;
        const chartStartDate = new Date();
        chartStartDate.setDate(chartStartDate.getDate() - chartDays);

        const recentTransactions = await prisma!.transaction.findMany({
            where: {
                type: 'credit',
                status: 'completed',
                category: { not: 'refund' },
                createdAt: { gte: chartStartDate }
            },
            select: {
                amount: true,
                createdAt: true
            },
            orderBy: { createdAt: 'asc' }
        });

        const revenueByDay: Record<string, number> = {};
        for (let i = 0; i < chartDays; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            revenueByDay[dateStr] = 0;
        }

        recentTransactions.forEach(tx => {
            const dateStr = tx.createdAt.toISOString().split('T')[0];
            if (revenueByDay[dateStr] !== undefined) {
                revenueByDay[dateStr] += tx.amount;
            }
        });

        const dailyRevenue = Object.entries(revenueByDay)
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // 3. Распределение по категориям (выручка) с учетом фильтра
        const categories = ['payment', 'bonus', 'refund', 'renewal', 'referral'];
        const categoryStats = await Promise.all(categories.map(async (cat) => {
            const sum = await prisma!.transaction.aggregate({
                where: {
                    category: cat,
                    status: 'completed',
                    type: 'credit',
                    ...(dateFilter ? { createdAt: dateFilter } : {})
                },
                _sum: { amount: true }
            });
            return { name: cat, amount: sum?._sum?.amount ?? 0 };
        }));

        // 4. Распределение по тарифам
        const tariffs = await prisma!.tariff.findMany({
            include: {
                _count: {
                    select: { clients: true }
                }
            }
        });

        const tariffStats = tariffs.map(t => ({
            name: t.name,
            count: t._count.clients,
            color: t.price > 1000 ? 'var(--accent-primary)' : (t.price > 500 ? 'var(--accent-green)' : 'var(--text-muted)')
        }));

        // 5. Транзакции с фильтрацией (для ledger)
        const limitParam = searchParams.get('limit');
        const take = limitParam ? parseInt(limitParam) : 50;
        const typeFilter = searchParams.get('type');

        const txWhere: any = {};
        if (dateFilter) txWhere.createdAt = dateFilter;
        if (typeFilter && typeFilter !== 'all') txWhere.type = typeFilter;

        const latestTransactions = await prisma!.transaction.findMany({
            where: txWhere,
            take,
            orderBy: { createdAt: 'desc' },
            include: {
                client: {
                    select: {
                        firstName: true,
                        username: true,
                        telegramId: true
                    }
                }
            }
        });

        return NextResponse.json({
            summary: {
                totalRevenue,
                totalBalance,
                activeSubsCount,
                totalClients,
                arpu,
                categoryStats
            },
            dailyRevenue,
            tariffStats,
            latestTransactions
        });

    } catch (error) {
        console.error('[Billing Stats API Error]:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

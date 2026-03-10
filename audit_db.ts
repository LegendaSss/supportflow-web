import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('--- Database Audit ---')
        const transactions = await prisma.transaction.findMany({ take: 1 })
        console.log('Transaction sample:', JSON.stringify(transactions[0], null, 2))

        const count = await prisma.transaction.count()
        console.log('Total transactions:', count)

        // Check if new fields exist by trying a specific query
        const sampleWithNewFields = await prisma.transaction.findFirst({
            where: {
                status: { in: ['completed', 'refunded'] }
            }
        })
        console.log('New fields check successful')
    } catch (error) {
        console.error('Audit failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()

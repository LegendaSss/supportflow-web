import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL || 'file:./dev.db'
  const adapter = new PrismaLibSql({ url })
  const client = new PrismaClient({ adapter })
  console.log('Prisma Client Created. Models:', Object.keys(client).filter(k => !k.startsWith('$')))
  return client
}

export const prisma = (globalForPrisma.prisma as any)?.activityLog
  ? globalForPrisma.prisma
  : createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

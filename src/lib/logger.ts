import { prisma } from './prisma'

export async function logActivity(type: string, message: string, metadata?: any) {
    try {
        await prisma!.activityLog.create({
            data: {
                type,
                message,
                metadata: metadata ? JSON.stringify(metadata) : null,
            }
        })
    } catch (error) {
        console.error('[ActivityLog Error]:', error)
    }
}

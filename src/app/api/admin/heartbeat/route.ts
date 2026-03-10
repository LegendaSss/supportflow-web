import { NextResponse } from 'next/server'

// In-memory store for active sessions
// Map<clientId, timestampOfLastPing>
const activeSessions = new Map<string, number>()

// We consider a session inactive if no ping is received for X ms
const SESSION_TIMEOUT_MS = 15000 // 15 seconds

// Helper to remove expired sessions
function cleanupSessions() {
    const now = Date.now()
    for (const [clientId, lastPing] of activeSessions.entries()) {
        if (now - lastPing > SESSION_TIMEOUT_MS) {
            activeSessions.delete(clientId)
        }
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const clientId = body.clientId

        if (!clientId) {
            return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
        }

        // Clean up old sessions
        cleanupSessions()

        // Update or add the current session
        activeSessions.set(clientId, Date.now())

        return NextResponse.json({
            success: true,
            onlineCount: activeSessions.size
        })

    } catch (e) {
        console.error('Heartbeat error:', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function GET() {
    // Return count of currently active sessions
    cleanupSessions()
    return NextResponse.json({
        success: true,
        onlineCount: activeSessions.size
    })
}

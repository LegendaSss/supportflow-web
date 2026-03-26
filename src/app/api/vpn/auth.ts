import { NextResponse } from 'next/server';

export function checkVpnAuth(req: Request) {
    const authHeader = req.headers.get('authorization');
    const apiKeyHeader = req.headers.get('x-api-key');
    const token = process.env.VPN_BOT_TOKEN;
    
    if (!token) {
        console.warn('[VPN API Auth] VPN_BOT_TOKEN is not set in environment variables!');
        // Allow access in dev if token is empty, otherwise fail
        if (process.env.NODE_ENV !== 'development') {
            return NextResponse.json({ error: 'Server configuration error: Token missing' }, { status: 500 });
        }
    } else if (authHeader !== `Bearer ${token}` && apiKeyHeader !== token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return null; // Auth OK
}

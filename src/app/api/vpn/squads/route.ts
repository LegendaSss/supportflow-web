export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { remnawave } from '@/lib/remnawave';

export async function GET() {
    try {
        const squads = await remnawave.getSquads();

        // Map to a simpler format for the bot
        const mapped = squads.map((s: any) => ({
            uuid: s.uuid,
            name: s.name,
            members_count: s.info?.membersCount || 0
        }));

        return NextResponse.json(mapped, { status: 200 });
    } catch (error: any) {
        console.error('[API Squads Error]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

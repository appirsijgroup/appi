import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * GET /api/settings?key=...
 * Fetch a setting value
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');

        if (key) {
            const result = await query('SELECT value FROM app_settings WHERE key = $1', [key]);
            const row = result.rows[0];
            return NextResponse.json({ value: row ? row.value : null });
        }

        const result = await query('SELECT key, value FROM app_settings');
        const settings: Record<string, string> = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });

        return NextResponse.json({ settings });
    } catch (error) {
        console.error('Settings API GET error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/settings
 * Update a setting (admin only)
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'super-admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { key, value } = await request.json();

        if (!key) {
            return NextResponse.json({ error: 'Key is required' }, { status: 400 });
        }

        await query(
            'INSERT INTO app_settings (key, value, updated_at, updated_by) VALUES ($1, $2, NOW(), $3) ' +
            'ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW(), updated_by = $3',
            [key, value, session.userId]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Settings API POST error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

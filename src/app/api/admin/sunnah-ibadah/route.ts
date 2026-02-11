import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { toCamelCase, toSnakeCase } from '@/utils/caseConverter';

/**
 * GET /api/admin/sunnah-ibadah
 * Fetch all sunnah ibadah config
 */
export async function GET() {
    try {
        const result = await query('SELECT * FROM sunnah_ibadah_config ORDER BY created_at DESC');
        return NextResponse.json({ data: toCamelCase(result.rows) });
    } catch (error) {
        console.error('Sunnah Ibadah API GET error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/admin/sunnah-ibadah
 * Create or update sunnah ibadah
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'super-admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { action, id, ...data } = body;

        if (action === 'delete') {
            if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
            await query('DELETE FROM sunnah_ibadah_config WHERE id = $1', [id]);
            return NextResponse.json({ success: true });
        }

        const snakeData = toSnakeCase(data) as Record<string, any>;

        if (id) {
            // Update
            const keys = Object.keys(snakeData);
            const values = Object.values(snakeData);
            const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');

            await query(
                `UPDATE sunnah_ibadah_config SET ${setClause} WHERE id = $1`,
                [id, ...values]
            );
            return NextResponse.json({ success: true });
        } else {
            // Create
            const keys = ['id', ...Object.keys(snakeData), 'created_by', 'created_by_name'];
            const newId = `${data.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
            const values = [newId, ...Object.values(snakeData), session.userId, session.name];

            const columns = keys.join(', ');
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

            const result = await query(
                `INSERT INTO sunnah_ibadah_config (${columns}) VALUES (${placeholders}) RETURNING *`,
                values
            );
            return NextResponse.json({ data: toCamelCase(result.rows[0]) });
        }
    } catch (error) {
        console.error('Sunnah Ibadah API POST error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

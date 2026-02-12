import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * API Route: /api/activities
 * Purpose: Handle activities CRUD operations
 * MIGRATED to use local PostgreSQL connection.
 */

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const creatorId = searchParams.get('creatorId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const id = searchParams.get('id');

        if (id) {
            const { rows } = await query('SELECT * FROM activities WHERE id = $1', [id]);
            if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
            return NextResponse.json({ data: rows[0] });
        }

        let sql = 'SELECT * FROM activities WHERE 1=1';
        const params: any[] = [];

        if (creatorId) {
            params.push(creatorId);
            sql += ` AND created_by = $${params.length}`;
        }

        if (startDate) {
            params.push(startDate);
            sql += ` AND date >= $${params.length}`;
        }

        if (endDate) {
            params.push(endDate);
            sql += ` AND date <= $${params.length}`;
        }

        sql += ' ORDER BY date ASC, start_time ASC';

        const { rows } = await query(sql, params);
        return NextResponse.json({ data: rows });

    } catch (error: any) {
        console.error('❌ [API Activities GET] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.role !== 'admin' && session.role !== 'super-admin' && !session.canBeMentor) {
            return NextResponse.json({ error: 'Higher privilege required' }, { status: 403 });
        }

        const activityData = await request.json();

        // Prepare insert query dynamically based on fields
        const keys = Object.keys(activityData);
        const values = Object.values(activityData);

        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const columns = keys.join(', ');

        const sql = `
            INSERT INTO activities (${columns})
            VALUES (${placeholders})
            RETURNING *
        `;

        const { rows } = await query(sql, values);
        const data = rows[0];

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('❌ [API Activities] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.role !== 'admin' && session.role !== 'super-admin' && !session.canBeMentor) {
            return NextResponse.json({ error: 'Higher privilege required' }, { status: 403 });
        }

        const { id, ...updates } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
        }

        if (session.role !== 'super-admin') {
            const { rows: existingRows } = await query(
                `SELECT created_by FROM activities WHERE id = $1 LIMIT 1`,
                [id]
            );
            const existing = existingRows[0];

            if (!existing) {
                return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
            }

            if (existing.created_by !== (session.nip || session.userId)) {
                return NextResponse.json({ error: 'You do not have permission to update this activity' }, { status: 403 });
            }
        }

        const keys = Object.keys(updates);
        const values = Object.values(updates);

        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

        values.push(id);
        const idParamIndex = values.length;

        const sql = `
            UPDATE activities
            SET ${setClause}
            WHERE id = $${idParamIndex}
            RETURNING *
        `;

        const { rows } = await query(sql, values);
        const data = rows[0];

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('❌ [API Activities PATCH] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.role !== 'admin' && session.role !== 'super-admin' && !session.canBeMentor) {
            return NextResponse.json({ error: 'Higher privilege required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
        }

        if (session.role !== 'super-admin') {
            const { rows: existingRows } = await query(
                `SELECT created_by FROM activities WHERE id = $1 LIMIT 1`,
                [id]
            );
            const existing = existingRows[0];

            if (!existing) {
                return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
            }

            if (existing.created_by !== (session.nip || session.userId)) {
                return NextResponse.json({ error: 'You do not have permission to delete this activity' }, { status: 403 });
            }
        }

        await query(`DELETE FROM activities WHERE id = $1`, [id]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('❌ [API Activities DELETE] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

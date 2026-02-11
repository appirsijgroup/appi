import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * API Route: /api/team-attendance/sessions
 * Purpose: Handle team attendance sessions operations
 * MIGRATED to use local PostgreSQL connection.
 */

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const creatorId = searchParams.get('creatorId');
        const date = searchParams.get('date');

        let sql = 'SELECT * FROM team_attendance_sessions';
        const params: any[] = [];

        if (creatorId && date) {
            sql += ' WHERE creator_id = $1 AND date = $2';
            params.push(creatorId, date);
        } else if (creatorId) {
            sql += ' WHERE creator_id = $1';
            params.push(creatorId);
        } else if (date) {
            sql += ' WHERE date = $1';
            params.push(date);
        }

        sql += ' ORDER BY date DESC, start_time DESC, created_at DESC';

        const { rows } = await query(sql, params);

        return NextResponse.json({ success: true, data: rows });
    } catch (error: any) {
        console.error('❌ [API Team Attendance] GET error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        // Verify custom JWT authentication
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only admins or super-admins can create sessions
        if (session.role !== 'admin' && session.role !== 'super-admin') {
            return NextResponse.json({ error: 'Higher privilege required' }, { status: 403 });
        }

        const sessionData = await request.json();

        // Dynamic Insert
        const keys = Object.keys(sessionData);
        const values = Object.values(sessionData);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const columns = keys.join(', ');

        const sql = `
            INSERT INTO team_attendance_sessions (${columns})
            VALUES (${placeholders})
            RETURNING *
        `;

        const { rows } = await query(sql, values);
        const data = rows[0];

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('❌ [API Team Attendance] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.role !== 'admin' && session.role !== 'super-admin') {
            return NextResponse.json({ error: 'Higher privilege required' }, { status: 403 });
        }

        const { id, ...updates } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }

        // Permission check
        if (session.role !== 'super-admin') {
            const { rows: existingRows } = await query(
                `SELECT creator_id FROM team_attendance_sessions WHERE id = $1 LIMIT 1`,
                [id]
            );
            const existing = existingRows[0];

            if (!existing) {
                return NextResponse.json({ error: 'Session not found' }, { status: 404 });
            }

            if (existing.creator_id !== (session.nip || session.userId)) {
                return NextResponse.json({ error: 'You do not have permission to update this session' }, { status: 403 });
            }
        }

        // Dynamic Update
        const keys = Object.keys(updates);
        const values = Object.values(updates);
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        values.push(id);

        const sql = `
            UPDATE team_attendance_sessions
            SET ${setClause}
            WHERE id = $${values.length}
            RETURNING *
        `;

        const { rows } = await query(sql, values);
        const data = rows[0];

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.role !== 'admin' && session.role !== 'super-admin') {
            return NextResponse.json({ error: 'Higher privilege required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }

        // Permission check
        if (session.role !== 'super-admin') {
            const { rows: existingRows } = await query(
                `SELECT creator_id FROM team_attendance_sessions WHERE id = $1 LIMIT 1`,
                [id]
            );
            const existing = existingRows[0];

            if (!existing) {
                return NextResponse.json({ error: 'Session not found' }, { status: 404 });
            }

            if (existing.creator_id !== (session.nip || session.userId)) {
                return NextResponse.json({ error: 'You do not have permission to delete this session' }, { status: 403 });
            }
        }

        await query(`DELETE FROM team_attendance_sessions WHERE id = $1`, [id]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

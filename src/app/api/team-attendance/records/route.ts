import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * API Route: /api/team-attendance/records
 * Purpose: Handle team attendance records (who attended what)
 * MIGRATED to use local PostgreSQL connection.
 */

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');
        const userId = searchParams.get('userId');

        if (!sessionId && !userId) {
            return NextResponse.json({ error: 'sessionId or userId is required' }, { status: 400 });
        }

        let sql = 'SELECT * FROM team_attendance_records';
        const params: any[] = [];

        if (sessionId && userId) {
            sql += ' WHERE session_id = $1 AND user_id = $2';
            params.push(sessionId, userId);
        } else if (sessionId) {
            sql += ' WHERE session_id = $1';
            params.push(sessionId);
        } else if (userId) {
            sql += ' WHERE user_id = $1';
            params.push(userId);
        }

        sql += ' ORDER BY attended_at DESC';

        const { rows } = await query(sql, params);

        return NextResponse.json({ success: true, data: rows });
    } catch (error: any) {
        console.error('❌ [API Team Attendance Records] GET error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const recordData = await request.json();
        const hospitalId = (session as any).hospitalId || null;

        // Ensure hospital_id is included in the record data
        if (hospitalId && !recordData.hospital_id) {
            recordData.hospital_id = hospitalId;
        }

        // 1. Check if already exists to avoid unique constraint error
        const { rows: existing } = await query(
            'SELECT id FROM team_attendance_records WHERE session_id = $1 AND user_id = $2',
            [recordData.session_id, recordData.user_id]
        );

        if (existing.length > 0) {
            return NextResponse.json({
                error: 'Anda sudah melakukan presensi untuk sesi ini.',
                code: '23505'
            }, { status: 409 });
        }

        // 2. Dynamic Insert
        const keys = Object.keys(recordData);
        const values = Object.values(recordData);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const columns = keys.join(', ');

        const sql = `
            INSERT INTO team_attendance_records (${columns})
            VALUES (${placeholders})
            RETURNING *
        `;

        const { rows } = await query(sql, values);
        const data = rows[0];

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('❌ [API Team Attendance Records] POST error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
        }

        // Only super-admin or the record owner (unlikely to delete own record usually) or admin
        if (session.role !== 'admin' && session.role !== 'super-admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await query(`DELETE FROM team_attendance_records WHERE id = $1`, [id]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * API Route: /api/tadarus/sessions
 * Purpose: Handle tadarus sessions creation
 * MIGRATED to use local PostgreSQL connection.
 */

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const mentorId = searchParams.get('mentorId');
        const employeeId = searchParams.get('employeeId');
        const present = searchParams.get('present') === 'true';

        let sql = 'SELECT * FROM tadarus_sessions WHERE 1=1';
        const params: any[] = [];

        if (mentorId) {
            params.push(mentorId);
            sql += ` AND mentor_id = $${params.length}`;
        }

        if (employeeId) {
            params.push(employeeId);
            if (present) {
                // Check if employeeId is in present_mentee_ids ARRAY
                sql += ` AND $${params.length} = ANY(present_mentee_ids)`;
            } else {
                // Check if employeeId is in participant_ids ARRAY
                sql += ` AND $${params.length} = ANY(participant_ids)`;
            }
        }

        sql += ' ORDER BY date DESC, start_time DESC';

        const { rows } = await query(sql, params);
        return NextResponse.json({ data: rows });
    } catch (error: any) {
        console.error('❌ [API Tadarus GET] Unexpected error:', error);
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

        // Only admins or super-admins can create sessions for others
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
            INSERT INTO tadarus_sessions (${columns})
            VALUES (${placeholders})
            RETURNING *
        `;

        const { rows } = await query(sql, values);
        const data = rows[0];

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('❌ [API Tadarus] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        if (session.role !== 'admin' && session.role !== 'super-admin') {
            return NextResponse.json({ error: 'Higher privilege required' }, { status: 403 });
        }

        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });

        const keys = Object.keys(updates);
        if (keys.length === 0) return NextResponse.json({ success: true });

        const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
        const values = [id, ...Object.values(updates)];

        const sql = `UPDATE tadarus_sessions SET ${setClause} WHERE id = $1 RETURNING *`;
        const { rows } = await query(sql, values);

        return NextResponse.json({ success: true, data: rows[0] });
    } catch (error: any) {
        console.error('❌ [API Tadarus PATCH] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        if (session.role !== 'admin' && session.role !== 'super-admin') {
            return NextResponse.json({ error: 'Higher privilege required' }, { status: 403 });
        }

        const body = await request.json();
        const { id } = body;

        if (!id) return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });

        await query('DELETE FROM tadarus_sessions WHERE id = $1', [id]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('❌ [API Tadarus DELETE] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

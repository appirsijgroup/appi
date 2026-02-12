import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * API Route: /api/activities/attendance
 * Purpose: Handle activity attendance records
 */

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const activityId = searchParams.get('activityId');
        const employeeId = searchParams.get('employeeId');

        let sql = 'SELECT * FROM activity_attendance WHERE 1=1';
        const params: any[] = [];

        if (activityId) {
            params.push(activityId);
            sql += ` AND activity_id = $${params.length}`;
        }

        if (employeeId) {
            params.push(employeeId);
            sql += ` AND employee_id = $${params.length}`;
        }

        sql += ' ORDER BY submitted_at DESC';

        const { rows } = await query(sql, params);
        return NextResponse.json({ data: rows });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { activity_id, employee_id, status, reason, is_late_entry, submitted_at } = body;

        if (!activity_id || !employee_id || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        const hospitalId = (session as any).hospitalId || null;

        const sql = `
            INSERT INTO activity_attendance (activity_id, employee_id, status, reason, is_late_entry, submitted_at, hospital_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (activity_id, employee_id)
            DO UPDATE SET
                status = EXCLUDED.status,
                reason = EXCLUDED.reason,
                is_late_entry = EXCLUDED.is_late_entry,
                submitted_at = EXCLUDED.submitted_at,
                hospital_id = COALESCE(activity_attendance.hospital_id, EXCLUDED.hospital_id),
                updated_at = NOW()
            RETURNING *
        `;

        const { rows } = await query(sql, [
            activity_id,
            employee_id,
            status,
            reason || null,
            is_late_entry || false,
            submitted_at || new Date().toISOString(),
            hospitalId
        ]);

        return NextResponse.json({ success: true, data: rows[0] });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

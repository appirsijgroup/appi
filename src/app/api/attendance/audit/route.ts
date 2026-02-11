import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * GET /api/attendance/audit
 * Fetch attendance audit data
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');
        const type = searchParams.get('type') || 'latest'; // latest, history, changes, activities, daily_changes

        if (!employeeId) return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });

        if (type === 'latest') {
            // Equivalent to rpc get_latest_attendance
            const result = await query(
                'SELECT * FROM attendance_records_history WHERE employee_id = $1 AND is_latest = true',
                [employeeId]
            );
            return NextResponse.json({ data: result.rows });
        }

        if (type === 'history') {
            const result = await query(
                'SELECT * FROM attendance_records_history WHERE employee_id = $1 ORDER BY recorded_at ASC',
                [employeeId]
            );
            return NextResponse.json({ data: result.rows });
        }

        if (type === 'changes') {
            const result = await query(
                'SELECT * FROM v_attendance_changes WHERE employee_id = $1 ORDER BY changed_at DESC',
                [employeeId]
            );
            return NextResponse.json({ data: result.rows });
        }

        if (type === 'activities') {
            const result = await query(
                'SELECT * FROM employee_monthly_activities_audit WHERE employee_id = $1 ORDER BY changed_at DESC',
                [employeeId]
            );
            return NextResponse.json({ data: result.rows });
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    } catch (error) {
        console.error('Attendance Audit API GET error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/attendance/audit
 * Record attendance (append-only)
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { employeeId, entityId, date, status, reason, location, source } = body;

        // Use the same logic as the RPC record_attendance
        // 1. Mark existing latest as false
        await query(
            'UPDATE attendance_records_history SET is_latest = false WHERE employee_id = $1 AND entity_id = $2 AND date = $3 AND is_latest = true',
            [employeeId, entityId, date]
        );

        // 2. Insert new record
        const result = await query(
            'INSERT INTO attendance_records_history (employee_id, entity_id, date, status, reason, location, source, changed_by, recorded_at, is_latest) ' +
            'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), true) RETURNING id',
            [employeeId, entityId, date, status, reason, location, source, session.userId]
        );

        return NextResponse.json({ success: true, recordId: result.rows[0].id });
    } catch (error) {
        console.error('Attendance Audit API POST error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

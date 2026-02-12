import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * API Route: /api/attendance/submit
 * Purpose: Handle attendance submission (upsert) safely
 * MIGRATED to use local PostgreSQL connection.
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Verify Authentication
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse Body
        const body = await request.json();
        const { employee_id, entity_id, status, reason, timestamp, is_late_entry, location } = body;

        // 3. Validation
        if (!employee_id || !entity_id || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 4. Perform Upsert using PostgreSQL ON CONFLICT
        const hospitalId = session.hospitalId || null;

        const sql = `
            INSERT INTO attendance_records (employee_id, entity_id, status, reason, timestamp, is_late_entry, location, hospital_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (employee_id, entity_id) 
            DO UPDATE SET 
                status = EXCLUDED.status,
                reason = EXCLUDED.reason,
                timestamp = EXCLUDED.timestamp,
                is_late_entry = EXCLUDED.is_late_entry,
                location = EXCLUDED.location,
                hospital_id = COALESCE(attendance_records.hospital_id, EXCLUDED.hospital_id)
            RETURNING *
        `;

        const { rows } = await query(sql, [
            employee_id,
            entity_id,
            status,
            reason,
            timestamp,
            is_late_entry || false,
            location || null,
            hospitalId
        ]);

        const data = rows[0];

        // 6. Return Data
        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('❌ [API Attendance Submit] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        // 1. Verify Authentication
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Get Params
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');
        const entityId = searchParams.get('entityId');

        if (!employeeId || !entityId) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Check if user is deleting their own attendance or if they are admin
        if (session.userId !== employeeId && session.role !== 'admin' && session.role !== 'super-admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 3. Perform Delete
        await query(
            `DELETE FROM attendance_records WHERE employee_id = $1 AND entity_id = $2`,
            [employeeId, entityId]
        );

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('❌ [API Attendance Delete] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

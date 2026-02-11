import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * API Route: /api/attendance/batch
 * Purpose: Handle batch attendance submission safely
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
        const { employeeId, records } = body;

        if (!employeeId || !Array.isArray(records) || records.length === 0) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        // 3. Perform Bulk Upsert
        // We need to construct a single SQL statement with multiple values tuples

        // Columns: employee_id, entity_id, status, timestamp, reason, is_late_entry
        // (Assuming these are the columns. Based on previous files, seems correct)

        const values: any[] = [];
        const placeholders: string[] = [];

        records.forEach((record: any, index: number) => {
            const i = index * 6; // 6 parameters per record
            placeholders.push(`($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5}, $${i + 6})`);

            values.push(
                record.employee_id || employeeId,
                record.entity_id,
                record.status,
                record.timestamp,
                record.reason || null,
                record.is_late_entry || false
            );
        });

        const sql = `
            INSERT INTO attendance_records (employee_id, entity_id, status, timestamp, reason, is_late_entry)
            VALUES ${placeholders.join(', ')}
            ON CONFLICT (employee_id, entity_id) DO UPDATE 
            SET 
                status = EXCLUDED.status,
                timestamp = EXCLUDED.timestamp,
                reason = EXCLUDED.reason,
                is_late_entry = EXCLUDED.is_late_entry
            RETURNING *
        `;

        const { rows } = await query(sql, values);

        // 5. Return Data
        return NextResponse.json({ success: true, data: rows });

    } catch (error: any) {
        console.error('❌ [API Attendance Batch] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

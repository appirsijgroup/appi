import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { isAuthorizedForUser, isAdmin } from '@/lib/authHelpers';
import { handleError, handleSuccess } from '@/lib/api-utils';

/**
 * GET /api/attendance
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');
        const history = searchParams.get('history') === 'true';

        if (!employeeId) {
            return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 });
        }

        // ✅ SECURITY: Use centralized authorization
        const authorized = await isAuthorizedForUser(employeeId);
        if (!authorized) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { rows } = await query(
            `SELECT * FROM attendance_records WHERE employee_id = $1 ORDER BY timestamp DESC`,
            [employeeId]
        );

        const attendance: Record<string, any> = {};
        const historyData: Record<string, Record<string, any>> = {};

        rows.forEach(row => {
            const dateStr = new Date(row.timestamp).toISOString().split('T')[0];
            const data = {
                status: row.status,
                reason: row.reason,
                timestamp: new Date(row.timestamp).getTime(),
                submitted: true,
                isLateEntry: row.is_late_entry
            };

            if (!attendance[row.entity_id]) {
                attendance[row.entity_id] = data;
            }

            if (!historyData[dateStr]) {
                historyData[dateStr] = {};
            }
            if (!historyData[dateStr][row.entity_id]) {
                historyData[dateStr][row.entity_id] = data;
            }
        });

        if (history) {
            return handleSuccess({ history: historyData });
        } else {
            return handleSuccess({ attendance });
        }

    } catch (error: any) {
        return handleError(error);
    }
}

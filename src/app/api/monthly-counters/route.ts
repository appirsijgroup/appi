import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { isAuthorizedForUser, isAdmin } from '@/lib/authHelpers';
import { handleError, handleSuccess } from '@/lib/api-utils';

/**
 * GET /api/monthly-counters
 */
export async function GET(request: NextRequest) {
    try {

        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');

        if (!employeeId) {
            return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
        }

        // Check Auth
        let authorized = false;
        try {
            authorized = await isAuthorizedForUser(employeeId);
        } catch (authErr) {
            console.error('❌ [API-Counters] Auth Helper Crash:', authErr);
            // Fallback for extreme cases (if session is self)
            authorized = session.userId === employeeId;
        }

        if (!authorized) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch from NORMALIZED table

        const { rows: newRecords } = await query(
            'SELECT month_key, report_data FROM employee_monthly_records WHERE employee_id = $1',
            [employeeId]
        );

        const reports: Record<string, any> = {};
        if (newRecords && newRecords.length > 0) {
            newRecords.forEach((row: any) => {
                if (row.month_key) {
                    reports[row.month_key] = row.report_data || {};
                }
            });
        }

        return handleSuccess({ reports });
    } catch (error: any) {
        console.error('❌ [API-Counters] Fatal GET Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/monthly-counters
 */
export async function POST(request: NextRequest) {
    try {

        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        let body;
        try {
            body = await request.json();
        } catch (e) {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { employeeId, reports } = body;

        if (!employeeId || !reports) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Security check
        const isSelf = session.userId === employeeId;
        const isPermitted = isSelf || (['admin', 'super-admin', 'owner'].includes(session.role));

        if (!isPermitted) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Process bulk update
        const reportsToUpdate = typeof reports === 'object' ? Object.entries(reports) : [];
        if (reportsToUpdate.length === 0) {
            return handleSuccess({ success: true, message: "Nothing to update" });
        }



        const promises = reportsToUpdate.map(async ([monthKey, monthData]) => {
            if (!monthKey || typeof monthKey !== 'string') return;

            return query(
                `INSERT INTO employee_monthly_records (id, employee_id, month_key, report_data, updated_at) 
                 VALUES (gen_random_uuid(), $1, $2, $3, NOW())
                 ON CONFLICT (employee_id, month_key) 
                 DO UPDATE SET report_data = EXCLUDED.report_data, updated_at = NOW()`,
                [employeeId, monthKey, monthData]
            );
        });

        await Promise.all(promises);

        return handleSuccess({ success: true, message: "Data saved successfully" });
    } catch (error: any) {
        console.error('❌ [API-Counters] Fatal POST Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

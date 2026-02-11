import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { query } from '@/lib/db';
import { Employee, TeamAttendanceRecord } from '@/types';

/**
 * Combined Admin API to fetch all necessary data for the dashboard in one go.
 */
export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session');

        if (!sessionCookie) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const session = await verifyToken(sessionCookie.value);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const isAdmin = session.role === 'admin' || session.role === 'super-admin' || session.role === 'owner';
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const isSuperAdmin = session.role === 'super-admin' || session.role === 'owner';
        const managedHospitalIds = session.managedHospitalIds || [];

        const { searchParams } = new URL(request.url);
        const startDateParam = searchParams.get('startDate');
        const monthParam = searchParams.get('month');
        const yearParam = searchParams.get('year');

        // Determine Bounded Range
        let finalStart: string;
        let finalEnd: string | null = null;

        if (monthParam && yearParam) {
            const m = parseInt(monthParam);
            const y = parseInt(yearParam);
            finalStart = `${y}-${String(m).padStart(2, '0')}-01T00:00:00`;
            const lastDay = new Date(y, m, 0).getDate();
            finalEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59`;
        } else if (startDateParam) {
            finalStart = startDateParam;
            if (startDateParam.length === 10) { // YYYY-MM-DD
                finalStart += 'T00:00:00';
            }
            // Infer end of month if it looks like month start
            if (startDateParam.includes('-01')) {
                const d = new Date(startDateParam);
                const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
                finalEnd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59`;
            }
        } else {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            finalStart = thirtyDaysAgo.toISOString();
        }

        // Hospital filter construction
        // Check if we need hospital filtering
        if (!isSuperAdmin && managedHospitalIds.length === 0) {
            // No hospitals managed - return empty
            return NextResponse.json({
                success: true,
                data: {
                    attendanceRecords: [],
                    teamAttendanceRecords: [],
                    activityAttendanceRecords: [],
                    employees: []
                }
            });
        }

        // 1. Fetch Attendance Records
        const sholatParams: (string | string[] | number)[] = [finalStart];
        let sholatSql = 'SELECT * FROM attendance_records WHERE timestamp >= $1';
        if (finalEnd) {
            sholatSql += ' AND timestamp <= $2';
            sholatParams.push(finalEnd);
        }
        if (!isSuperAdmin) {
            sholatSql += ' AND hospital_id = ANY($' + (sholatParams.length + 1) + ')';
            sholatParams.push(managedHospitalIds);
        }
        const sholatRes = await query(sholatSql + ' LIMIT 50000', sholatParams);

        // 2. Fetch Team Records (Using DATE comparison)
        const teamParams: (string | string[] | number)[] = [finalStart.split('T')[0]];
        let teamSql = 'SELECT * FROM team_attendance_records WHERE session_date >= $1';
        if (finalEnd) {
            teamSql += ' AND session_date <= $2';
            teamParams.push(finalEnd.split('T')[0]);
        }
        if (!isSuperAdmin) {
            teamSql += ' AND hospital_id = ANY($' + (teamParams.length + 1) + ')';
            teamParams.push(managedHospitalIds);
        }
        const teamRes = await query<TeamAttendanceRecord>(teamSql + ' LIMIT 10000', teamParams);

        // 3. Fetch Employees with a safe subquery
        let employeeSql = `
            SELECT id, name, email, role, hospital_id, unit, bagian, profession, is_active, 
                   (SELECT COALESCE(json_agg(month_key), '[]') FROM mutabaah_activations WHERE employee_id = employees.id) as activated_months
            FROM employees
        `;
        const empParams: (string | string[] | number)[] = [];
        if (!isSuperAdmin) {
            employeeSql += ' WHERE hospital_id = ANY($1)';
            empParams.push(managedHospitalIds);
        }
        const employeeRes = await query<Employee>(employeeSql + ' ORDER BY name ASC', empParams);

        return NextResponse.json({
            success: true,
            data: {
                attendanceRecords: sholatRes.rows,
                teamAttendanceRecords: teamRes.rows,
                activityAttendanceRecords: [], // Optional
                employees: employeeRes.rows
            }
        });

    } catch (error: any) {
        console.error('❌ [API Admin Full-Sync] Fatal Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal Server Error'
        }, { status: 500 });
    }
}

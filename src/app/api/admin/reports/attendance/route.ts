import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session');

        if (!sessionCookie) {
            console.error('❌ [/api/admin/reports/attendance] No session cookie found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const session = await verifyToken(sessionCookie.value);

        if (!session) {
            console.error('❌ [/api/admin/reports/attendance] Token verification failed');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Session verified

        const isAdmin = session.role === 'admin';
        const isSuperAdmin = session.role === 'super-admin' || session.role === 'owner';

        if (!isAdmin && !isSuperAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const managedHospitalIds = (session as any).managedHospitalIds || [];

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Builders for queries
        const attendanceSql = `SELECT * FROM attendance_records`;
        const teamSql = `SELECT * FROM team_attendance_records`;
        const activitySql = `SELECT * FROM activity_attendance`;

        const params: any[] = [];
        const conditions: string[] = [];

        // Note: For simple string concatenation where params are shared, we have to be careful.
        // But here filters are date ranges.

        // Let's use separate query calls to keep it simple and safe
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const defaultStart = thirtyDaysAgo.toISOString();
        const defaultStartDateOnly = thirtyDaysAgo.toISOString().split('T')[0];

        // 1. Attendance Records
        const attConditions = [];
        const attParams = [];
        if (startDate) {
            attConditions.push(`"timestamp" >= $${attParams.length + 1}`);
            attParams.push(startDate);
        }
        if (endDate) {
            attConditions.push(`timestamp <= $${attParams.length + 1}`);
            attParams.push(endDate + 'T23:59:59');
        }
        if (!startDate && !endDate) {
            attConditions.push(`"timestamp" >= $${attParams.length + 1}`);
            attParams.push(defaultStart);
        }
        if (!isSuperAdmin) {
            attConditions.push(`hospital_id = ANY($${attParams.length + 1})`);
            attParams.push(managedHospitalIds);
        }

        const finalAttSql = attendanceSql + (attConditions.length ? ' WHERE ' + attConditions.join(' AND ') : '') + ' ORDER BY timestamp ASC' + (!startDate && !endDate ? ' LIMIT 5000' : ' LIMIT 10000');

        // 2. Team Attendance
        const teamConditions = [];
        const teamParams = [];
        if (startDate) {
            teamConditions.push(`session_date >= $${teamParams.length + 1}`);
            teamParams.push(startDate);
        } else {
            teamConditions.push(`session_date >= $${teamParams.length + 1}`);
            teamParams.push(defaultStartDateOnly);
        }
        if (!isSuperAdmin) {
            teamConditions.push(`hospital_id = ANY($${teamParams.length + 1})`);
            teamParams.push(managedHospitalIds);
        }
        const finalTeamSql = teamSql + (teamConditions.length ? ' WHERE ' + teamConditions.join(' AND ') : '') + ' LIMIT 5000';

        // 3. Activity Attendance
        const actConditions = [];
        const actParams = [];
        if (startDate) {
            actConditions.push(`submitted_at >= $${actParams.length + 1}`);
            actParams.push(startDate);
        } else {
            actConditions.push(`submitted_at >= $${actParams.length + 1}`);
            actParams.push(defaultStart);
        }
        if (!isSuperAdmin) {
            actConditions.push(`hospital_id = ANY($${actParams.length + 1})`);
            actParams.push(managedHospitalIds);
        }
        const finalActSql = activitySql + (actConditions.length ? ' WHERE ' + actConditions.join(' AND ') : '') + ' LIMIT 5000';


        const [attRes, teamRes, actRes] = await Promise.all([
            query(finalAttSql, attParams),
            query(finalTeamSql, teamParams),
            query(finalActSql, actParams)
        ]);

        return NextResponse.json({
            success: true,
            data: {
                attendanceRecords: attRes.rows || [],
                teamAttendanceRecords: teamRes.rows || [],
                activityAttendanceRecords: actRes.rows || []
            }
        });

    } catch (error: any) {
        console.error('Admin attendance report error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

interface ActivityEntryMap {
    [activityId: string]: boolean;
}

interface DayMap {
    [dayKey: string]: ActivityEntryMap;
}

interface MonthMap {
    [monthKey: string]: DayMap;
}

interface EmployeeActivitiesMap {
    [employeeId: string]: MonthMap;
}

/**
 * API Route: /api/admin/bulk-monthly-activities
 * Purpose: Fetch monthly activities for ALL employees in bulk (Admin only)
 * MIGRATED: Now uses local PostgreSQL database and NORMALIZED employee_monthly_records
 */
export async function GET(request: NextRequest) {
    try {
        // Verify authorization (Admin or Mentor/Supervisor/KaUnit)
        const session = await getSession();
        const isAdmin = session && (session.role === 'admin' || session.role === 'super-admin' || session.role === 'owner');
        const isMentor = session && (session.canBeMentor || session.canBeSupervisor || session.canBeKaUnit || session.canBeDirut);

        if (!session || (!isAdmin && !isMentor)) {
            return NextResponse.json({ error: 'Unauthorized - Adequate role required' }, { status: 401 });
        }

        // Get target employee IDs (all if admin, only mentees if mentor)
        let targetEmployeeIds: string[] | null = null;

        if (!isAdmin) {
            // Get mentee IDs for this mentor/supervisor/kaunit
            const result = await query(
                `SELECT id FROM employees 
                 WHERE mentor_id = $1 OR supervisor_id = $1 OR ka_unit_id = $1`,
                [session.userId]
            );
            targetEmployeeIds = [session.userId, ...result.rows.map(m => m.id)];
        }

        // Get month and year from query params
        const searchParams = request.nextUrl.searchParams;
        const monthParam = searchParams.get('month'); // 1-12
        const yearParam = searchParams.get('year'); // YYYY

        let startDate: string | null = null;
        let endDate: string | null = null;
        let targetMonthKey = '2000-01'; // Default

        if (monthParam && yearParam) {
            const month = parseInt(monthParam);
            const year = parseInt(yearParam);
            const start = new Date(year, month - 1, 1);
            const end = new Date(year, month, 0, 23, 59, 59); // Last day of month

            // Format as YYYY-MM-DD for database queries
            startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
            endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
            targetMonthKey = `${year}-${String(month).padStart(2, '0')}`;
        }

        // Main Result Object
        const allActivitiesMap: EmployeeActivitiesMap = {};

        // Helper to add entry
        const addActivityEntry = (employeeId: string, monthKey: string, dayKey: string, activityId: string) => {
            if (!allActivitiesMap[employeeId]) allActivitiesMap[employeeId] = {};
            if (!allActivitiesMap[employeeId][monthKey]) allActivitiesMap[employeeId][monthKey] = {};
            if (!allActivitiesMap[employeeId][monthKey][dayKey]) allActivitiesMap[employeeId][monthKey][dayKey] = {};
            allActivitiesMap[employeeId][monthKey][dayKey][activityId] = true;
        };

        // 1. Fetch attendance_records (hadir only)
        let attendanceSql = `SELECT employee_id, timestamp, entity_id FROM attendance_records WHERE status = 'hadir'`;
        const attendanceParams: (string | string[] | number)[] = [];
        let paramIndex = 1;

        if (targetEmployeeIds) {
            attendanceSql += ` AND employee_id = ANY($${paramIndex++})`;
            attendanceParams.push(targetEmployeeIds);
        }

        if (startDate && endDate) {
            attendanceSql += ` AND timestamp >= $${paramIndex++} AND timestamp <= $${paramIndex++}`;
            attendanceParams.push(startDate, endDate + 'T23:59:59');
        } else {
            attendanceSql += ` LIMIT 1000`;
        }

        const attendanceData = await query(attendanceSql, attendanceParams);

        if (attendanceData.rows) {
            attendanceData.rows.forEach(row => {
                const date = new Date(row.timestamp);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const dayKey = String(date.getDate()).padStart(2, '0');
                // Basic attendance (Shalat Berjamaah)
                addActivityEntry(row.employee_id, monthKey, dayKey, 'shalat_berjamaah');
            });
        }

        // 2. Fetch employee_monthly_records (Normalized Table)
        // Since we are fetching specific month, we can query directly by month_key

        // Simpler query: Get rows for this month_key directly
        let monthlyRecordsSql = `SELECT employee_id, report_data as month_data FROM employee_monthly_records WHERE month_key = $${paramIndex++}`;
        const monthlyRecordsParams: (string | string[] | number)[] = [...attendanceParams]; // Clone params structure? No, rebuild params list

        // Reset params for new query
        let mrParamIndex = 1;
        const mrParams: any[] = [targetMonthKey];

        if (targetEmployeeIds) {
            monthlyRecordsSql = `SELECT employee_id, report_data as month_data FROM employee_monthly_records WHERE month_key = $${mrParamIndex++} AND employee_id = ANY($${mrParamIndex++})`;
            mrParams.push(targetEmployeeIds);
        } else {
            monthlyRecordsSql = `SELECT employee_id, report_data as month_data FROM employee_monthly_records WHERE month_key = $${mrParamIndex++}`;
        }

        const monthlyRecords = await query(monthlyRecordsSql, mrParams);

        // Process monthly reports (manual counters)
        if (monthlyRecords.rows) {
            monthlyRecords.rows.forEach(report => {
                const empId = report.employee_id;
                const monthData = report.month_data;

                if (!monthData) return;

                const currentMonthKey = targetMonthKey;

                Object.entries(monthData).forEach(([activityId, activityData]: [string, any]) => {
                    if (activityData.entries && Array.isArray(activityData.entries)) {
                        activityData.entries.forEach((entry: any) => {
                            const dayKey = entry.date.substring(8, 10);
                            addActivityEntry(empId, currentMonthKey, dayKey, activityId);
                        });
                    }
                    if (activityData.bookEntries && Array.isArray(activityData.bookEntries)) {
                        activityData.bookEntries.forEach((entry: any) => {
                            const dayKey = entry.dateCompleted.substring(8, 10);
                            addActivityEntry(empId, currentMonthKey, dayKey, activityId);
                        });
                    }
                    if (!activityData.entries && !activityData.bookEntries && activityData.completedAt) {
                        const completedDate = new Date(activityData.completedAt);
                        const dayKey = String(completedDate.getDate()).padStart(2, '0');
                        const cMonthKey = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`;
                        if (cMonthKey === currentMonthKey) {
                            addActivityEntry(empId, currentMonthKey, dayKey, activityId);
                        }
                    }
                });
            });
        }

        // 3. Tadarus Sessions
        let tadarusSql = `SELECT date, present_mentee_ids FROM tadarus_sessions WHERE 1=1`;
        const tadarusParams: any[] = [];
        let tIndex = 1;

        if (startDate && endDate) {
            tadarusSql += ` AND date >= $${tIndex++} AND date <= $${tIndex++}`;
            tadarusParams.push(startDate, endDate);
        }

        const tadarusSessions = await query(tadarusSql, tadarusParams);

        if (tadarusSessions.rows) {
            tadarusSessions.rows.forEach(session => {
                const date = session.date; // YYYY-MM-DD
                const monthKey = date.substring(0, 7);
                const dayKey = date.substring(8, 10);
                const menteeIds = session.present_mentee_ids || [];

                menteeIds.forEach((empId: string) => {
                    // Check if this empId is in our target list (if filtered)
                    if (!targetEmployeeIds || targetEmployeeIds.includes(empId)) {
                        addActivityEntry(empId, monthKey, dayKey, 'tadarus');
                    }
                });
            });
        }

        // 4. Team Attendance Records
        let teamSql = `SELECT user_id, session_date, session_type FROM team_attendance_records WHERE 1=1`;
        const teamParams: any[] = [];
        let teamIndex = 1;

        if (targetEmployeeIds) {
            teamSql += ` AND user_id = ANY($${teamIndex++})`;
            teamParams.push(targetEmployeeIds);
        }

        if (startDate && endDate) {
            teamSql += ` AND session_date >= $${teamIndex++} AND session_date <= $${teamIndex++}`;
            teamParams.push(startDate, endDate);
        }

        const teamAttendance = await query(teamSql, teamParams);

        if (teamAttendance.rows) {
            teamAttendance.rows.forEach((record) => {
                const date = record.session_date;
                if (!date) return;

                const monthKey = date instanceof Date ? date.toISOString().substring(0, 7) : date.substring(0, 7);
                const dayKey = date instanceof Date ? String(date.getDate()).padStart(2, '0') : date.substring(8, 10);

                const typeLower = record.session_type?.toLowerCase().trim();
                let activityId: string = record.session_type;

                if (typeLower === 'kie') activityId = 'tepat_waktu_kie';
                else if (typeLower === 'doa bersama') activityId = 'doa_bersama';
                else if (typeLower === 'bbq' || typeLower === 'umum' || typeLower === 'tadarus') activityId = 'tadarus';
                else if (typeLower === 'kajian selasa') activityId = 'kajian_selasa';
                else if (typeLower === 'pengajian persyarikatan' || typeLower === 'persyarikatan') activityId = 'persyarikatan';
                else if (typeLower === 'membaca al-quran dan buku' || typeLower === 'baca alquran buku') activityId = 'baca_alquran_buku';

                addActivityEntry(record.user_id, monthKey, dayKey, activityId);
            });
        }

        // 5. Activity Attendance
        let activitySql = `
            SELECT aa.employee_id, a.date, a.activity_type
            FROM activity_attendance aa
            INNER JOIN activities a ON aa.activity_id = a.id
            WHERE aa.status = 'hadir'
        `;
        const activityParams: any[] = [];
        let actIndex = 1;

        if (targetEmployeeIds) {
            activitySql += ` AND aa.employee_id = ANY($${actIndex++})`;
            activityParams.push(targetEmployeeIds);
        }

        if (startDate && endDate) {
            activitySql += ` AND a.date >= $${actIndex++} AND a.date <= $${actIndex++}`;
            activityParams.push(startDate, endDate);
        }

        const activityAttendance = await query(activitySql, activityParams);

        if (activityAttendance.rows) {
            activityAttendance.rows.forEach((record) => {
                const date = record.date;
                // Check if date is string or Date object
                const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
                const monthKey = dateStr.substring(0, 7);
                const dayKey = dateStr.substring(8, 10);

                const type = record.activity_type;
                const typeLower = type?.toLowerCase().trim();

                let activityId = '';
                if (typeLower === 'kajian selasa') activityId = 'kajian_selasa';
                else if (typeLower === 'pengajian persyarikatan' || typeLower === 'persyarikatan') activityId = 'persyarikatan';
                else if (typeLower === 'kie') activityId = 'tepat_waktu_kie';
                else if (typeLower === 'doa bersama') activityId = 'doa_bersama';
                else if (typeLower === 'bbq' || typeLower === 'umum' || typeLower === 'tadarus') activityId = 'tadarus';
                else if (typeLower === 'membaca al-quran dan buku' || typeLower === 'baca alquran buku') activityId = 'baca_alquran_buku';

                if (activityId) {
                    addActivityEntry(record.employee_id, monthKey, dayKey, activityId);
                }
            });
        }

        return NextResponse.json({ allActivities: allActivitiesMap });
    } catch (error) {
        const err = error as Error;
        console.error('Error in bulk-monthly-activities:', err);
        return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 });
    }
}

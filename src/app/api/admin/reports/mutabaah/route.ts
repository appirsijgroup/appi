import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { DAILY_ACTIVITIES } from '@/constants/monthlyActivities';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // 1. Auth Check
        const sessionCookie = request.cookies.get('session')?.value;
        if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const session = await verifyToken(sessionCookie);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // 2. Query Params
        const { searchParams } = new URL(request.url);
        const year = searchParams.get('year');
        const hospitalId = searchParams.get('hospitalId');
        const unit = searchParams.get('unit');
        const profession = searchParams.get('profession');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        if (!year) return NextResponse.json({ error: 'Year is required' }, { status: 400 });

        // 4. Build Employee Query
        const empParams: any[] = [];
        const empConditions: string[] = [`is_active = true`, `id ~ '^[0-9]+$'`];

        if (hospitalId && hospitalId !== 'all') {
            const { rows: hospRows } = await query(`SELECT id, brand FROM hospitals WHERE id ILIKE $1 LIMIT 1`, [hospitalId]);
            const hosp = hospRows[0];
            if (hosp) {
                const p1 = empParams.length + 1;
                const p2 = empParams.length + 2;
                empConditions.push(`(hospital_id ILIKE $${p1} OR hospital_id ILIKE $${p2})`);
                empParams.push(hosp.id, hosp.brand);
            } else {
                const p1 = empParams.length + 1;
                empConditions.push(`hospital_id ILIKE $${p1}`);
                empParams.push(`%${hospitalId}%`);
            }
        }

        if (unit && unit !== 'all') {
            empConditions.push(`unit = $${empParams.length + 1}`);
            empParams.push(unit);
        }
        if (profession && profession !== 'all') {
            empConditions.push(`profession = $${empParams.length + 1}`);
            empParams.push(profession);
        }
        if (search) {
            const p = empParams.length + 1;
            empConditions.push(`(name ILIKE $${p} OR id::text ILIKE $${p})`);
            empParams.push(`%${search}%`);
        }

        const whereClause = empConditions.length ? 'WHERE ' + empConditions.join(' AND ') : '';

        const countSql = `SELECT COUNT(*) as total FROM employees ${whereClause}`;
        const { rows: countRows } = await query(countSql, empParams);
        const totalCount = parseInt(countRows[0]?.total || '0');

        if (totalCount === 0) {
            return NextResponse.json({ records: [], total: 0, totalPages: 0 });
        }

        const offset = (page - 1) * limit;
        const empSql = `
            SELECT id, name, unit, profession, hospital_id, mentor_id, profession_category 
            FROM employees 
            ${whereClause} 
            ORDER BY name ASC 
            LIMIT $${empParams.length + 1} OFFSET $${empParams.length + 2}
        `;
        const { rows: employees } = await query(empSql, [...empParams, limit, offset]);

        const employeeIds = employees.map(e => e.id);
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31T23:59:59`;

        const mentorIds = [...new Set(employees.map((e: any) => e.mentor_id).filter(Boolean))];
        const mentorMap: Record<string, string> = {};
        if (mentorIds.length > 0) {
            const { rows: mentors } = await query(`SELECT id, name FROM employees WHERE id = ANY($1)`, [mentorIds]);
            mentors.forEach((m: any) => { mentorMap[m.id] = m.name });
        }

        // 5. Parallel Data Fetching - UPDATED TO NEW TABLE
        const [
            monthlyRecordsRes,
            attendanceRecordsRes,
            teamAttendanceRes,
            activityAttendanceRes,
            submissionsRes
        ] = await Promise.all([
            // NEW TABLE: employee_monthly_records
            query(`SELECT employee_id, month_key, report_data as reports FROM employee_monthly_records 
                   WHERE employee_id = ANY($1) AND month_key >= $2 AND month_key <= $3`,
                [employeeIds, `${year}-01`, `${year}-12`]),

            query(`SELECT employee_id, timestamp, status FROM attendance_records 
                    WHERE employee_id = ANY($1) AND status = 'hadir' AND timestamp >= $2 AND timestamp <= $3`,
                [employeeIds, startDate, endDate]),

            query(`SELECT user_id, session_date, session_type FROM team_attendance_records 
                    WHERE user_id = ANY($1) AND session_date >= $2 AND session_date <= $3`,
                [employeeIds, startDate, `${year}-12-31`]),

            query(`SELECT aa.employee_id, a.date, a.activity_type 
                    FROM activity_attendance aa 
                    JOIN activities a ON aa.activity_id = a.id 
                    WHERE aa.employee_id = ANY($1) AND aa.status = 'hadir' AND a.date >= $2 AND a.date <= $3`,
                [employeeIds, startDate, `${year}-12-31`]),

            query(`SELECT mentee_id, month_key, status FROM monthly_report_submissions 
                    WHERE mentee_id = ANY($1) AND status = 'approved'`,
                [employeeIds])
        ]);

        // 6. Process and Merge Stats
        const sidiqActivities = DAILY_ACTIVITIES.filter(a => a.category === 'SIDIQ (Integritas)');
        const tablighActivities = DAILY_ACTIVITIES.filter(a => a.category === 'TABLIGH (Teamwork)');
        const amanahActivities = DAILY_ACTIVITIES.filter(a => a.category === 'AMANAH (Disiplin)');
        const fatonahActivities = DAILY_ACTIVITIES.filter(a => a.category === 'FATONAH (Belajar)');

        const monthlySidiqTarget = sidiqActivities.reduce((sum, a) => sum + a.monthlyTarget, 0);
        const monthlyTablighTarget = tablighActivities.reduce((sum, a) => sum + a.monthlyTarget, 0);
        const monthlyAmanahTarget = amanahActivities.reduce((sum, a) => sum + a.monthlyTarget, 0);
        const monthlyFatonahTarget = fatonahActivities.reduce((sum, a) => sum + a.monthlyTarget, 0);

        const performanceMap: Record<string, Record<string, Record<string, Record<string, boolean>>>> = {};

        const addPerformance = (empId: string, monthKey: string, dayKey: string, activityId: string) => {
            if (!performanceMap[empId]) performanceMap[empId] = {};
            if (!performanceMap[empId][monthKey]) performanceMap[empId][monthKey] = {};
            if (!performanceMap[empId][monthKey][dayKey]) performanceMap[empId][monthKey][dayKey] = {};
            performanceMap[empId][monthKey][dayKey][activityId] = true;
        };

        // Process Attendance
        attendanceRecordsRes.rows.forEach((r: any) => {
            const date = new Date(r.timestamp);
            const mKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const dKey = String(date.getDate()).padStart(2, '0');
            addPerformance(r.employee_id, mKey, dKey, 'shalat_berjamaah');
        });

        // Process team attendance
        teamAttendanceRes.rows.forEach((r: any) => {
            const mKey = r.session_date.substring(0, 7);
            const dKey = r.session_date.substring(8, 10);
            const type = r.session_type?.toLowerCase().trim();
            if (type === 'kie') addPerformance(r.user_id, mKey, dKey, 'tepat_waktu_kie');
            else if (type === 'doa bersama') addPerformance(r.user_id, mKey, dKey, 'doa_bersama');
            else if (type === 'kajian selasa') addPerformance(r.user_id, mKey, dKey, 'kajian_selasa');
            else if (type === 'pengajian persyarikatan' || type === 'persyarikatan') addPerformance(r.user_id, mKey, dKey, 'persyarikatan');
        });

        // Process Activity Attendance
        activityAttendanceRes.rows.forEach((r: any) => {
            const mKey = r.date.substring(0, 7);
            const dKey = r.date.substring(8, 10);
            const type = r.activity_type?.toLowerCase().trim();
            if (type === 'kajian selasa') addPerformance(r.employee_id, mKey, dKey, 'kajian_selasa');
            else if (type === 'pengajian persyarikatan' || type === 'persyarikatan') addPerformance(r.employee_id, mKey, dKey, 'persyarikatan');
            else if (type === 'kie') addPerformance(r.employee_id, mKey, dKey, 'tepat_waktu_kie');
            else if (type === 'doa bersama') addPerformance(r.employee_id, mKey, dKey, 'doa_bersama');
            else if (type === 'bbq' || type === 'umum' || type === 'tadarus') addPerformance(r.employee_id, mKey, dKey, 'tadarus');
            else if (type === 'membaca al-quran dan buku' || type === 'baca alquran buku') addPerformance(r.employee_id, mKey, dKey, 'baca_alquran_buku');
        });

        // Process Monthly Records (Manual Counters) - UPDATED FOR NEW MULTI-ROW STRUCTURE
        const manualReportMap: Record<string, any> = {};
        monthlyRecordsRes.rows.forEach((r: any) => {
            if (!manualReportMap[r.employee_id]) manualReportMap[r.employee_id] = {};

            const mKey = r.month_key;
            const mData = r.reports || {};
            manualReportMap[r.employee_id][mKey] = mData;

            Object.entries(mData).forEach(([actId, actData]: [string, any]) => {
                if (actData.entries && Array.isArray(actData.entries)) {
                    actData.entries.forEach((e: any) => {
                        if (e.date) {
                            const dKey = e.date.substring(8, 10);
                            addPerformance(r.employee_id, mKey, dKey, actId);
                        }
                    });
                }
                if (actData.bookEntries && Array.isArray(actData.bookEntries)) {
                    actData.bookEntries.forEach((e: any) => {
                        if (e.dateCompleted) {
                            const dKey = e.dateCompleted.substring(8, 10);
                            addPerformance(r.employee_id, mKey, dKey, actId);
                        }
                    });
                }
                if (!actData.entries && !actData.bookEntries && actData.completedAt) {
                    const date = new Date(actData.completedAt);
                    const dKey = String(date.getDate()).padStart(2, '0');
                    addPerformance(r.employee_id, mKey, dKey, actId);
                }
            });
        });

        const approvalMap: Record<string, Record<string, boolean>> = {};
        submissionsRes.rows.forEach((s: any) => {
            if (!approvalMap[s.mentee_id]) approvalMap[s.mentee_id] = {};
            approvalMap[s.mentee_id][s.month_key] = true;
        });

        // 7. Assemble final records
        const records = employees.map((emp: any) => {
            const empPerf = performanceMap[emp.id] || {};
            const allReports = manualReportMap[emp.id] || {};

            let sidiqCount = 0, tablighCount = 0, amanahCount = 0, fatonahCount = 0, monthsCount = 0;

            for (let m = 1; m <= 12; m++) {
                const monthKey = `${year}-${String(m).padStart(2, '0')}`;
                const monthData = empPerf[monthKey];
                const manualMonthData = allReports[monthKey];

                if (monthData || manualMonthData) {
                    monthsCount++;
                    const getCountForActivity = (activityId: string) => {
                        let count = 0;
                        if (monthData) {
                            Object.values(monthData).forEach((day: any) => {
                                if (day[activityId]) count++;
                            });
                        }
                        if (manualMonthData?.[activityId]?.count > count) {
                            count = manualMonthData[activityId].count;
                        }
                        return count;
                    };

                    const countForCategory = (activities: any[]) => {
                        if (!approvalMap[emp.id]?.[monthKey]) return 0;
                        return activities.reduce((sum, act) => sum + getCountForActivity(act.id), 0);
                    };

                    sidiqCount += countForCategory(sidiqActivities);
                    tablighCount += countForCategory(tablighActivities);
                    amanahCount += countForCategory(amanahActivities);
                    fatonahCount += countForCategory(fatonahActivities);
                }
            }

            const sidiqTarget = monthlySidiqTarget * monthsCount;
            const tablighTarget = monthlyTablighTarget * monthsCount;
            const amanahTarget = monthlyAmanahTarget * monthsCount;
            const fatonahTarget = monthlyFatonahTarget * monthsCount;
            const totalTarget = sidiqTarget + tablighTarget + amanahTarget + fatonahTarget;
            const totalCount = sidiqCount + tablighCount + amanahCount + fatonahCount;

            return {
                employeeId: emp.id,
                employeeName: emp.name,
                unit: emp.unit,
                profession: emp.profession,
                professionCategory: emp.profession_category,
                hospitalId: emp.hospital_id,
                mentorId: emp.mentor_id,
                mentorName: emp.mentor_id ? (mentorMap[emp.mentor_id] || emp.mentor_id) : '-',
                monthKey: year,
                sidiqCount, sidiqTarget, sidiqPercentage: sidiqTarget > 0 ? Math.min(100, Math.round((sidiqCount / sidiqTarget) * 100)) : 0,
                tablighCount, tablighTarget, tablighPercentage: tablighTarget > 0 ? Math.min(100, Math.round((tablighCount / tablighTarget) * 100)) : 0,
                amanahCount, amanahTarget, amanahPercentage: amanahTarget > 0 ? Math.min(100, Math.round((amanahCount / amanahTarget) * 100)) : 0,
                fatonahCount, fatonahTarget, fatonahPercentage: fatonahTarget > 0 ? Math.min(100, Math.round((fatonahCount / fatonahTarget) * 100)) : 0,
                totalCount, totalTarget, totalPercentage: totalTarget > 0 ? Math.min(100, Math.round((totalCount / totalTarget) * 100)) : 0
            };
        });

        return NextResponse.json({
            records, total: totalCount || 0, totalPages: Math.ceil((totalCount || 0) / limit), page
        });
    } catch (error) {
        console.error('❌ [Mutabaah Report API] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

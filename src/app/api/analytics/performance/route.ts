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
        const month = searchParams.get('month'); // "01"
        const year = searchParams.get('year');   // "2026"
        const unit = searchParams.get('unit');
        const bagian = searchParams.get('bagian');
        const professionCategory = searchParams.get('professionCategory');
        const profession = searchParams.get('profession');
        const hospitalId = searchParams.get('hospitalId')?.toLowerCase().trim();
        const employeeId = searchParams.get('employeeId'); // Specific user override

        // 2a. Role-Based Security Check
        const { rows: userRows } = await query(
            `SELECT role, hospital_id, functional_roles, managed_hospital_ids FROM employees WHERE id = $1`,
            [session.userId]
        );
        const user = userRows[0];

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const userFuncRoles = user.functional_roles || [];
        const isBPH = Array.isArray(userFuncRoles) ? userFuncRoles.includes('BPH') : false;
        const isSuper = user.role === 'super-admin';
        const canSeeGlobal = isBPH || isSuper;

        let enforcedHospitalId = hospitalId;
        if (!canSeeGlobal) {
            const allowedHospitals = [user.hospital_id, ...(user.managed_hospital_ids || [])]
                .filter(Boolean)
                .map((id: string) => id.toLowerCase());

            if (!enforcedHospitalId || enforcedHospitalId === 'all') {
                enforcedHospitalId = user.hospital_id?.toLowerCase() || 'unknown';
            } else if (!allowedHospitals.includes(enforcedHospitalId)) {
                return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
            }
        }

        if (!month || !year) return NextResponse.json({ error: 'Month and Year are required' }, { status: 400 });

        const monthKey = `${year}-${month.padStart(2, '0')}`;

        // 4. Fetch Targeted Employee IDs based on SQL Filters
        let empSql = `SELECT id, hospital_id, unit, bagian, profession_category, profession FROM employees WHERE is_active = true AND role NOT IN ('admin', 'super-admin')`;
        const empParams: any[] = [];

        if (employeeId && employeeId !== 'undefined' && employeeId !== 'all') {
            empSql += ` AND id = $${empParams.length + 1}`;
            empParams.push(employeeId);
        } else {
            if (unit && unit !== 'all') {
                empSql += ` AND unit = $${empParams.length + 1}`;
                empParams.push(unit);
            }
            if (bagian && bagian !== 'all') {
                empSql += ` AND bagian = $${empParams.length + 1}`;
                empParams.push(bagian);
            }
            if (professionCategory && professionCategory !== 'all') {
                empSql += ` AND profession_category = $${empParams.length + 1}`;
                empParams.push(professionCategory);
            }
            if (profession && profession !== 'all') {
                empSql += ` AND profession = $${empParams.length + 1}`;
                empParams.push(profession);
            }
            if (enforcedHospitalId && enforcedHospitalId !== 'all') {
                // ILIKE match
                empSql += ` AND hospital_id ILIKE $${empParams.length + 1}`;
                empParams.push(`%${enforcedHospitalId}%`);
            }
        }

        const { rows: targetEmployees } = await query(empSql, empParams);
        const employeeIds = targetEmployees.map((e: any) => e.id);

        // Preparation of categories
        const emptyGroupedPerformance: Record<string, any[]> = {};
        DAILY_ACTIVITIES.forEach(act => {
            if (!emptyGroupedPerformance[act.category]) emptyGroupedPerformance[act.category] = [];
            emptyGroupedPerformance[act.category].push({
                name: act.title,
                category: act.category,
                percentage: 0,
                achieved: 0,
                target: 0
            });
        });

        if (employeeIds.length === 0) {
            const defaultPerformance = Object.entries(emptyGroupedPerformance).map(([name]) => ({
                name,
                Persentase: 0
            })).sort((a, b) => a.name.localeCompare(b.name));

            return NextResponse.json({
                performanceByCategory: defaultPerformance,
                groupedPerformanceByActivity: emptyGroupedPerformance,
                employeeCount: 0,
                hospitalComparison: []
            });
        }

        const startOfMonth = `${monthKey}-01`;
        // Calculcate last day of month
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const endOfMonth = `${monthKey}-${String(lastDay).padStart(2, '0')}`;
        const endOfMonthFull = `${endOfMonth}T23:59:59`;

        // 5. Aggregate Data from Multiple Sources via Promise.all + query
        // Using ANY($1) for efficient IN clause queries

        const [
            monthlyReportsRes,
            attendanceRes,
            teamRecordsRes,
            scheduledAttRes,
            tadarusSessionsRes,
            tadarusRequestsRes,
            prayerRequestsRes,
            readingHistoryRes,
            quranHistoryRes
        ] = await Promise.all([
            // 1. Manual Counter Activities (Optimized: Query Normalized Table)
            query(`SELECT employee_id, report_data as month_data FROM employee_monthly_records WHERE employee_id = ANY($1) AND month_key = $2`, [employeeIds, monthKey]),

            // 2. Prayers (Aggregated)
            query(`SELECT employee_id, COUNT(DISTINCT date(timestamp)) as day_count 
                   FROM attendance_records 
                   WHERE employee_id = ANY($1) AND status = 'hadir' AND timestamp >= $2 AND timestamp <= $3
                   GROUP BY employee_id`,
                [employeeIds, startOfMonth, endOfMonthFull]),

            // 3. Team Sessions (Aggregated)
            query(`SELECT user_id, lower(trim(session_type)) as type, COUNT(DISTINCT session_date) as day_count 
                   FROM team_attendance_records 
                   WHERE user_id = ANY($1) AND session_date >= $2 AND session_date <= $3
                   GROUP BY user_id, lower(trim(session_type))`,
                [employeeIds, startOfMonth, endOfMonth]),

            // 4. Scheduled Activities (Aggregated)
            query(`SELECT aa.employee_id, lower(trim(a.activity_type)) as type, COUNT(DISTINCT a.date) as day_count 
                   FROM activity_attendance aa 
                   JOIN activities a ON aa.activity_id = a.id 
                   WHERE aa.employee_id = ANY($1) AND aa.status = 'hadir' AND a.date >= $2 AND a.date <= $3
                   GROUP BY aa.employee_id, lower(trim(a.activity_type))`,
                [employeeIds, startOfMonth, endOfMonth]),

            // 5. Tadarus Sessions (Aggregated with Unnest)
            query(`SELECT unnest(present_mentee_ids) as mentee_id, COUNT(DISTINCT date) as day_count 
                   FROM tadarus_sessions 
                   WHERE date >= $1 AND date <= $2
                   GROUP BY mentee_id`,
                [startOfMonth, endOfMonth]),

            // 6. Approved Tadarus Requests (Aggregated)
            query(`SELECT mentee_id, COUNT(DISTINCT date) as day_count 
                   FROM tadarus_requests 
                   WHERE mentee_id = ANY($1) AND status = 'approved' AND date >= $2 AND date <= $3
                   GROUP BY mentee_id`,
                [employeeIds, startOfMonth, endOfMonth]),

            // 7. Approved Prayer Requests (Aggregated)
            query(`SELECT mentee_id, COUNT(DISTINCT date) as day_count 
                   FROM missed_prayer_requests 
                   WHERE mentee_id = ANY($1) AND status = 'approved' AND date >= $2 AND date <= $3
                   GROUP BY mentee_id`,
                [employeeIds, startOfMonth, endOfMonth]),

            // 8. Reading History Books (Aggregated)
            query(`SELECT employee_id, COUNT(DISTINCT date_completed) as day_count 
                   FROM employee_reading_history 
                   WHERE employee_id = ANY($1) AND date_completed >= $2 AND date_completed <= $3
                   GROUP BY employee_id`,
                [employeeIds, startOfMonth, endOfMonth]),

            // 9. Reading History Quran (Aggregated)
            query(`SELECT employee_id, COUNT(DISTINCT date) as day_count 
                   FROM employee_quran_reading_history 
                   WHERE employee_id = ANY($1) AND date >= $2 AND date <= $3
                   GROUP BY employee_id`,
                [employeeIds, startOfMonth, endOfMonth])
        ]);

        // 6. Processing Engine (Optimized for Aggregated Data)
        // Store counts directly instead of Sets of dates to save massive memory
        const userActivityDayCounts: Record<string, Record<string, number>> = {};
        const userActivityCounts: Record<string, Record<string, number>> = {};

        DAILY_ACTIVITIES.forEach(act => {
            userActivityDayCounts[act.id] = {};
            userActivityCounts[act.id] = {};
        });

        const addDayCount = (userId: string, actId: string, count: number) => {
            if (!userActivityDayCounts[actId]) return;
            if (!userActivityDayCounts[actId][userId]) userActivityDayCounts[actId][userId] = 0;
            userActivityDayCounts[actId][userId] += Number(count) || 0;
        };

        const trackCount = (userId: string, actId: string, count: number) => {
            if (!userActivityCounts[actId]) return;
            if (!userActivityCounts[actId][userId]) userActivityCounts[actId][userId] = 0;
            userActivityCounts[actId][userId] += Number(count) || 0;
        };

        // 6a. Process Manual Reports 
        monthlyReportsRes.rows.forEach((row: any) => {
            const monthData = row.month_data || {};
            Object.entries(monthData).forEach(([actId, data]: [string, any]) => {
                if (userActivityCounts.hasOwnProperty(actId)) {
                    trackCount(row.employee_id, actId, data.count || 0);
                }
            });
        });

        // 6b. Process Attendance Records 
        attendanceRes.rows.forEach((row: any) => {
            addDayCount(row.employee_id, 'shalat_berjamaah', row.day_count);
        });

        // 6c. Process Team Attendance 
        teamRecordsRes.rows.forEach((row: any) => {
            const type = row.type; // already lower/trimmed in SQL
            if (type === 'kie') addDayCount(row.user_id, 'tepat_waktu_kie', row.day_count);
            else if (type === 'doa bersama') addDayCount(row.user_id, 'doa_bersama', row.day_count);
            else if (type === 'tadarus' || type === 'bbq' || type === 'umum') addDayCount(row.user_id, 'tadarus', row.day_count);
            else if (type === 'kajian selasa') addDayCount(row.user_id, 'kajian_selasa', row.day_count);
        });

        // 6d. Process Scheduled Activities
        scheduledAttRes.rows.forEach((row: any) => {
            const type = row.type; // already lower/trimmed in SQL
            if (type === 'kajian selasa') addDayCount(row.employee_id, 'kajian_selasa', row.day_count);
            else if (type === 'persyarikatan' || type === 'pengajian persyarikatan') addDayCount(row.employee_id, 'persyarikatan', row.day_count);
            else if (type === 'kie') addDayCount(row.employee_id, 'tepat_waktu_kie', row.day_count);
            else if (type === 'doa bersama') addDayCount(row.employee_id, 'doa_bersama', row.day_count);
            else if (type === 'tadarus' || type === 'bbq' || type === 'umum') addDayCount(row.employee_id, 'tadarus', row.day_count);
        });

        // 6e. Process Tadarus Sessions
        tadarusSessionsRes.rows.forEach((row: any) => {
            // Only track if user is in our target group
            if (employeeIds.includes(row.mentee_id)) {
                addDayCount(row.mentee_id, 'tadarus', row.day_count);
            }
        });

        // 6f. Manual Requests
        tadarusRequestsRes.rows.forEach((row: any) => addDayCount(row.mentee_id, 'tadarus', row.day_count));
        prayerRequestsRes.rows.forEach((row: any) => addDayCount(row.mentee_id, 'shalat_berjamaah', row.day_count));

        // 6g. Reading Histories
        readingHistoryRes.rows.forEach((row: any) => addDayCount(row.employee_id, 'baca_alquran_buku', row.day_count));
        quranHistoryRes.rows.forEach((row: any) => addDayCount(row.employee_id, 'baca_alquran_buku', row.day_count));

        // 7. Calculate Aggregated Percentages
        const performanceByActivity = DAILY_ACTIVITIES.map(act => {
            let totalAchieved = 0;

            if (userActivityCounts[act.id]) {
                Object.values(userActivityCounts[act.id]).forEach(count => {
                    totalAchieved += count;
                });
            }

            if (userActivityDayCounts[act.id]) {
                Object.values(userActivityDayCounts[act.id]).forEach(daysCount => {
                    totalAchieved += Math.min(act.monthlyTarget, daysCount);
                });
            }

            const totalTarget = employeeIds.length * act.monthlyTarget;
            const percentage = totalTarget > 0 ? Math.min(100, Math.round((totalAchieved / totalTarget) * 100)) : 0;

            return {
                name: act.title,
                category: act.category,
                percentage,
                achieved: totalAchieved, // For debugging
                target: totalTarget
            };
        });

        // 8. Group by Category
        const categoryTotals: Record<string, { totalPercentage: number; count: number }> = {};
        performanceByActivity.forEach(item => {
            const categoryName = item.category || 'Lainnya';
            if (!categoryTotals[categoryName]) categoryTotals[categoryName] = { totalPercentage: 0, count: 0 };
            categoryTotals[categoryName].totalPercentage += item.percentage;
            categoryTotals[categoryName].count++;
        });

        const performanceByCategory = Object.entries(categoryTotals)
            .map(([name, stats]) => ({
                name,
                Persentase: stats.count > 0 ? Math.round(stats.totalPercentage / stats.count) : 0,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        const groupedPerformanceByActivity = performanceByActivity.reduce((acc, item) => {
            const categoryName = item.category || 'Lainnya';
            if (!acc[categoryName]) acc[categoryName] = [];
            acc[categoryName].push(item);
            return acc;
        }, {} as Record<string, any[]>);

        // --- NEW: Hospital/Unit Breakdown for Comparison ---
        let hospitalComparison: any[] = [];
        const isAllMode = !enforcedHospitalId || enforcedHospitalId === 'all';

        if (isAllMode) {
            const { rows: hospitals } = await query(`SELECT id, brand, name FROM hospitals`);
            const hospitalMap: Record<string, any> = {};

            (hospitals || []).forEach((h: any) => {
                const lowerId = h.id.toLowerCase();
                hospitalMap[lowerId] = {
                    id: h.id,
                    brand: h.brand,
                    categories: {
                        'SIDIQ': { total: 0, count: 0 },
                        'TABLIGH': { total: 0, count: 0 },
                        'AMANAH': { total: 0, count: 0 },
                        'FATONAH': { total: 0, count: 0 }
                    }
                };
            });

            const employeesByHospital: Record<string, string[]> = {};
            targetEmployees.forEach((emp: any) => {
                const hid = emp.hospital_id?.toLowerCase().trim();
                // Find best matching hospital key logic (e.g. substring or exact)
                // Assuming exact or mapped match for now
                if (hid && hospitalMap[hid]) {
                    if (!employeesByHospital[hid]) employeesByHospital[hid] = [];
                    employeesByHospital[hid].push(emp.id);
                }
            });

            Object.entries(employeesByHospital).forEach(([hid, empIds]) => {
                DAILY_ACTIVITIES.forEach(act => {
                    let achievedForHospital = 0;
                    if (userActivityCounts[act.id]) {
                        empIds.forEach(eid => { if (userActivityCounts[act.id][eid]) achievedForHospital += userActivityCounts[act.id][eid]; });
                    }
                    if (userActivityDayCounts[act.id]) {
                        empIds.forEach(eid => { if (userActivityDayCounts[act.id][eid]) achievedForHospital += Math.min(act.monthlyTarget, userActivityDayCounts[act.id][eid]); });
                    }
                    const totalTarget = empIds.length * act.monthlyTarget;
                    const activityPercentage = totalTarget > 0 ? Math.min(100, Math.round((achievedForHospital / totalTarget) * 100)) : 0;

                    const shortCat = Object.keys(hospitalMap[hid].categories).find(c => act.category.startsWith(c));
                    if (shortCat) {
                        hospitalMap[hid].categories[shortCat].total += activityPercentage;
                        hospitalMap[hid].categories[shortCat].count++;
                    }
                });
            });

            hospitalComparison = (hospitals || []).map((h: any) => {
                const lowerId = h.id.toLowerCase();
                const hData = hospitalMap[lowerId];
                const result: any = { id: h.id, brand: h.brand };
                ['SIDIQ', 'TABLIGH', 'AMANAH', 'FATONAH'].forEach(cat => {
                    const stats = hData.categories[cat];
                    result[cat] = stats && stats.count > 0 ? Math.round(stats.total / stats.count) : 0;
                });
                return result;
            }).sort((a: any, b: any) => a.brand.localeCompare(b.brand));

        } else {
            // Aggregate by UNIT
            const uniqueUnits = new Set(targetEmployees.map((e: any) => e.unit || 'Tanpa Unit'));
            const units = Array.from(uniqueUnits).sort() as string[];

            const unitMap: Record<string, any> = {};
            units.forEach(u => {
                unitMap[u] = {
                    id: u, brand: u,
                    categories: {
                        'SIDIQ': { total: 0, count: 0 },
                        'TABLIGH': { total: 0, count: 0 },
                        'AMANAH': { total: 0, count: 0 },
                        'FATONAH': { total: 0, count: 0 }
                    }
                };
            });

            const employeesByUnit: Record<string, string[]> = {};
            targetEmployees.forEach((emp: any) => {
                const u = emp.unit || 'Tanpa Unit';
                if (!employeesByUnit[u]) employeesByUnit[u] = [];
                employeesByUnit[u].push(emp.id);
            });

            Object.entries(employeesByUnit).forEach(([unit, empIds]) => {
                DAILY_ACTIVITIES.forEach(act => {
                    let achievedForUnit = 0;
                    if (userActivityCounts[act.id]) {
                        empIds.forEach(eid => { if (userActivityCounts[act.id][eid]) achievedForUnit += userActivityCounts[act.id][eid]; });
                    }
                    if (userActivityDayCounts[act.id]) {
                        empIds.forEach(eid => { if (userActivityDayCounts[act.id][eid]) achievedForUnit += Math.min(act.monthlyTarget, userActivityDayCounts[act.id][eid]); });
                    }
                    const totalTarget = empIds.length * act.monthlyTarget;
                    const activityPercentage = totalTarget > 0 ? Math.min(100, Math.round((achievedForUnit / totalTarget) * 100)) : 0;

                    const shortCat = Object.keys(unitMap[unit].categories).find(c => act.category.startsWith(c));
                    if (shortCat) {
                        unitMap[unit].categories[shortCat].total += activityPercentage;
                        unitMap[unit].categories[shortCat].count++;
                    }
                });
            });

            hospitalComparison = units.map(u => {
                const result: any = { id: u, brand: u };
                ['SIDIQ', 'TABLIGH', 'AMANAH', 'FATONAH'].forEach(cat => {
                    const stats = unitMap[u].categories[cat];
                    result[cat] = stats && stats.count > 0 ? Math.round(stats.total / stats.count) : 0;
                });
                return result;
            });
        }

        return NextResponse.json({
            performanceByCategory,
            groupedPerformanceByActivity,
            employeeCount: employeeIds.length,
            hospitalComparison
        });

    } catch (error: any) {
        console.error('❌ [API] Performance Analytics Error:', error.message);
        return NextResponse.json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}

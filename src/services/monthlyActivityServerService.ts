import { query } from '@/lib/db';
import type { MonthlyActivityProgress } from '@/types';

/**
 * Server-side service to aggregate monthly activities from multiple sources.
 * This logic matches the aggregation in /api/monthly-activities route.
 * MIGRATED to use local PostgreSQL connection.
 */
export async function getAggregatedMonthlyActivities(employeeId: string): Promise<Record<string, MonthlyActivityProgress>> {
    const mergedActivities: Record<string, MonthlyActivityProgress> = {};

    try {
        // 1. Shalat Berjamaah
        const { rows: attendanceData } = await query(
            `SELECT timestamp FROM attendance_records WHERE employee_id = $1 AND status = 'hadir'`,
            [employeeId]
        );

        if (attendanceData && attendanceData.length > 0) {
            attendanceData.forEach((record: any) => {
                const date = new Date(record.timestamp);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const dayOfMonth = date.getDate();
                const dayKey = String(dayOfMonth).padStart(2, '0');
                const monthKey = `${year}-${month}`;

                if (!mergedActivities[monthKey]) mergedActivities[monthKey] = {};
                if (!mergedActivities[monthKey][dayKey]) mergedActivities[monthKey][dayKey] = {};
                mergedActivities[monthKey][dayKey]['shalat_berjamaah'] = true;
            });
        }

        // 2. Monthly Reports (Manual counters) - FROM NORMALIZED TABLE
        const { rows: monthlyRecords } = await query(
            `SELECT month_key, report_data FROM employee_monthly_records WHERE employee_id = $1`,
            [employeeId]
        );



        if (monthlyRecords && monthlyRecords.length > 0) {
            monthlyRecords.forEach((record: any) => {
                const monthKey = record.month_key;
                const monthData = record.report_data;

                if (!monthKey || !monthData) return;

                if (!mergedActivities[monthKey]) mergedActivities[monthKey] = {};

                Object.entries(monthData).forEach(([activityId, activityData]: [string, any]) => {
                    // Process entries
                    if (activityData.entries && Array.isArray(activityData.entries)) {
                        activityData.entries.forEach((entry: any) => {
                            const dayKey = entry.date.substring(8, 10);
                            if (!mergedActivities[monthKey][dayKey]) mergedActivities[monthKey][dayKey] = {};
                            mergedActivities[monthKey][dayKey][activityId] = true;
                        });
                    }
                    // Process bookEntries
                    if (activityData.bookEntries && Array.isArray(activityData.bookEntries)) {
                        activityData.bookEntries.forEach((entry: any) => {
                            const dayKey = entry.dateCompleted.substring(8, 10);
                            if (!mergedActivities[monthKey][dayKey]) mergedActivities[monthKey][dayKey] = {};
                            mergedActivities[monthKey][dayKey][activityId] = true;
                        });
                    }
                    // Process completedAt 
                    if (!activityData.entries && !activityData.bookEntries && activityData.completedAt) {
                        const completedDate = new Date(activityData.completedAt);
                        const dayKey = String(completedDate.getDate()).padStart(2, '0');
                        const completedMonthKey = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`;
                        if (completedMonthKey === monthKey) {
                            if (!mergedActivities[monthKey][dayKey]) mergedActivities[monthKey][dayKey] = {};
                            mergedActivities[monthKey][dayKey][activityId] = true;
                        }
                    }
                });
            });
        }

        // 3. Tadarus Sessions
        // Postgres: $1 = ANY(present_mentee_ids) to replace .contains
        const { rows: tadarusSessions } = await query(
            `SELECT date FROM tadarus_sessions WHERE $1 = ANY(present_mentee_ids)`,
            [employeeId]
        );

        if (tadarusSessions && tadarusSessions.length > 0) {
            tadarusSessions.forEach((session: any) => {
                const date = session.date; // Note: pg returns date as string 'YYYY-MM-DD' usually for DATE type, or Date obj
                const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
                const monthKey = dateStr.substring(0, 7);
                const dayKey = dateStr.substring(8, 10);

                if (!mergedActivities[monthKey]) mergedActivities[monthKey] = {};
                if (!mergedActivities[monthKey][dayKey]) mergedActivities[monthKey][dayKey] = {};
                mergedActivities[monthKey][dayKey]['tadarus'] = true;
            });
        }

        // 4. Team Attendance Records (KIE & Doa Bersama)
        const { rows: attendanceRecords } = await query(
            `SELECT session_type, session_date FROM team_attendance_records WHERE user_id = $1`,
            [employeeId]
        );

        if (attendanceRecords && attendanceRecords.length > 0) {
            attendanceRecords.forEach((record: any) => {
                const date = record.session_date;
                const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
                const monthKey = dateStr.substring(0, 7);
                const dayKey = dateStr.substring(8, 10);
                const sessionType = record.session_type;

                if (!mergedActivities[monthKey]) mergedActivities[monthKey] = {};
                if (!mergedActivities[monthKey][dayKey]) mergedActivities[monthKey][dayKey] = {};

                const typeLower = sessionType?.toLowerCase().trim();

                if (typeLower === 'kie') mergedActivities[monthKey][dayKey]['tepat_waktu_kie'] = true;
                else if (typeLower === 'doa bersama') mergedActivities[monthKey][dayKey]['doa_bersama'] = true;
                else if (typeLower === 'kajian selasa') mergedActivities[monthKey][dayKey]['kajian_selasa'] = true;
                else if (typeLower === 'pengajian persyarikatan' || typeLower === 'persyarikatan') {
                    mergedActivities[monthKey][dayKey]['persyarikatan'] = true;
                } else if (typeLower === 'membaca al-quran dan buku' || typeLower === 'baca alquran buku') {
                    mergedActivities[monthKey][dayKey]['baca_alquran_buku'] = true;
                }
            });
        }

        // 5. Activity Attendance (Scheduled Activities via Join) - Consistency with API Route
        const { rows: scheduledAttData } = await query(
            `SELECT aa.status, a.date, a.activity_type
             FROM activity_attendance aa
             INNER JOIN activities a ON aa.activity_id = a.id
             WHERE aa.employee_id = $1 AND aa.status = 'hadir'`,
            [employeeId]
        );

        if (scheduledAttData && scheduledAttData.length > 0) {
            scheduledAttData.forEach((record: any) => {
                const date = record.date;
                const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
                const monthKey = dateStr.substring(0, 7);
                const dayKey = dateStr.substring(8, 10);
                const activityType = record.activity_type;
                const typeLower = activityType?.toLowerCase().trim();

                if (!mergedActivities[monthKey]) mergedActivities[monthKey] = {};
                if (!mergedActivities[monthKey][dayKey]) mergedActivities[monthKey][dayKey] = {};

                // Use same mapping as API route for consistency
                if (typeLower === 'kajian selasa') {
                    mergedActivities[monthKey][dayKey]['kajian_selasa'] = true;
                } else if (typeLower === 'pengajian persyarikatan' || typeLower === 'persyarikatan') {
                    mergedActivities[monthKey][dayKey]['persyarikatan'] = true;
                } else if (typeLower === 'kie') {
                    mergedActivities[monthKey][dayKey]['tepat_waktu_kie'] = true;
                } else if (typeLower === 'doa bersama') {
                    mergedActivities[monthKey][dayKey]['doa_bersama'] = true;
                } else if (typeLower === 'bbq' || typeLower === 'umum' || typeLower === 'tadarus') {
                    mergedActivities[monthKey][dayKey]['tadarus'] = true;
                } else if (typeLower === 'membaca al-quran dan buku' || typeLower === 'baca alquran buku') {
                    mergedActivities[monthKey][dayKey]['baca_alquran_buku'] = true;
                }
            });
        }

    } catch (error) {
        console.error('Error aggregating monthly activities:', error);
    }

    return mergedActivities;
}

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * API Route: /api/monthly-activities
 * Purpose: Handle monthly activities GET operations
 *
 * MIGRATION NOTE:
 * This route has been migrated to use direct PostgreSQL connection (pg)
 * instead of Database Client. It connects to the local database defined in DATABASE_URL.
 */

// Get monthly activities for an employee
export async function GET(request: NextRequest) {
  try {
    // Verify custom JWT authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // Filter logic for date ranges
    let startDate: string | null = null;
    let endDate: string | null = null;
    if (month && year) {
      startDate = `${year}-${month.padStart(2, '0')}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      endDate = `${year}-${month.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }

    // Verify authorization: Admins and owners are always allowed
    if (session.role !== 'admin' && session.role !== 'super-admin' && session.userId !== employeeId) {
      // Check if the requester is the mentor/supervisor/manager/kaunit of the target employee
      try {
        const { rows } = await query(
          'SELECT mentor_id, supervisor_id, manager_id, ka_unit_id, dirut_id FROM employees WHERE id = $1',
          [employeeId]
        );
        const targetEmployee = rows[0];

        if (!targetEmployee) {
          return NextResponse.json({ error: 'Target employee not found' }, { status: 404 });
        }

        const isAuthorizedRelation =
          targetEmployee.mentor_id === session.userId ||
          targetEmployee.supervisor_id === session.userId ||
          targetEmployee.manager_id === session.userId ||
          targetEmployee.ka_unit_id === session.userId ||
          targetEmployee.dirut_id === session.userId;

        if (!isAuthorizedRelation) {
          return NextResponse.json({ error: 'Forbidden: You do not have permission to view this data' }, { status: 403 });
        }
      } catch (err) {
        console.error('Authorization check failed:', err);
        return NextResponse.json({ error: 'Internal server error during auth check' }, { status: 500 });
      }
    }

    // Start with empty object - Merge data from all sources
    const mergedActivities: Record<string, any> = {};

    // 1. Merge data from attendance_records table (shalat berjamaah)
    try {
      let sql = `SELECT timestamp FROM attendance_records WHERE employee_id = $1 AND status = 'hadir'`;
      const params: any[] = [employeeId];

      if (startDate && endDate) {
        sql += ` AND timestamp >= $2 AND timestamp <= $3`;
        params.push(startDate, endDate + 'T23:59:59');
      }

      const { rows: attendanceData } = await query(sql, params);

      if (attendanceData && attendanceData.length > 0) {
        attendanceData.forEach((record: any) => {
          const date = new Date(record.timestamp);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const dayOfMonth = date.getDate();
          const dayKey = String(dayOfMonth).padStart(2, '0');
          const monthKey = `${year}-${month}`;

          if (!mergedActivities[monthKey]) {
            mergedActivities[monthKey] = {};
          }

          if (!mergedActivities[monthKey][dayKey]) {
            mergedActivities[monthKey][dayKey] = {};
          }

          mergedActivities[monthKey][dayKey]['shalat_berjamaah'] = true;
        });

        // Merged attendance records
      }
    } catch (error) {
      console.error('❌ [API-Local] Error fetching attendance records:', error);
    }

    // 2. Merge data from employee_monthly_records table (Normalized)
    try {
      // Fetch all monthly records for the employee
      // If startDate and endDate are provided, we could optimize to fetch only relevant months
      // But for now, fetching all is safer and not too heavy (max 12-24 rows per year)

      let sql = 'SELECT month_key, report_data FROM employee_monthly_records WHERE employee_id = $1';
      const params: any[] = [employeeId];

      if (startDate && endDate) {
        // rudimentary optimization: filter by month key range string comparison (works for YYYY-MM)
        const startMonth = startDate.substring(0, 7);
        const endMonth = endDate.substring(0, 7);
        sql += ' AND month_key >= $2 AND month_key <= $3';
        params.push(startMonth, endMonth);
      }

      const { rows: monthlyRecords } = await query(sql, params);

      if (monthlyRecords && monthlyRecords.length > 0) {
        // Construct a composite reports object from multiple rows
        const compositeReports: Record<string, any> = {};

        monthlyRecords.forEach((row: any) => {
          if (row.month_key && row.report_data) {
            compositeReports[row.month_key] = row.report_data;
          }
        });

        // Helper function to convert reports to activities format (unchanged logic)
        const convertReportsToActivities = (reports: any): Record<string, any> => {
          const result: Record<string, any> = {};

          Object.entries(reports).forEach(([monthKey, monthData]: [string, any]) => {
            if (!result[monthKey]) {
              result[monthKey] = {};
            }

            Object.entries(monthData).forEach(([activityId, activityData]: [string, any]) => {
              // Process entries (manual reports per date)
              if (activityData.entries && Array.isArray(activityData.entries)) {
                activityData.entries.forEach((entry: any) => {
                  const dayKey = entry.date.substring(8, 10);

                  if (!result[monthKey][dayKey]) {
                    result[monthKey][dayKey] = {};
                  }

                  result[monthKey][dayKey][activityId] = true;
                });
              }

              // Process bookEntries (reading reports)
              if (activityData.bookEntries && Array.isArray(activityData.bookEntries)) {
                activityData.bookEntries.forEach((entry: any) => {
                  const dayKey = entry.dateCompleted.substring(8, 10);

                  if (!result[monthKey][dayKey]) {
                    result[monthKey][dayKey] = {};
                  }

                  result[monthKey][dayKey][activityId] = true;
                });
              }

              // Handle activities with only completedAt
              if (!activityData.entries && !activityData.bookEntries && activityData.completedAt) {
                const completedDate = new Date(activityData.completedAt);
                const dayKey = String(completedDate.getDate()).padStart(2, '0');
                const completedMonthKey = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`;

                if (completedMonthKey === monthKey) {
                  if (!result[monthKey][dayKey]) {
                    result[monthKey][dayKey] = {};
                  }

                  result[monthKey][dayKey][activityId] = true;
                }
              }
            });
          });

          return result;
        };

        const monthlyReportsActivities = convertReportsToActivities(compositeReports);

        // Merge into result
        Object.entries(monthlyReportsActivities).forEach(([monthKey, monthData]) => {
          if (!mergedActivities[monthKey]) {
            mergedActivities[monthKey] = {};
          }

          Object.entries(monthData).forEach(([dayKey, dayData]) => {
            if (!mergedActivities[monthKey][dayKey]) {
              mergedActivities[monthKey][dayKey] = {};
            }

            Object.assign(mergedActivities[monthKey][dayKey], dayData);
          });
        });

        // Merged monthly records data
      }
    } catch (error) {
      console.error('❌ [API-Local] Error fetching monthly records:', error);
    }

    // 3. Merge data from tadarus_sessions table
    try {
      // Database check: .contains('present_mentee_ids', [employeeId])
      // Postgres: $1 = ANY(present_mentee_ids)
      let sql = `SELECT date FROM tadarus_sessions WHERE $1 = ANY(present_mentee_ids)`;
      const params: any[] = [employeeId];

      if (startDate && endDate) {
        sql += ` AND date >= $2 AND date <= $3`;
        params.push(startDate, endDate);
      }

      const { rows: tadarusSessions } = await query(sql, params);

      if (tadarusSessions && tadarusSessions.length > 0) {
        tadarusSessions.forEach((session: any) => {
          const date = session.date; // YYYY-MM-DD
          // If date is a Date object (pg might parse it), convert to string
          const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;

          const monthKey = dateStr.substring(0, 7); // YYYY-MM
          const dayKey = dateStr.substring(8, 10); // DD

          if (!mergedActivities[monthKey]) {
            mergedActivities[monthKey] = {};
          }

          if (!mergedActivities[monthKey][dayKey]) {
            mergedActivities[monthKey][dayKey] = {};
          }

          mergedActivities[monthKey][dayKey]['tadarus'] = true;
        });

        // Merged tadarus sessions data
      }
    } catch (error) {
      console.error('❌ [API-Local] Error fetching tadarus sessions:', error);
    }

    // 4. Merge data from team_attendance_records table
    try {
      let sql = `SELECT session_type, session_date FROM team_attendance_records WHERE user_id = $1`;
      const params: any[] = [employeeId];

      if (startDate && endDate) {
        sql += ` AND session_date >= $2 AND session_date <= $3`;
        params.push(startDate, endDate);
      }

      const { rows: attendanceRecords } = await query(sql, params);

      if (attendanceRecords && attendanceRecords.length > 0) {
        attendanceRecords.forEach((record: any) => {
          const date = record.session_date;
          const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;

          const monthKey = dateStr.substring(0, 7);
          const dayKey = dateStr.substring(8, 10);
          const sessionType = record.session_type;

          if (!mergedActivities[monthKey]) {
            mergedActivities[monthKey] = {};
          }

          if (!mergedActivities[monthKey][dayKey]) {
            mergedActivities[monthKey][dayKey] = {};
          }

          // Map session type to activity ID
          const typeLower = sessionType?.toLowerCase().trim();
          if (typeLower === 'kie') {
            mergedActivities[monthKey][dayKey]['tepat_waktu_kie'] = true;
          } else if (typeLower === 'doa bersama') {
            mergedActivities[monthKey][dayKey]['doa_bersama'] = true;
          } else if (typeLower === 'bbq' || typeLower === 'umum' || typeLower === 'tadarus') {
            mergedActivities[monthKey][dayKey]['tadarus'] = true;
          } else if (typeLower === 'kajian selasa') {
            mergedActivities[monthKey][dayKey]['kajian_selasa'] = true;
          } else if (typeLower === 'pengajian persyarikatan' || typeLower === 'persyarikatan') {
            mergedActivities[monthKey][dayKey]['persyarikatan'] = true;
          } else if (typeLower === 'membaca al-quran dan buku' || typeLower === 'baca alquran buku') {
            mergedActivities[monthKey][dayKey]['baca_alquran_buku'] = true;
          }
        });

        // Merged team attendance data
      }
    } catch (error) {
      console.error('❌ [API-Local] Error fetching team attendance records:', error);
    }

    // 5. Merge data from activity_attendance table (Scheduled Activities via Join)
    try {
      // Need explicit JOIN to filter by activity date
      let sql = `
        SELECT aa.status, a.date, a.activity_type
        FROM activity_attendance aa
        INNER JOIN activities a ON aa.activity_id = a.id
        WHERE aa.employee_id = $1 AND aa.status = 'hadir'
      `;
      const params: any[] = [employeeId];

      if (startDate && endDate) {
        sql += ` AND a.date >= $2 AND a.date <= $3`;
        params.push(startDate, endDate);
      }

      const { rows: scheduledAttData } = await query(sql, params);

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
        // Merged scheduled activity records
      }
    } catch (error) {
      console.error('❌ [API-Local] Error fetching activity_attendance:', error);
    }

    // 6. Merge APPROVED tadarus_requests
    try {
      let sql = `SELECT date FROM tadarus_requests WHERE mentee_id = $1 AND status = 'approved'`;
      const params: any[] = [employeeId];

      if (startDate && endDate) {
        sql += ` AND date >= $2 AND date <= $3`;
        params.push(startDate, endDate);
      }

      const { rows: approvedTadarus } = await query(sql, params);

      if (approvedTadarus && approvedTadarus.length > 0) {
        approvedTadarus.forEach((req: any) => {
          const date = req.date;
          const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;

          const monthKey = dateStr.substring(0, 7);
          const dayKey = dateStr.substring(8, 10);

          if (!mergedActivities[monthKey]) mergedActivities[monthKey] = {};
          if (!mergedActivities[monthKey][dayKey]) mergedActivities[monthKey][dayKey] = {};

          mergedActivities[monthKey][dayKey]['tadarus'] = true;
        });
        // Merged approved tadarus requests
      }
    } catch (error) {
      console.error('❌ [API-Local] Error fetching tadarus requests:', error);
    }

    // 7. Merge APPROVED missed_prayer_requests
    try {
      let sql = `SELECT date, prayer_id FROM missed_prayer_requests WHERE mentee_id = $1 AND status = 'approved'`;
      const params: any[] = [employeeId];

      if (startDate && endDate) {
        sql += ` AND date >= $2 AND date <= $3`;
        params.push(startDate, endDate);
      }

      const { rows: approvedPrayers } = await query(sql, params);

      if (approvedPrayers && approvedPrayers.length > 0) {
        approvedPrayers.forEach((req: any) => {
          const date = req.date;
          const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;

          const monthKey = dateStr.substring(0, 7);
          const dayKey = dateStr.substring(8, 10);

          // Map database IDs to Mutabaah activity IDs
          const activityId = `${req.prayer_id}-default`;

          if (!mergedActivities[monthKey]) mergedActivities[monthKey] = {};
          if (!mergedActivities[monthKey][dayKey]) mergedActivities[monthKey][dayKey] = {};

          mergedActivities[monthKey][dayKey][activityId] = true;
        });
        // Merged approved prayer requests
      }
    } catch (error) {
      console.error('❌ [API-Local] Error fetching prayer requests:', error);
    }

    // 8. Merge data from employee_quran_reading_history table
    try {
      let sql = `SELECT date FROM employee_quran_reading_history WHERE employee_id = $1`;
      const params: any[] = [employeeId];

      if (startDate && endDate) {
        sql += ` AND date >= $2 AND date <= $3`;
        params.push(startDate, endDate);
      }

      const { rows: quranHistory } = await query(sql, params);

      if (quranHistory && quranHistory.length > 0) {
        quranHistory.forEach((record: any) => {
          const date = record.date;
          const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;

          const monthKey = dateStr.substring(0, 7);
          const dayKey = dateStr.substring(8, 10);

          if (!mergedActivities[monthKey]) mergedActivities[monthKey] = {};
          if (!mergedActivities[monthKey][dayKey]) mergedActivities[monthKey][dayKey] = {};

          mergedActivities[monthKey][dayKey]['baca_alquran_buku'] = true;
        });
        // Merged quran history data
      }
    } catch (error) {
      console.error('❌ [API-Local] Error fetching quran history:', error);
    }

    return NextResponse.json({ activities: mergedActivities });
  } catch (error) {
    console.error('GET /api/monthly-activities error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

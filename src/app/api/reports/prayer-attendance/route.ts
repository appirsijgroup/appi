import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * GET /api/reports/prayer-attendance
 * Fetch prayer attendance data for reports
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        let sql = `
            SELECT 
                r.employee_id, 
                e.name as employee_name, 
                e.unit, 
                e.profession_category, 
                e.profession, 
                r.timestamp::date as date, 
                r.entity_id, 
                r.status,
                e.activated_months
            FROM attendance_records r
            JOIN employees e ON r.employee_id = e.id
            WHERE r.entity_id IN ('subuh', 'dzuhur', 'ashar', 'maghrib', 'isya', 'jumat')
            AND r.status = 'hadir'
        `;

        const params = [];
        if (startDate) {
            params.push(startDate);
            sql += ` AND r.timestamp::date >= $${params.length}`;
        }
        if (endDate) {
            params.push(endDate);
            sql += ` AND r.timestamp::date <= $${params.length}`;
        }

        sql += ` ORDER BY r.timestamp DESC`;

        const result = await query(sql, params);

        const data = result.rows.map(row => {
            const recordDate = new Date(row.date).toISOString().split('T')[0];
            const monthKey = recordDate.slice(0, 7);
            const isMonthActivated = row.activated_months?.includes(monthKey) ?? false;

            return {
                employee_id: row.employee_id,
                employee_name: row.employee_name,
                unit: row.unit,
                profession_category: row.profession_category,
                profession: row.profession,
                date: recordDate,
                entity_id: row.entity_id,
                status: row.status === 'hadir' ? 'Hadir' : 'Tidak Hadir'
            };
        });

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Prayer Attendance Report API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * API Route: /api/manual-requests/tadarus
 * Purpose: Handle tadarus requests (GET, POST, PATCH)
 * MIGRATED to use local PostgreSQL connection.
 */

export async function GET(request: NextRequest) {
    try {
        let session;
        try {
            session = await getSession();
        } catch (e: any) {
            console.error('❌ [API Tadarus GET] getSession failed:', e);
            return NextResponse.json({ error: 'Auth Check Failed', details: e.message }, { status: 401 });
        }

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const menteeId = searchParams.get('menteeId');
        const menteeIds = searchParams.get('menteeIds')?.split(',');
        const mentorId = searchParams.get('mentorId');

        let sql = `SELECT * FROM tadarus_requests`;
        const params: any[] = [];
        const conditions: string[] = [];

        if (menteeIds && menteeIds.length > 0) {
            conditions.push(`mentee_id = ANY($${params.length + 1})`);
            params.push(menteeIds);
        } else if (menteeId) {
            conditions.push(`mentee_id = $${params.length + 1}`);
            params.push(menteeId);
        } else if (mentorId) {
            conditions.push(`mentor_id = $${params.length + 1}`);
            params.push(mentorId);
        }

        if (conditions.length > 0) {
            sql += ` WHERE ${conditions.join(' AND ')}`;
        }

        sql += ` ORDER BY requested_at DESC`;

        const { rows } = await query(sql, params);

        return NextResponse.json({ success: true, data: rows || [] });

    } catch (error: any) {
        console.error('❌ [API Tadarus Requests GET] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Dynamic Insert
        const keys = Object.keys(body);
        const values = Object.values(body);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const columns = keys.join(', ');

        const sql = `
            INSERT INTO tadarus_requests (${columns})
            VALUES (${placeholders})
            RETURNING *
        `;

        const { rows } = await query(sql, values);
        const data = rows[0];

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('❌ [API Tadarus Requests POST] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, ...updates } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
        }

        // Dynamic Update
        const keys = Object.keys(updates);
        const values = Object.values(updates);
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        values.push(id); // Add ID for WHERE clause

        const sql = `
            UPDATE tadarus_requests
            SET ${setClause}
            WHERE id = $${values.length}
            RETURNING *
        `;

        const { rows } = await query(sql, values);
        const data = rows[0];

        // SIDE EFFECT: If Approved, update employee_monthly_reports
        if (data && data.status === 'approved') {
            try {
                const date = data.date;
                const dateObj = new Date(date + 'T12:00:00Z');
                const monthKey = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;

                let currentMonthData: any = {};

                // 1. Try Fetch from NEW table first
                const { rows: newRows } = await query(
                    `SELECT report_data FROM employee_monthly_records WHERE employee_id = $1 AND month_key = $2`,
                    [data.mentee_id, monthKey]
                );

                if (newRows.length > 0) {
                    currentMonthData = newRows[0].report_data || {};
                }

                const category = data.category || 'UMUM';

                // Map category
                const categoryMap: Record<string, string> = {
                    'BBQ': 'tadarus',
                    'UMUM': 'tadarus',
                    'KIE': 'tepat_waktu_kie',
                    'DOA BERSAMA': 'doa_bersama',
                    'Doa Bersama': 'doa_bersama',
                    'KAJIAN SELASA': 'kajian_selasa',
                    'Kajian Selasa': 'kajian_selasa',
                    'PENGAJIAN PERSYARIKATAN': 'persyarikatan',
                    'Pengajian Persyarikatan': 'persyarikatan',
                    'Membaca Al-Quran dan buku': 'baca_alquran_buku'
                };
                const activityId = categoryMap[category] || 'tadarus';

                const activity = currentMonthData[activityId] || { count: 0, entries: [] };
                if (!activity.entries) activity.entries = [];

                // Prevent duplicate
                if (!activity.entries.some((e: any) => e.date === date)) {
                    activity.entries.push({
                        date,
                        completedAt: new Date().toISOString(),
                        note: `Approved via Tadarus Request: ${id}`
                    });
                    activity.count = activity.entries.length;
                    activity.completedAt = new Date().toISOString();

                    currentMonthData[activityId] = activity;

                    // Upsert into NEW table
                    await query(
                        `INSERT INTO employee_monthly_records (id, employee_id, month_key, report_data, updated_at) 
                         VALUES (gen_random_uuid(), $1, $2, $3, NOW())
                         ON CONFLICT (employee_id, month_key) 
                         DO UPDATE SET report_data = EXCLUDED.report_data, updated_at = NOW()`,
                        [data.mentee_id, monthKey, convertToCleanJson(currentMonthData)]
                    );


                    // 🔥 RESTORED: Insert into team_attendance_records
                    try {
                        const manualSessionId = '00000000-0000-0000-0000-000000000000';

                        // 1. Ensure Session Exists
                        const { rows: sessionExists } = await query(
                            `SELECT id FROM team_attendance_sessions WHERE id = $1`,
                            [manualSessionId]
                        );

                        if (sessionExists.length === 0) {
                            await query(
                                `INSERT INTO team_attendance_sessions 
                                (id, creator_id, creator_name, type, date, start_time, end_time, audience_type)
                                VALUES ($1, 'SYSTEM', 'System Approval', 'UMUM', '2000-01-01', '00:00', '23:59', 'public')`,
                                [manualSessionId]
                            );
                        }

                        // 2. Insert Record
                        const sessionType = (category.toUpperCase() === 'BBQ') ? 'BBQ' :
                            (category.toUpperCase() === 'KIE') ? 'KIE' :
                                (category.toUpperCase() === 'DOA BERSAMA') ? 'Doa Bersama' :
                                    (category.toUpperCase() === 'KAJIAN SELASA') ? 'Kajian Selasa' :
                                        (category.toUpperCase() === 'PENGAJIAN PERSYARIKATAN') ? 'Pengajian Persyarikatan' : 'UMUM';

                        await query(
                            `INSERT INTO team_attendance_records 
                            (session_id, user_id, user_name, attended_at, session_type, session_date, session_start_time, session_end_time)
                            VALUES ($1, $2, $3, $4, $5, $6, '00:00', '23:59')`,
                            [
                                manualSessionId,
                                data.mentee_id,
                                data.mentee_name || 'User', // Fallback name
                                new Date().toISOString(),
                                sessionType,
                                date
                            ]
                        );


                    } catch (teamError) {
                        console.error('⚠️ [API Tadarus] Failed to insert team attendance record:', teamError);
                    }
                }
            } catch (err) {
                console.error('⚠️ [API Tadarus] Failed to update monthly record:', err);
            }
        }

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('❌ [API Tadarus Requests PATCH] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

function convertToCleanJson(data: any) {
    return JSON.stringify(data);
}

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * API Route: /api/manual-requests/prayer
 * Purpose: Handle missed prayer requests (GET, POST, PATCH)
 * MIGRATED to use local PostgreSQL connection.
 */

export async function GET(request: NextRequest) {
    try {
        let session;
        try {
            session = await getSession();
        } catch (e: any) {
            console.error('❌ [API Prayer GET] getSession failed:', e);
            return NextResponse.json({ error: 'Auth Check Failed', details: e.message }, { status: 401 });
        }

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const menteeId = searchParams.get('menteeId');
        const menteeIds = searchParams.get('menteeIds')?.split(',');
        const mentorId = searchParams.get('mentorId');

        let sql = `SELECT * FROM missed_prayer_requests`;
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
        console.error('❌ [API Prayer Requests GET] Unexpected error:', error);
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

        // Check for existing request for same date/prayer/mentee to prevent duplicates
        const { mentee_id, date, prayer_id } = body;
        if (mentee_id && date && prayer_id) {
            const { rows: existingRows } = await query(
                `SELECT id FROM missed_prayer_requests WHERE mentee_id = $1 AND date = $2 AND prayer_id = $3 LIMIT 1`,
                [mentee_id, date, prayer_id]
            );
            if (existingRows.length > 0) {
                return NextResponse.json({ error: 'Pengajuan untuk tanggal dan waktu sholat ini sudah ada.' }, { status: 400 });
            }
        }

        // Dynamic Insert
        const keys = Object.keys(body);
        const values = Object.values(body);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const columns = keys.join(', ');

        const sql = `
            INSERT INTO missed_prayer_requests (${columns})
            VALUES (${placeholders})
            RETURNING *
        `;

        const { rows } = await query(sql, values);
        const data = rows[0];

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('❌ [API Prayer Requests POST] Unexpected error:', error);
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
            UPDATE missed_prayer_requests
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
                const prayerId = data.prayer_id;

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

                // Map prayer ID
                const prayerMap: Record<string, string> = {
                    'subuh': 'subuh-default', 'dzuhur': 'dzuhur-default', 'ashar': 'ashar-default',
                    'maghrib': 'maghrib-default', 'isya': 'isya-default', 'tahajud': 'tahajud-default'
                };
                const activityId = prayerMap[prayerId] || prayerId;

                const activity = currentMonthData[activityId] || { count: 0, entries: [] };
                if (!activity.entries) activity.entries = [];

                // Prevent duplicate
                if (!activity.entries.some((e: any) => e.date === date)) {
                    activity.entries.push({
                        date,
                        completedAt: new Date().toISOString(),
                        note: `Approved via Missed Prayer Request: ${id}`
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


                    // 🔥 NEW: Insert into attendance_records so it shows up in official logs
                    try {
                        const entityId = `${prayerId}-${date}`;
                        // Use historical timestamp so it doesn't appear as "today"
                        const historicalTimestamp = new Date(date + 'T12:00:00Z').toISOString();

                        await query(
                            `INSERT INTO attendance_records (employee_id, entity_id, status, reason, timestamp, is_late_entry)
                             VALUES ($1, $2, 'hadir', $3, $4, false)
                             ON CONFLICT (employee_id, entity_id) DO UPDATE
                             SET status = 'hadir', reason = $3, timestamp = $4`,
                            [
                                data.mentee_id,
                                entityId,
                                `Approved via Manual Request: ${data.reason}`,
                                historicalTimestamp
                            ]
                        );


                    } catch (attError) {
                        console.error('⚠️ [API Prayer] Failed to insert attendance record:', attError);
                    }
                }
            } catch (err) {
                console.error('⚠️ [API Prayer] Failed to update monthly report:', err);
            }
        }

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('❌ [API Prayer Requests PATCH] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

function convertToCleanJson(data: any) {
    return JSON.stringify(data);
}

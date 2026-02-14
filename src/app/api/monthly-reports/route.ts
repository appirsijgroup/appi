import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { toCamelCase, toSnakeCase } from '@/utils/caseConverter';
import { isAuthorizedForUser, isAdmin } from '@/lib/authHelpers';
import { handleError, handleSuccess } from '@/lib/api-utils';
import { z } from 'zod';

// Input Schemas
const GetSchema = z.object({
    menteeId: z.string().optional(),
    superiorId: z.string().optional(),
    roles: z.string().optional(),
    menteeIds: z.string().optional(),
});

const PostSchema = z.object({
    menteeId: z.string(),
    monthKey: z.string(),
    reportData: z.any(),
    submittedAt: z.number().optional(),
});

const PatchSchema = z.object({
    action: z.enum(['review', 'update_content']),
    reportId: z.string(),
    reviews: z.any().optional(),
    reportData: z.any().optional(),
});

/**
 * GET /api/monthly-reports
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const validated = GetSchema.parse(Object.fromEntries(searchParams));
        const { menteeId, superiorId, roles: rolesParam, menteeIds: menteeIdsParam } = validated;

        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        let queryStr = 'SELECT * FROM monthly_report_submissions WHERE 1=1';
        const params: any[] = [];

        if (menteeId) {
            // Security check for viewing specific mentee
            const authorized = await isAuthorizedForUser(menteeId);
            if (!authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

            params.push(menteeId);
            queryStr += ` AND mentee_id = $${params.length}`;
        } else if (superiorId) {
            // Superior can view their own assignments
            if (session.userId !== superiorId && !(await isAdmin())) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            params.push(superiorId);
            const superiorIdx = params.length;

            if (rolesParam) {
                const roles = rolesParam.split(',');
                // ✅ SECURITY: Strict whitelist for database columns to prevent SQL Injection
                const WHU_ROLE_WHITELIST: Record<string, string> = {
                    'mentorId': 'mentor_id',
                    'kaUnitId': 'ka_unit_id',
                    'managerId': 'manager_id',
                    'supervisorId': 'supervisor_id',
                    'dirutId': 'dirut_id'
                };

                const roleClauses = roles
                    .map(role => WHU_ROLE_WHITELIST[role])
                    .filter(Boolean) // Remove any non-whitelisted roles
                    .map(col => `${col} = $${superiorIdx}`);

                if (roleClauses.length === 0) {
                    return NextResponse.json({ error: 'Invalid roles provided' }, { status: 400 });
                }

                queryStr += ` AND (${roleClauses.join(' OR ')})`;
            } else {
                queryStr += ` AND (mentor_id = $${superiorIdx} OR ka_unit_id = $${superiorIdx} OR manager_id = $${superiorIdx} OR supervisor_id = $${superiorIdx})`;
            }
        } else if (menteeIdsParam) {
            const menteeIds = menteeIdsParam.split(',');
            params.push(menteeIds);
            queryStr += ` AND mentee_id = ANY($${params.length})`;

            // SECURITY: If not admin, restrict to reports the user is authorized to manage
            if (!(await isAdmin())) {
                params.push(session.userId);
                const sIdx = params.length;
                queryStr += ` AND (
                    mentor_id = $${sIdx} OR 
                    ka_unit_id = $${sIdx} OR 
                    manager_id = $${sIdx} OR 
                    supervisor_id = $${sIdx} OR 
                    mentee_id IN (
                        SELECT id FROM employees 
                        WHERE mentor_id = $${sIdx} OR 
                              ka_unit_id = $${sIdx} OR 
                              manager_id = $${sIdx} OR 
                              supervisor_id = $${sIdx} OR 
                              dirut_id = $${sIdx}
                    )
                )`;
            }
        } else {
            return NextResponse.json({ error: 'At least one filter (menteeId, superiorId, or menteeIds) is required' }, { status: 400 });
        }

        queryStr += ' ORDER BY month_key DESC, submitted_at DESC';

        const result = await query(queryStr, params);
        const data = result.rows.map(row => toCamelCase(row));

        return handleSuccess(data);
    } catch (error) {
        return handleError(error);
    }
}

/**
 * POST /api/monthly-reports
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = PostSchema.parse(await request.json());
        const { menteeId, monthKey, reportData, submittedAt } = body;

        // Security check
        if (!(await isAdmin()) && session.userId !== menteeId) {
            return NextResponse.json({ error: 'Forbidden: Can only submit reports for yourself' }, { status: 403 });
        }

        const mentorId = reportData?.mentorId || null;
        const kaUnitId = reportData?.kaUnitId || null;
        const managerId = reportData?.managerId || null;
        const supervisorId = reportData?.supervisorId || null;
        const dirutId = reportData?.dirutId || null;
        const menteeNameFinal = reportData?.menteeName || session.name || 'Unknown User';

        if (!mentorId) {
            return NextResponse.json({ error: 'Mentor belum diatur dalam profil Anda.' }, { status: 400 });
        }

        const sql = `
            INSERT INTO monthly_report_submissions (
                mentee_id, mentee_name, month_key, week_index, submitted_at, 
                mentor_id, ka_unit_id, manager_id, supervisor_id, dirut_id,
                status, reports
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;

        const params = [
            menteeId, menteeNameFinal, monthKey, 0, submittedAt || Date.now(),
            mentorId, kaUnitId, managerId, supervisorId, dirutId,
            'pending_mentor', reportData
        ];

        const result = await query(sql, params);
        return handleSuccess(toCamelCase(result.rows[0]));
    } catch (error: any) {
        if (error.code === '23505') {
            return NextResponse.json({ error: 'Laporan untuk bulan ini sudah dikirim.' }, { status: 409 });
        }
        return handleError(error);
    }
}

/**
 * PATCH /api/monthly-reports
 */
export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = PatchSchema.parse(await request.json());
        const { action, reportId, reviews, reportData } = body;

        // 1. Fetch report to check ownership/assignment
        const { rows: reportRows } = await query(
            'SELECT mentee_id, mentor_id, ka_unit_id FROM monthly_report_submissions WHERE id = $1',
            [reportId]
        );
        const report = reportRows[0];

        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        if (action === 'review') {
            // SECURITY: Only assigned reviewers or Admins
            const isAssigned = report.mentor_id === session.userId ||
                report.ka_unit_id === session.userId ||
                report.manager_id === session.userId ||
                report.supervisor_id === session.userId ||
                report.dirut_id === session.userId;
            if (!isAssigned && !(await isAdmin())) {
                return NextResponse.json({ error: 'Forbidden: You are not assigned to review this report' }, { status: 403 });
            }

            if (!reviews || Object.keys(reviews).length === 0) {
                return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
            }

            const fields = Object.entries(reviews)
                .filter(([k]) => k !== 'id')
                .map(([k, v]) => ({ col: toSnakeCase(k), val: v }));

            const setClause = fields.map((f, i) => `${f.col} = $${i + 2}`).join(', ');
            const params = [reportId, ...fields.map(f => f.val)];

            const sql = `UPDATE monthly_report_submissions SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`;
            const result = await query(sql, params);
            return handleSuccess(toCamelCase(result.rows[0]));

        } else if (action === 'update_content') {
            // ✅ SECURITY FIX: Only the mentee (owner) can update their own content
            if (report.mentee_id !== session.userId && !(await isAdmin())) {
                return NextResponse.json({ error: 'Forbidden: You can only update your own report' }, { status: 403 });
            }

            const sql = `UPDATE monthly_report_submissions SET reports = $2, updated_at = NOW() WHERE id = $1 RETURNING *`;
            const result = await query(sql, [reportId, reportData]);
            return handleSuccess(toCamelCase(result.rows[0]));
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        return handleError(error);
    }
}


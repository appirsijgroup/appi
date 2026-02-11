import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * Handle Quran Competency Data
 */

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');
        const all = searchParams.get('all') === 'true';

        if (all) {
            // Only admins
            if (session.role !== 'admin' && session.role !== 'super-admin') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            const { rows } = await query('SELECT * FROM employee_quran_competency');
            const mapped = rows.map(r => ({
                id: r.id,
                employeeId: r.employee_id,
                readingLevelId: r.reading_level,
                tajwidLevelId: r.tajwid_level,
                memorizationLevelId: r.memorization_level,
                understandingLevelId: r.understanding_level,
                readingChecklist: r.reading_checklist || [],
                tajwidChecklist: r.tajwid_checklist || [],
                memorizationChecklist: r.memorization_checklist || [],
                understandingChecklist: r.understanding_checklist || [],
                notes: r.notes,
                assessedAt: r.assessed_at,
                assessorId: r.assessor_id
            }));
            return NextResponse.json({ data: mapped });
        }

        if (employeeId) {
            const { rows } = await query(
                'SELECT * FROM employee_quran_competency WHERE employee_id = $1 LIMIT 1',
                [employeeId]
            );
            const r = rows[0];
            if (!r) return NextResponse.json({ data: null });

            return NextResponse.json({
                data: {
                    id: r.id,
                    employeeId: r.employee_id,
                    readingLevelId: r.reading_level,
                    tajwidLevelId: r.tajwid_level,
                    memorizationLevelId: r.memorization_level,
                    understandingLevelId: r.understanding_level,
                    readingChecklist: r.reading_checklist || [],
                    tajwidChecklist: r.tajwid_checklist || [],
                    memorizationChecklist: r.memorization_checklist || [],
                    understandingChecklist: r.understanding_checklist || [],
                    notes: r.notes,
                    assessedAt: r.assessed_at,
                    assessorId: r.assessor_id
                }
            });
        }

        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const {
            employee_id,
            reading_level_id,
            tajwid_level_id,
            memorization_level_id,
            understanding_level_id,
            reading_checklist,
            tajwid_checklist,
            memorization_checklist,
            understanding_checklist,
            notes
        } = body;

        if (!employee_id) return NextResponse.json({ error: 'Missing employee_id' }, { status: 400 });

        // Upsert competency
        // NOTE: Columns in DB are reading_level, tajwid_level etc (no _id suffix)
        // Checklists are jsonb

        const sql = `
            INSERT INTO employee_quran_competency 
            (employee_id, reading_level, tajwid_level, memorization_level, understanding_level, reading_checklist, tajwid_checklist, memorization_checklist, understanding_checklist, notes, assessed_at, assessor_id)
            VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10, NOW(), $11)
            ON CONFLICT (employee_id)
            DO UPDATE SET
                reading_level = EXCLUDED.reading_level,
                tajwid_level = EXCLUDED.tajwid_level,
                memorization_level = EXCLUDED.memorization_level,
                understanding_level = EXCLUDED.understanding_level,
                reading_checklist = EXCLUDED.reading_checklist,
                tajwid_checklist = EXCLUDED.tajwid_checklist,
                memorization_checklist = EXCLUDED.memorization_checklist,
                understanding_checklist = EXCLUDED.understanding_checklist,
                notes = EXCLUDED.notes,
                assessed_at = NOW(),
                assessor_id = EXCLUDED.assessor_id
            RETURNING *
        `;

        const { rows } = await query(sql, [
            employee_id,
            reading_level_id || null,
            tajwid_level_id || null,
            memorization_level_id || null,
            understanding_level_id || null,
            JSON.stringify(reading_checklist || []),
            JSON.stringify(tajwid_checklist || []),
            JSON.stringify(memorization_checklist || []),
            JSON.stringify(understanding_checklist || []),
            notes || null,
            session.userId || session.nip
        ]);

        // HISTORY LOGGING TEMPORARILY DISABLED
        // The history table schema (dimension, from, to) requires differential logic not yet implemented.
        // Will be implemented in future update.
        /*
        await query(
            `INSERT INTO employee_quran_history ...`
        );
        */

        const r = rows[0];
        const mappedData = {
            id: r.id,
            employeeId: r.employee_id,
            readingLevelId: r.reading_level,
            tajwidLevelId: r.tajwid_level,
            memorizationLevelId: r.memorization_level,
            understandingLevelId: r.understanding_level,
            readingChecklist: r.reading_checklist || [],
            tajwidChecklist: r.tajwid_checklist || [],
            memorizationChecklist: r.memorization_checklist || [],
            understandingChecklist: r.understanding_checklist || [],
            notes: r.notes,
            assessedAt: r.assessed_at,
            assessorId: r.assessor_id
        };

        return NextResponse.json({ success: true, data: mappedData });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/employees/reading-history?userId=xxx
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');

        if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

        // Fetch Book Reading History
        const bookHistory = await query(
            'SELECT * FROM employee_reading_history WHERE employee_id = $1 ORDER BY date_completed DESC',
            [userId]
        );

        // Fetch Quran Reading History
        const quranHistory = await query(
            'SELECT * FROM employee_quran_reading_history WHERE employee_id = $1 ORDER BY date DESC',
            [userId]
        );

        return NextResponse.json({
            data: {
                books: bookHistory.rows.map(r => ({
                    id: r.id,
                    employeeId: r.employee_id,
                    bookTitle: r.book_title,
                    pagesRead: r.pages_read,
                    dateCompleted: r.date_completed,
                    createdAt: r.created_at
                })),
                quran: quranHistory.rows.map(r => ({
                    id: r.id,
                    employeeId: r.employee_id,
                    surahName: r.surah_name,
                    surahNumber: r.surah_number,
                    startAyah: r.start_ayah,
                    endAyah: r.end_ayah,
                    date: r.date,
                    createdAt: r.created_at
                }))
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/employees/reading-history
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { type, employeeId, ...data } = body;

        if (!employeeId) return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 });

        if (type === 'quran') {
            const result = await query(
                `INSERT INTO employee_quran_reading_history 
                (employee_id, surah_number, surah_name, start_ayah, end_ayah, date) 
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [employeeId, data.surahNumber, data.surahName, data.startAyah, data.endAyah, data.date]
            );
            return NextResponse.json({ data: result.rows[0] });
        } else {
            const result = await query(
                `INSERT INTO employee_reading_history 
                (employee_id, book_title, pages_read, date_completed) 
                VALUES ($1, $2, $3, $4) RETURNING *`,
                [employeeId, data.bookTitle, data.pagesRead, data.dateCompleted]
            );
            return NextResponse.json({ data: result.rows[0] });
        }
    } catch (error: any) {
        console.error('POST reading-history error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/employees/reading-history
 */
export async function DELETE(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');
        const type = searchParams.get('type');

        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const table = type === 'quran' ? 'employee_quran_reading_history' : 'employee_reading_history';

        await query(`DELETE FROM ${table} WHERE id = $1`, [id]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('DELETE reading-history error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

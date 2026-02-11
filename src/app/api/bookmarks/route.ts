import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * API Route: /api/bookmarks
 * Handles Quran Ayah bookmarks for users
 */

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const surahNumber = searchParams.get('surahNumber');
        const ayahNumber = searchParams.get('ayahNumber');

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }



        // If specific ayah requested
        if (surahNumber && ayahNumber) {
            const { rows } = await query(
                'SELECT * FROM bookmarks WHERE user_id = $1 AND surah_number = $2 AND ayah_number = $3 LIMIT 1',
                [userId, parseInt(surahNumber), parseInt(ayahNumber)]
            );
            return NextResponse.json({ data: rows[0] || null });
        }

        // Otherwise get all for user
        const { rows } = await query(
            'SELECT * FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );



        return NextResponse.json({ data: rows });
    } catch (error: any) {
        console.error('GET /api/bookmarks error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { userId, surahNumber, surahName, ayahNumber, ayahText, notes } = body;

        if (!userId || !surahNumber || !ayahNumber) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const sNum = parseInt(surahNumber, 10);
        const aNum = parseInt(ayahNumber, 10);

        // Check if exists
        const { rows: existing } = await query(
            'SELECT id FROM bookmarks WHERE user_id = $1 AND surah_number = $2 AND ayah_number = $3',
            [userId, sNum, aNum]
        );

        if (existing.length > 0) {
            // Update
            const { rows } = await query(
                `UPDATE bookmarks SET 
                    surah_name = $4,
                    ayah_text = $5,
                    notes = $6,
                    updated_at = NOW()
                 WHERE user_id = $1 AND surah_number = $2 AND ayah_number = $3
                 RETURNING *`,
                [userId, sNum, aNum, surahName, ayahText, notes]
            );
            return NextResponse.json({ success: true, action: 'updated', data: rows[0] });
        } else {
            // Insert
            const { rows } = await query(
                `INSERT INTO bookmarks 
                 (user_id, surah_number, surah_name, ayah_number, ayah_text, notes, timestamp, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                 RETURNING *`,
                [userId, sNum, surahName, aNum, ayahText, notes, Date.now()]
            );
            return NextResponse.json({ success: true, action: 'added', data: rows[0] });
        }
    } catch (error: any) {
        console.error('POST /api/bookmarks error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { userId, surahNumber, ayahNumber, notes } = body;

        if (!userId || !surahNumber || !ayahNumber) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { rows } = await query(
            `UPDATE bookmarks SET 
                notes = $4,
                updated_at = NOW()
             WHERE user_id = $1 AND surah_number = $2 AND ayah_number = $3
             RETURNING *`,
            [userId, surahNumber, ayahNumber, notes]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: rows[0] });
    } catch (error: any) {
        console.error('PATCH /api/bookmarks error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const userId = searchParams.get('userId');
        const surahNumber = searchParams.get('surahNumber');
        const ayahNumber = searchParams.get('ayahNumber');

        if (id) {
            await query('DELETE FROM bookmarks WHERE id = $1', [id]);
        } else if (userId && surahNumber && ayahNumber) {
            await query(
                'DELETE FROM bookmarks WHERE user_id = $1 AND surah_number = $2 AND ayah_number = $3',
                [userId, parseInt(surahNumber), parseInt(ayahNumber)]
            );
        } else {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('DELETE /api/bookmarks error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

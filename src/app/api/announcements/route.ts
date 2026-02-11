import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * API Route: /api/announcements
 * Purpose: Handle announcement operations (GET, POST, PATCH, DELETE)
 * MIGRATED to use local PostgreSQL connection.
 */

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const scope = searchParams.get('scope');
        const authorId = searchParams.get('authorId');
        const limit = searchParams.get('limit');
        const afterTimestamp = searchParams.get('afterTimestamp');

        if (id) {
            const { rows } = await query('SELECT * FROM announcements WHERE id = $1', [id]);
            return NextResponse.json({ data: rows[0] || null });
        }

        let sql = 'SELECT * FROM announcements';
        const params: any[] = [];
        const conditions: string[] = [];

        if (scope) {
            params.push(scope);
            conditions.push(`scope = $${params.length}`);
        }

        if (authorId) {
            params.push(authorId);
            conditions.push(`author_id = $${params.length}`);
        }

        if (afterTimestamp) {
            params.push(parseInt(afterTimestamp, 10));
            conditions.push(`timestamp > $${params.length}`);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY timestamp DESC';

        if (limit) {
            params.push(parseInt(limit, 10));
            sql += ` LIMIT $${params.length}`;
        }

        const { rows } = await query(sql, params);
        return NextResponse.json({ data: rows });
    } catch (error: any) {
        console.error('❌ [API Announcements] GET error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only admins can create announcements
        if (session.role !== 'admin' && session.role !== 'super-admin' && session.role !== 'mentor') {
            return NextResponse.json({ error: 'Higher privilege required' }, { status: 403 });
        }

        const body = await request.json();
        const {
            title,
            content,
            scope = 'alliansi',
            target_hospital_ids = [],
            target_hospital_names = [],
            image_url,
            document_url,
            document_name,
            author_id,
            author_name
        } = body;

        const timestamp = Date.now();

        const sql = `
            INSERT INTO announcements (
                title, content, author_id, author_name, timestamp, scope, 
                target_hospital_ids, target_hospital_names, image_url, 
                document_url, document_name, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
            RETURNING *
        `;

        const values = [
            title, content, author_id || session.userId, author_name || session.name,
            timestamp, scope, target_hospital_ids, target_hospital_names,
            image_url, document_url, document_name
        ];

        const { rows } = await query(sql, values);
        return NextResponse.json({ success: true, data: rows[0] });
    } catch (error: any) {
        console.error('❌ [API Announcements] POST error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        // Build dynamic update
        const keys = Object.keys(updates);
        if (keys.length === 0) return NextResponse.json({ error: 'No updates provided' }, { status: 400 });

        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        const values = Object.values(updates);
        values.push(id);

        const sql = `
            UPDATE announcements
            SET ${setClause}
            WHERE id = $${values.length}
            RETURNING *
        `;

        const { rows } = await query(sql, values);
        return NextResponse.json({ success: true, data: rows[0] });
    } catch (error: any) {
        console.error('❌ [API Announcements] PATCH error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        await query('DELETE FROM announcements WHERE id = $1', [id]);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('❌ [API Announcements] DELETE error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

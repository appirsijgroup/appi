import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * API Route: /api/notifications
 * Purpose: Handle notification operations (GET, DELETE, POST/UPDATE)
 * MIGRATED to use local PostgreSQL connection.
 */

/**
 * GET /api/notifications?userId=xxx
 * Fetch notifications for a user
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
        }

        // Security: Users can only fetch their own notifications unless admin
        if (session.userId !== userId && session.role !== 'admin' && session.role !== 'super-admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch notifications
        const result = await query(
            `SELECT * FROM notifications 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT 100`,
            [userId]
        );

        // Convert snake_case to camelCase
        const notifications = result.rows.map((row: any) => ({
            id: row.id,
            userId: row.user_id,
            type: row.type,
            title: row.title,
            message: row.message,
            isRead: row.is_read,
            createdAt: row.created_at,
            timestamp: row.timestamp ? Number(row.timestamp) : Date.parse(row.created_at),
            linkTo: row.link_to,
            relatedEntityId: row.related_entity_id,
            expiresAt: row.expires_at ? Number(row.expires_at) : undefined,
            dismissOnClick: row.dismiss_on_click
        }));

        return NextResponse.json({ data: notifications });
    } catch (error: any) {
        console.error('❌ [API Notifications GET] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        // 1. Verify Authentication
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse Request
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const idsParam = searchParams.get('ids'); // comma separated list

        // 4. Determine operation (Clear All vs Specific IDs)
        if (userId && !idsParam) {
            // Check if user is clearing their own notifications or if they are admin
            if (session.userId !== userId && session.role !== 'admin' && session.role !== 'super-admin') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            // Perform Clear All for user
            await query('DELETE FROM notifications WHERE user_id = $1', [userId]);

            return NextResponse.json({ success: true, message: 'All notifications cleared' });
        }

        if (idsParam) {
            const notificationIds = idsParam.split(',');

            // For security, checking if admin or owner of notifications
            // The original logic just checked session.userId if not admin
            let sql = `DELETE FROM notifications WHERE id = ANY($1)`;
            const params: any[] = [notificationIds];

            if (session.role !== 'admin' && session.role !== 'super-admin') {
                sql += ` AND user_id = $2`;
                params.push(session.userId);
            }

            await query(sql, params);

            return NextResponse.json({ success: true, message: 'Notifications deleted' });
        }

        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    } catch (error: any) {
        console.error('❌ [API Notifications Delete] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

// Map POST to handle bulk actions or updates
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { action, userId, notificationId } = body;

        if (action === 'mark_read') {
            if (!notificationId) return NextResponse.json({ error: 'Missing notificationId' }, { status: 400 });

            // Security check
            let sql = `UPDATE notifications SET is_read = true WHERE id = $1`;
            const params: any[] = [notificationId];

            if (session.role !== 'admin' && session.role !== 'super-admin') {
                sql += ` AND user_id = $2`;
                params.push(session.userId);
            }

            await query(sql, params);
            return NextResponse.json({ success: true });
        }

        if (action === 'mark_all_read') {
            if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
            if (session.userId !== userId && session.role !== 'admin' && session.role !== 'super-admin') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            await query(`UPDATE notifications SET is_read = true WHERE user_id = $1`, [userId]);
            return NextResponse.json({ success: true });
        }

        if (action === 'create') {
            const { userId: targetUserId, type, title, message, linkTo, relatedEntityId, expiresAt, dismissOnClick } = body;

            if (!targetUserId || !type || !title || !message) {
                return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
            }

            // Optional: Only allow admins to send notifications to others?
            // Actually, some user actions might trigger notifications. 
            // Better to just check if session exists (which we already did).

            const res = await query(
                `INSERT INTO notifications (
                    user_id, type, title, message, link_to, 
                    related_entity_id, timestamp, is_read, 
                    expires_at, dismiss_on_click
                )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING *`,
                [
                    targetUserId,
                    type,
                    title,
                    message,
                    linkTo ? JSON.stringify(linkTo) : null,
                    relatedEntityId || null,
                    Date.now(),
                    false,
                    expiresAt || null,
                    dismissOnClick || false
                ]
            );

            return NextResponse.json({ success: true, data: res.rows[0] });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

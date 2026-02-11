import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate user
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse request body
        const updates = await request.json();
        const { id, ...payload } = updates;

        // Security: Users can only update their own record unless they are admin
        const targetUserId = id || session.userId;
        const isAdmin = ['admin', 'super-admin', 'owner'].includes(session.role || '') ||
            !!session.canBeBPH ||
            (session.functionalRoles?.includes('BPH') ?? false);

        console.log(`[Update API] User ${session.userId} (Role: ${session.role}, isAdmin: ${isAdmin}) targetting ${targetUserId}`);
        console.log(`[Update API] Payload keys: ${Object.keys(payload).join(', ')}`);

        // 🔥 SECURITY: Define whitelisted fields for non-admins
        // Regular users can ONLY update these fields
        const USER_ALLOWED_FIELDS = ['phone_number', 'address', 'gender', 'birth_place', 'birth_date', 'employment_status', 'bio', 'social_media_links', 'is_profile_complete', 'profile_picture', 'avatar_url', 'signature', 'email', 'nik', 'unit', 'bagian', 'profession', 'profession_category', 'must_change_password'];

        let finalUpdates: Record<string, any> = {};

        if (!isAdmin) {
            // Filter out any fields not in the whitelist
            Object.keys(payload).forEach(key => {
                const snakeKey = key.includes('_') ? key : key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                if (USER_ALLOWED_FIELDS.includes(snakeKey)) {
                    finalUpdates[snakeKey] = payload[key];
                } else {
                    console.warn(`⚠️ [Security] Unauthorized field update attempt by user ${session.userId}: ${key} (snake: ${snakeKey})`);
                }
            });
        } else {
            // Admins can update more
            finalUpdates = payload;
        }

        console.log(`[Update API] Final updates count: ${Object.keys(finalUpdates).length}`);

        // 4. Update the record - Dynamic Update
        if (Object.keys(finalUpdates).length === 0) {
            return NextResponse.json({
                success: false,
                message: isAdmin ? 'No fields to update' : 'No authorized fields provided for update'
            }, { status: 400 });
        }

        const keys = Object.keys(finalUpdates);
        const values = Object.values(finalUpdates);
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        values.push(targetUserId);

        const sql = `
            UPDATE employees
            SET ${setClause}, updated_at = NOW()
            WHERE id = $${values.length}
            RETURNING *
        `;

        const { rows } = await query(sql, values);
        const data = rows[0];

        if (!data) {
            console.error('Update failed: Target employee record not found or no rows updated', { targetUserId });
            return NextResponse.json({ error: 'Employee record not found or update failed' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('Unexpected error in employee update API:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

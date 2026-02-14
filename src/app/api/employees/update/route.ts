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

        // 🔥 PHYSICAL SCHEMA: Actual columns currently in the 'employees' table
        const VALID_EMPLOYEE_COLUMNS = [
            'id', 'email', 'password', 'name', 'hospital_id', 'unit', 'bagian',
            'profession_category', 'profession', 'gender', 'last_visit_date',
            'role', 'is_active', 'notification_enabled', 'profile_picture',
            'ka_unit_id', 'mentor_id', 'supervisor_id', 'manager_id', 'dirut_id',
            'can_be_mentor', 'can_be_supervisor', 'can_be_manager', 'can_be_ka_unit',
            'can_be_dirut', 'can_be_direksi', 'can_be_bph', 'bph_id', 'direksi_id',
            'functional_roles', 'manager_scope', 'signature', 'achievements',
            'must_change_password', 'is_profile_complete', 'email_verified',
            'auth_user_id', 'managed_hospital_ids', 'nik', 'phone_number',
            'address', 'employment_status', 'birth_place', 'birth_date',
            'last_announcement_read_timestamp'
        ];

        // 🔥 SECURITY: Whitelisted fields for regular users (subset of physical columns)
        const USER_ALLOWED_FIELDS = [
            'phone_number', 'address', 'gender', 'birth_place', 'birth_date',
            'employment_status', 'is_profile_complete', 'profile_picture',
            'signature', 'email', 'nik', 'unit', 'bagian', 'profession',
            'profession_category', 'must_change_password'
        ];

        const finalUpdates: Record<string, any> = {};

        // Process and filter fields
        Object.keys(payload).forEach(key => {
            // Convert camelCase to snake_case for DB
            const snakeKey = key.includes('_') ? key : key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

            // 1. Must be a real column in the database
            if (VALID_EMPLOYEE_COLUMNS.includes(snakeKey)) {
                // 2. If not admin, must be in the USER_ALLOWED_FIELDS whitelist
                if (isAdmin) {
                    finalUpdates[snakeKey] = payload[key];
                } else if (USER_ALLOWED_FIELDS.includes(snakeKey)) {
                    finalUpdates[snakeKey] = payload[key];
                } else {
                    console.warn(`⚠️ [Security] Unauthorized field update attempt by user ${session.userId}: ${key}`);
                }
            } else {
                // Column doesn't exist anymore (like readingHistory or monthlyActivities)
                console.log(`ℹ️ [Filter] Skipping non-database field: ${key}`);
            }
        });

        console.log(`[Update API] Final filtered updates count: ${Object.keys(finalUpdates).length}`);

        // 4. Update the record - Dynamic Update
        if (Object.keys(finalUpdates).length === 0) {
            // Fetch and return current data if no authorized fields to update
            const { rows } = await query('SELECT * FROM employees WHERE id = $1', [targetUserId]);
            return NextResponse.json({
                success: true,
                message: isAdmin ? 'No changes requested' : 'No authorized fields provided for update, local state sync only',
                data: rows[0]
            }, { status: 200 });
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

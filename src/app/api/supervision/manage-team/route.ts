import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * POST /api/supervision/manage-team
 * Supervisor/KaUnit/Manager mengelola tim yang diawasi
 * MIGRATED to use local PostgreSQL connection.
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { superiorId, employeeIds, action, role } = body;
        // role: 'kaunit'
        // action: 'add' | 'remove'

        if (!superiorId || !employeeIds || !Array.isArray(employeeIds) || !action || !role) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        // Determine which field to update based on role
        let fieldName = '';
        if (role === 'kaunit') fieldName = 'ka_unit_id';
        else {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        if (action === 'add') {
            // Set supervisor/kaunit/manager for employees
            // UPDATE employees SET field = $1 WHERE id = ANY($2)
            await query(
                `UPDATE employees SET ${fieldName} = $1 WHERE id = ANY($2)`,
                [superiorId, employeeIds]
            );

            return NextResponse.json({ success: true, message: 'Team members added successfully' });

        } else if (action === 'remove') {
            // Remove supervisor/kaunit/manager from employees
            await query(
                `UPDATE employees SET ${fieldName} = NULL WHERE id = ANY($1)`,
                [employeeIds]
            );

            return NextResponse.json({ success: true, message: 'Team members removed successfully' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('Error in manage-team API:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

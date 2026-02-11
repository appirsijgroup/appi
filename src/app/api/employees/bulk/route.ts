import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'

/**
 * POST /api/employees/bulk
 * Get multiple employees by their IDs
 * MIGRATED to use local PostgreSQL connection.
 */
export async function POST(request: NextRequest) {
    try {
        const sessionCookie = request.cookies.get('session')?.value;
        if (!sessionCookie) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const session = await verifyToken(sessionCookie);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { ids } = await request.json();
        if (!ids || !Array.isArray(ids)) {
            return NextResponse.json({ error: 'Invalid IDs provided' }, { status: 400 });
        }

        // Use ANY($1) for efficient bulk selection
        const { rows: employees } = await query(
            `SELECT * FROM employees WHERE id = ANY($1)`,
            [ids]
        );

        // Sanitize sensitive fields if needed (password usually)
        const sanitized = employees.map(emp => {
            const { password, ...rest } = emp;
            return rest;
        });

        return NextResponse.json({ employees: sanitized });
    } catch (error) {
        console.error('❌ [/api/employees/bulk] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

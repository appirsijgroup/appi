import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

/**
 * GET /api/admin/job-structure
 * Fetch all job structure data
 * MIGRATED: Now uses local PostgreSQL database
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || (session.role !== 'admin' && session.role !== 'super-admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await query('SELECT * FROM job_structure');

        return NextResponse.json({ data: result.rows });
    } catch (error: any) {
        console.error('❌ [/api/admin/job-structure] Error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}

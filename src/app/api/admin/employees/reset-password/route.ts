import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * POST /api/admin/employees/reset-password
 * 
 * Admin tool to reset an employee's password.
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Verify Authentication
        const sessionCookie = request.cookies.get('session')?.value;
        if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const session = await verifyToken(sessionCookie);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // 2. Authorize: Only admins can reset passwords
        const { rows: adminRows } = await query(`SELECT role FROM employees WHERE id = $1`, [session.userId]);
        const adminEmployee = adminRows[0];

        if (!adminEmployee || !['admin', 'super-admin', 'owner'].includes(adminEmployee.role)) {
            return NextResponse.json(
                { error: 'Forbidden: Only admins can reset passwords' },
                { status: 403 }
            );
        }

        // 3. Parse Request
        const { userId, newPassword } = await request.json();

        if (!userId || !newPassword) {
            return NextResponse.json(
                { error: 'UserId and newPassword are required' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters' },
                { status: 400 }
            );
        }

        // 4. Hash and Update
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const sql = `
            UPDATE employees 
            SET password = $1, must_change_password = true, updated_at = NOW()
            WHERE id = $2
            RETURNING id, name, email
        `;

        const { rows } = await query(sql, [hashedPassword, userId]);

        if (rows.length === 0) {
            return NextResponse.json(
                { error: 'Employee not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Password successfully reset',
            data: {
                userId: rows[0].id,
                name: rows[0].name
            }
        });

    } catch (error: any) {
        console.error('❌ Reset Password API Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

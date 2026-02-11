import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { toCamelCase } from '@/utils/caseConverter';

export async function GET(request: NextRequest) {
  try {
    // Get userId from cookie
    const userId = request.cookies.get('userId')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - No userId cookie' },
        { status: 401 }
      );
    }

    // Fetch employee data from Local DB
    const result = await query(
      'SELECT * FROM employees WHERE id = $1 LIMIT 1',
      [userId]
    );

    const employeeData = result.rows[0];

    if (!employeeData) {
      return NextResponse.json(
        { error: 'User tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Convert snake_case from DB to camelCase for frontend
    const camelCasedData = toCamelCase<any>(employeeData);

    // Check if account is active
    const isActive = camelCasedData.isActive !== false;

    if (!isActive) {
      return NextResponse.json(
        { error: 'Akun dinonaktifkan.' },
        { status: 403 }
      );
    }

    // Remove sensitive data
    const { password, ...safeEmployeeData } = camelCasedData;

    return NextResponse.json({
      success: true,
      employee: safeEmployeeData
    }, { status: 200 });

  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}

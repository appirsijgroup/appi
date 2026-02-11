import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * API Route: /api/activated-months
 * Purpose: Handle activated months CRUD operations using the dedicated 'mutabaah_activations' table.
 * MIGRATED to use local PostgreSQL connection.
 */

// Get activated months for an employee
export async function GET(request: NextRequest) {
  try {
    // Verify custom JWT authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }

    // Users can only view their own data unless they are admins
    if (session.role !== 'admin' && session.role !== 'super-admin' && session.userId !== employeeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { rows } = await query(
      `SELECT month_key FROM mutabaah_activations WHERE employee_id = $1`,
      [employeeId]
    );

    // Transform [{ month_key: '2025-01' }] -> ['2025-01']
    const activatedMonths = rows.map((row) => row.month_key);

    return NextResponse.json({ activatedMonths });
  } catch (error) {
    console.error('GET /api/activated-months error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Activate a month for an employee
export async function POST(request: NextRequest) {
  try {
    // Verify custom JWT authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { employeeId, monthKey } = body;

    if (!employeeId || !monthKey) {
      return NextResponse.json({ error: 'employeeId and monthKey are required' }, { status: 400 });
    }

    // Users can only update their own data unless they are admins
    if (session.role !== 'admin' && session.role !== 'super-admin' && session.userId !== employeeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if already exists then insert
    // Using ON CONFLICT logic in SQL is cleaner, but let's mimic original logic closely
    const { rows: existing } = await query(
      `SELECT id FROM mutabaah_activations WHERE employee_id = $1 AND month_key = $2 LIMIT 1`,
      [employeeId, monthKey]
    );

    if (existing.length === 0) {
      await query(
        `INSERT INTO mutabaah_activations (employee_id, month_key) VALUES ($1, $2)`,
        [employeeId, monthKey]
      );
    }

    // Return updated list
    const { rows: allData } = await query(
      `SELECT month_key FROM mutabaah_activations WHERE employee_id = $1`,
      [employeeId]
    );

    return NextResponse.json({
      success: true,
      activatedMonths: allData.map(d => d.month_key)
    });
  } catch (error) {
    console.error('POST /api/activated-months error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

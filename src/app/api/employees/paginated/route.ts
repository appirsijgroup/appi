import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'

/**
 * GET /api/employees/paginated
 * Get employees with pagination and filters
 * MIGRATED to use local PostgreSQL connection.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await verifyToken(sessionCookie)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 🔥 ROLE-BASED ACCESS CONTROL
    const isSuperAdmin = session.role === 'super-admin'
    // Ensure managedHospitalIds is an array
    const managedHospitalIds = Array.isArray(session.managedHospitalIds) ? session.managedHospitalIds : [];

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 100)
    const search = searchParams.get('search') || ''
    const hospitalId = searchParams.get('hospitalId') || ''
    const role = searchParams.get('role') || ''
    const isActive = searchParams.get('isActive')

    const offset = (page - 1) * limit

    // Build Query
    let sql = `SELECT * FROM employees WHERE 1=1`;
    let countSql = `SELECT COUNT(*) as total FROM employees WHERE 1=1`;
    const params: any[] = [];
    const conditions: string[] = [];

    // Search
    if (search) {
      const p = params.length + 1;
      conditions.push(`(name ILIKE $${p} OR email ILIKE $${p})`);
      params.push(`%${search}%`);
    }

    // Role
    if (role) {
      conditions.push(`role = $${params.length + 1}`);
      params.push(role);
    }

    // Is Active
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      conditions.push(`is_active = $${params.length + 1}`);
      params.push(isActive === 'true');
    }

    // 🔥 ENFORCE HOSPITAL SCOPING
    if (!isSuperAdmin) {
      if (hospitalId) {
        // Check access
        if (!managedHospitalIds.includes(hospitalId)) {
          // Determine if we should strict block or filter by valid hospitals
          if (managedHospitalIds.length > 0) {
            // Filter to ONLY their managed hospitals (ignoring the invalid requested one effectively, or restricting to intersection)
            // Logic: "Requesting X, but I only own Y". Should probably return empty or just show Y? 
            // Safe default: Show intersection (which is empty)
            conditions.push(`hospital_id = ANY($${params.length + 1})`);
            params.push([]); // Empty array -> no results
          } else {
            // No managed hospitals
            return NextResponse.json({
              employees: [],
              pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
            });
          }
        } else {
          conditions.push(`hospital_id = $${params.length + 1}`);
          params.push(hospitalId);
        }
      } else {
        // Show all managed
        if (managedHospitalIds.length > 0) {
          conditions.push(`hospital_id = ANY($${params.length + 1})`);
          params.push(managedHospitalIds);
        } else {
          return NextResponse.json({
            employees: [],
            pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
          });
        }
      }
    } else {
      // Super Admin
      if (hospitalId) {
        conditions.push(`hospital_id = $${params.length + 1}`);
        params.push(hospitalId);
      }
    }

    // Assemble SQL
    if (conditions.length > 0) {
      const condClause = conditions.join(' AND ');
      sql += ' AND ' + condClause;
      countSql += ' AND ' + condClause;
    }

    // Execute Count (for pagination)
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || '0');

    // Execute Main Query
    sql += ` ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const resultParams = [...params, limit, offset];

    const { rows: employees } = await query(sql, resultParams);

    if (employees.length === 0) {
      return NextResponse.json({
        employees: [],
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: false, hasPrev: false }
      });
    }

    // Fetch Activated Months for these employees
    const empIds = employees.map(e => e.id);
    const { rows: activations } = await query(
      `SELECT employee_id, month_key FROM mutabaah_activations WHERE employee_id = ANY($1)`,
      [empIds]
    );

    // Group activations
    const activationsMap: Record<string, string[]> = {};
    activations.forEach(a => {
      if (!activationsMap[a.employee_id]) activationsMap[a.employee_id] = [];
      activationsMap[a.employee_id].push(a.month_key);
    });

    // Sanitize and Attach
    const sanitizedEmployees = employees.map(emp => {
      const { password, ...rest } = emp;
      return {
        ...rest,
        profilePicture: rest.avatar_url || null,
        activated_months: activationsMap[emp.id] || []
      };
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      employees: sanitizedEmployees,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })

  } catch (error: any) {
    console.error('Paginated Employees Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

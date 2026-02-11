import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createToken, setSessionCookie } from '@/lib/jwt';
import { getEssentialEmployeeData } from '@/services/employeeServerService';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const jwtSecret = process.env.JWT_SECRET;

    // JWT Secret check for Production
    if (!jwtSecret && process.env.NODE_ENV === 'production') {
      return NextResponse.json({
        error: 'Security Configuration Error',
        details: 'JWT_SECRET must be set environment variables.'
      }, { status: 500 });
    }

    // 2. Parse payload safely
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Format data tidak valid' }, { status: 400 });
    }

    const { identifier, password } = body;
    if (!identifier || !password) {
      return NextResponse.json({ error: 'NIP/Email dan Password wajib diisi' }, { status: 400 });
    }

    // 3. Database operation (MIGRATED TO LOCAL DB)
    // We search by ID (NIP) or Email
    const { rows } = await query(
      `SELECT * FROM employees WHERE id = $1 OR email = $1 LIMIT 1`,
      [identifier]
    );
    const employee = rows[0];

    if (!employee) {
      return NextResponse.json({ error: 'Karyawan tidak ditemukan. Periksa NIP/Email Anda.' }, { status: 401 });
    }

    // 4. Password validation
    let passwordMatch = false;
    try {
      if (employee.password) {
        passwordMatch = await bcrypt.compare(password, employee.password);
      } else {
        // Fallback if password is null (should not happen for active users)
        passwordMatch = false;
      }
    } catch (bcryptError) {
      throw new Error(`Auth internal error: ${bcryptError instanceof Error ? bcryptError.message : 'Encryption fail'}`);
    }

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 });
    }

    // 5. Active status check
    if (employee.is_active === false) {
      return NextResponse.json({ error: 'Akun Anda sedang dinonaktifkan. Hubungi Admin.' }, { status: 403 });
    }


    // 6. Success Response - Fetch ESSENTIAL employee data for faster initial load
    const fullEmployee = await getEssentialEmployeeData(employee.id);

    // Token Generation - Include additional role and activation info
    const sessionPayload = {
      userId: employee.id,
      email: employee.email,
      name: employee.name,
      nip: employee.id,
      role: employee.role,
      managedHospitalIds: employee.managed_hospital_ids,
      canBeMentor: employee.can_be_mentor,
      canBeSupervisor: employee.can_be_supervisor,
      canBeKaUnit: employee.can_be_ka_unit,
      canBeManager: employee.can_be_manager,
      canBeDirut: employee.can_be_dirut,
      canBeBPH: employee.can_be_bph,
      functionalRoles: employee.functional_roles,
      activatedMonths: employee.activated_months,
    };

    let token;
    try {
      token = await createToken(sessionPayload);
    } catch (jwtError) {
      throw new Error(`Token generation failed: ${jwtError instanceof Error ? jwtError.message : 'Unknown reason'}`);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Berhasil masuk',
      employee: fullEmployee // Return the full object
    });

    // Set cookie
    setSessionCookie(response, token);

    return response;

  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({
      error: 'Kesalahan internal sistem',
      details: err?.message || 'Unknown crash'
    }, { status: 500 });
  }
}

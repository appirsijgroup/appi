import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

/**
 * POST /api/admin/employees
 *
 * Create new employee (by Admin)
 * MIGRATED to use local PostgreSQL connection.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify Authentication
    const sessionCookie = request.cookies.get('session')?.value;
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(sessionCookie);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check if user has admin role
    const { rows: adminRows } = await query(`SELECT role FROM employees WHERE id = $1`, [session.userId]);
    const adminEmployee = adminRows[0];

    if (!adminEmployee || !['admin', 'super-admin', 'owner'].includes(adminEmployee.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can create employees' },
        { status: 403 }
      );
    }

    // Parse the request body
    const employeeData = await request.json();

    // Extract fields - use 'id' from request as the employee ID (NIP)
    const {
      id: employeeId,
      name,
      email,
      password,
      role,
      unit,
      bagian,
      profession,
      professionCategory,
      profession_category,
      gender,
      hospitalId,
      hospital_id,
      ...otherFields
    } = employeeData;

    // Validate required fields based on actual schema
    if (!employeeId || !name || !email) {
      return NextResponse.json(
        { error: 'ID (NIP), Nama, dan Email wajib diisi' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Format email tidak valid' },
        { status: 400 }
      );
    }

    // Check if ID (NIP) already exists
    const { rows: existingId } = await query(`SELECT id FROM employees WHERE id = $1`, [employeeId]);
    if (existingId.length > 0) {
      return NextResponse.json(
        { error: `NIP ${employeeId} sudah terdaftar. Gunakan NIP lain.` },
        { status: 409 }
      );
    }

    // Check if email already exists
    const { rows: existingEmail } = await query(`SELECT id FROM employees WHERE email = $1`, [email]);
    if (existingEmail.length > 0) {
      return NextResponse.json(
        { error: `Email ${email} sudah terdaftar. Gunakan email lain.` },
        { status: 409 }
      );
    }

    // Generate Hash Password
    const tempPassword = password || Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Normalize values
    const finalUnit = unit || 'Unit Belum Diisi';
    const finalBagian = bagian || 'Bagian Belum Diisi';
    const finalProfession = profession || '-';
    const finalProfessionCategory = professionCategory || profession_category || 'NON MEDIS';
    const finalGender = gender || 'Laki-laki';
    const finalHospitalId = (hospitalId || hospital_id || '').toUpperCase();

    // Prepare insert - using ACTUAL schema columns
    const insertSql = `
        INSERT INTO employees (
            id, email, password, name,
            hospital_id, unit, bagian, profession_category, profession, gender,
            role, is_active, notification_enabled,
            must_change_password, is_profile_complete, email_verified,
            last_visit_date
        ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8, $9, $10,
            $11, $12, $13,
            $14, $15, $16,
            $17
        ) RETURNING *
    `;

    const values = [
      employeeId,
      email,
      hashedPassword,
      name,
      finalHospitalId || null,
      finalUnit,
      finalBagian,
      finalProfessionCategory,
      finalProfession,
      finalGender,
      role || 'user',
      true, // is_active
      true, // notification_enabled
      true, // must_change_password - force password change on first login
      false, // is_profile_complete
      false, // email_verified
      new Date().toISOString().split('T')[0] // last_visit_date
    ];

    const { rows: newEmployeeRows } = await query(insertSql, values);
    const newEmployee = newEmployeeRows[0];

    // Remove password hash from response
    delete newEmployee.password;

    return NextResponse.json({
      success: true,
      data: newEmployee,
      tempPassword: tempPassword, // Include temp password so admin can share it
      message: 'Karyawan berhasil ditambahkan'
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Admin Create Employee Error:', error);
    console.error('Error details:', error.message, error.stack);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server saat membuat karyawan.', details: error.message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

/**
 * Register New User API
 * MIGRATED to use local PostgreSQL connection.
 * Creates user directly in 'employees' table with hashed password.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, dan nama wajib diisi.' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Format email tidak valid.' },
        { status: 400 }
      )
    }

    // Validate password strength (min 6 characters)
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter.' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { rows: existing } = await query(
      `SELECT id FROM employees WHERE email = $1`,
      [email]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar. Silakan login.' },
        { status: 409 }
      )
    }

    // Generate ID and Hash Password
    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into employees
    const insertSql = `
        INSERT INTO employees (
            id, email, password, name, 
            is_active, is_profile_complete, email_verified, role,
            auth_user_id
        ) VALUES (
            $1, $2, $3, $4, 
            $5, $6, $7, $8, 
            $9
        ) RETURNING id, email, name
    `;

    // Note: putting id in auth_user_id as well for compatibility if columns are checked
    // Defaulting is_active to false (admin approval needed)
    const { rows: newEmp } = await query(insertSql, [
      id, email, hashedPassword, name,
      false, false, true, 'user',
      id
    ]);

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Pendaftaran berhasil! Akun Anda menunggu persetujuan admin.',
      user: newEmp[0],
      redirect: '/login',
    }, { status: 201 })

  } catch (error: any) {
    console.error('Register API Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}

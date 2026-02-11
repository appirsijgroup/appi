import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * API Endpoint untuk mengubah password
 * Menerima: oldPassword, newPassword
 * Memvalidasi old password dan update dengan new password di server side
 * MIGRATED to use local PostgreSQL connection.
 */
export async function POST(request: NextRequest) {
  try {
    // Get secure session from HTTP-only cookie
    const session = await getSession();
    const userId = session?.userId;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Silakan login kembali' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { oldPassword, newPassword } = body;

    // Validate input
    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Password lama dan password baru wajib diisi.' },
        { status: 400 }
      );
    }

    // Password strength validation
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password baru harus minimal 8 karakter.' },
        { status: 400 }
      );
    }

    // Check if old and new password are the same
    if (oldPassword === newPassword) {
      return NextResponse.json(
        { error: 'Password baru tidak boleh sama dengan password lama.' },
        { status: 400 }
      );
    }

    // Fetch employee from DB with password
    const { rows } = await query(
      `SELECT * FROM employees WHERE id = $1 LIMIT 1`,
      [userId]
    );
    const employee = rows[0];

    if (!employee) {
      return NextResponse.json(
        { error: 'User tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Validate old password
    let isOldPasswordValid = false;
    const storedPassword = employee.password;

    if (!storedPassword) {
      // Should not happen for active user
      return NextResponse.json({ error: 'Data password korup.' }, { status: 500 });
    }

    if (storedPassword.startsWith('$2')) {
      try {
        isOldPasswordValid = bcrypt.compareSync(oldPassword, storedPassword);
      } catch (e) {
        return NextResponse.json(
          { error: 'Error validasi password. Silakan coba lagi.' },
          { status: 500 }
        );
      }
    } else {
      // Legacy plain text fallback
      isOldPasswordValid = (oldPassword === storedPassword || oldPassword === `hashed_${storedPassword}`);
    }

    if (!isOldPasswordValid) {
      return NextResponse.json(
        { error: 'Password lama salah.' },
        { status: 401 }
      );
    }

    // Check if old and new password are the same
    if (oldPassword === newPassword) {
      return NextResponse.json(
        { error: 'Password baru tidak boleh sama dengan password lama.' },
        { status: 400 }
      );
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = bcrypt.hashSync(newPassword, saltRounds);

    // Update password in database
    await query(
      `UPDATE employees SET password = $1, must_change_password = false WHERE id = $2`,
      [hashedPassword, userId]
    );

    return NextResponse.json({
      success: true,
      message: 'Password berhasil diubah.'
    }, { status: 200 });

  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}

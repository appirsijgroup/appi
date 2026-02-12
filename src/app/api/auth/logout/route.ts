import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logout berhasil'
    })
    clearSessionCookie(response)
    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat logout' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Redirect to login page immediately
  const response = NextResponse.redirect(new URL('/login', request.url))
  clearSessionCookie(response)
  return response
}

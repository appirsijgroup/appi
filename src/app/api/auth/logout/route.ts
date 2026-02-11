import { NextRequest, NextResponse } from 'next/server'

// Helper to consistently clear cookies
function setLogoutCookies(response: NextResponse) {
  response.cookies.set('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  response.cookies.delete('userId')
  return response
}

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logout berhasil'
    })
    return setLogoutCookies(response)
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
  return setLogoutCookies(response)
}

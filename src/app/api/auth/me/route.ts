import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getEssentialEmployeeData } from '@/services/employeeServerService'

/**
 * MIGRATED to use local PostgreSQL connection.
 * Authentication check is done via JWT verification (getSession)
 * Data fetching is done via getFullEmployeeData (now uses local DB)
 */
export async function GET(request: NextRequest) {
  try {
    // Get secure session from HTTP-only cookie
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const userId = session.userId

    // Verify session validity via database check (optional but recommended for security)
    // to ensure user wasn't deleted or deactivated since token issuance
    const fullEmployeeData = await getEssentialEmployeeData(userId)

    if (!fullEmployeeData) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      )
    }

    // Additional Active Check
    if (fullEmployeeData.isActive === false) {
      return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
    }

    return NextResponse.json({ employee: fullEmployeeData })

  } catch (error) {
    console.error('❌ [/api/auth/me] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to get user data' },
      { status: 500 }
    )
  }
}

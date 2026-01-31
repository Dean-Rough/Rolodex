import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('rolodex_extension_session')
    const authenticated = Boolean(sessionCookie?.value)

    return NextResponse.json(
      {
        authenticated,
        profile: authenticated ? { name: 'Extension session' } : null
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    )
  } catch (error) {
    // Fallback for build-time static analysis
    return NextResponse.json({ authenticated: false, profile: null })
  }
}

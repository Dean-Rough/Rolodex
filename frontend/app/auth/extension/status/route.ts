import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sessionCookie = (await cookies()).get('rolodex_extension_session')
  const authenticated = Boolean(sessionCookie?.value)

  return NextResponse.json(
    {
      authenticated,
      profile: authenticated ? { name: 'Extension session' } : null
    },
    {
      headers: {
        'Cache-Control': 'no-store'
      }
    }
  )
}

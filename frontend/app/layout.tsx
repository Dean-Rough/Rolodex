import type { Metadata } from 'next'
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import Link from 'next/link'
import './globals.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Rolodex',
  description: 'FF&E product management for interior designers',
}

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

function Nav() {
  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-3">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-lg font-semibold text-gray-900">
          Rolodex
        </Link>
        <nav className="hidden sm:flex items-center gap-1">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            Library
          </Link>
          <Link
            href="/projects"
            className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            Projects
          </Link>
          <Link
            href="/capture"
            className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            Capture
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {clerkKey ? (
          <>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800">
                  Sign up
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </>
        ) : (
          <span className="text-xs text-gray-400">Auth not configured</span>
        )}
      </div>
    </header>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const content = (
    <html lang="en">
      <body className="font-sans">
        <Nav />
        {children}
      </body>
    </html>
  )

  if (!clerkKey) {
    return content
  }

  return <ClerkProvider>{content}</ClerkProvider>
}

import type { Metadata } from 'next'
import './globals.css'
import { QueryProvider } from '@/lib/query'
import { AuthProvider } from '@/lib/auth-context'

export const metadata: Metadata = {
  title: 'Rolodex',
  description: 'Personal knowledge management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <AuthProvider>
          <QueryProvider>{children}</QueryProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import './globals.css'
import { QueryProvider } from '@/lib/query'

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
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}

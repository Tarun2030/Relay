import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Relay — EA Management Platform',
  description: 'The EA platform for managing directors\' schedules, bookings, and projects.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}

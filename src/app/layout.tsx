import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'

import { Providers } from '@/providers'

import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'Asset Tracker', template: '%s | Asset Tracker' },
  description: "Track and manage your organization's physical assets.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} h-full`} suppressHydrationWarning>
      <body className="h-full font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

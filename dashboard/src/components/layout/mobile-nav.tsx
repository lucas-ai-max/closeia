'use client'

import Link from 'next/link'

export function MobileNav() {
  return (
    <div suppressHydrationWarning={true} className="md:hidden fixed top-0 left-0 right-0 z-20 bg-black border-b border-white/[0.05] px-4 py-3 flex items-center justify-between">
      <Link href="/dashboard" className="flex items-center text-white">
        <img src="/logo-closer-white.png" alt="HelpCloser" className="h-8 w-auto" />
      </Link>
      <Link
        href="/dashboard"
        className="text-sm font-semibold"
        style={{ color: '#ff007a' }}
      >
        Dashboard
      </Link>
    </div>
  )
}

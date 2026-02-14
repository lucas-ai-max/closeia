'use client'

import Link from 'next/link'

export function MobileNav() {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-20 bg-black border-b border-white/[0.05] px-4 py-3 flex items-center justify-between">
      <Link
        href="/"
        className="flex items-center gap-2 text-xl font-bold tracking-tight text-white"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: '#ff007a',
            boxShadow: '0 0 15px rgba(255,0,122,0.4)',
          }}
        >
          <span className="text-white font-bold text-lg">C</span>
        </div>
        CloseIA
      </Link>
      <Link
        href="/"
        className="text-sm font-semibold"
        style={{ color: '#ff007a' }}
      >
        Dashboard
      </Link>
    </div>
  )
}

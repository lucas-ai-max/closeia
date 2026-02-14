'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { label: 'Visão geral', href: '/' },
  { label: 'Chamadas', href: '/calls' },
  { label: 'Analytics', href: '/analytics' },
] as const

const NEON_PINK = '#ff007a'

export function DashboardHeader({
  title,
  className,
}: {
  title: string
  className?: string
}) {
  const pathname = usePathname()

  return (
    <header
      className={cn('flex items-center justify-between mb-8', className)}
    >
      <div className="relative w-96">
        <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
          search
        </span>
        <input
          type="text"
          placeholder="Buscar..."
          className="w-full bg-card-dark border-none rounded-2xl py-3 pl-12 pr-4 text-sm text-gray-300 placeholder:text-gray-500 focus:ring-1 focus:ring-neon-pink focus:outline-none"
        />
      </div>
      <nav className="flex items-center gap-8">
        {NAV_LINKS.map((link) => {
          const isActive =
            link.href === '/'
              ? pathname === '/'
              : pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm font-semibold pb-1 border-b-2 transition-colors',
                isActive
                  ? 'text-neon-pink border-neon-pink'
                  : 'text-gray-500 border-transparent hover:text-white'
              )}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'

const navSections = [
  {
    label: 'Home',
    items: [{ name: 'Dashboard', href: '/', icon: 'dashboard' }],
  },
  {
    label: 'App',
    items: [
      { name: 'Scripts', href: '/scripts', icon: 'description' },
      { name: 'Chamadas', href: '/calls', icon: 'call' },
      { name: 'Ao Vivo', href: '/live', icon: 'cell_tower' },
      { name: 'Analytics', href: '/analytics', icon: 'bar_chart' },
      { name: 'Equipe', href: '/team', icon: 'people' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { name: 'Configurações', href: '/settings', icon: 'settings' },
    ],
  },
] as const

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname.startsWith(href)
}

const NEON_PINK = '#ff007a'

export function Sidebar() {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { user } = useAuth()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayName =
    mounted && user?.user_metadata?.full_name
      ? user.user_metadata.full_name
      : mounted && user?.email?.split('@')[0]
        ? user.email.split('@')[0]
        : 'Usuário'
  const role = (mounted && user?.user_metadata?.role) ?? 'Membro'

  return (
    <aside
      className="w-64 shrink-0 bg-black border-r border-white/5 flex flex-col"
      style={{ borderColor: 'rgba(255,255,255,0.05)' }}
    >
      <div className="p-8 flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: NEON_PINK,
            boxShadow: `0 0 15px rgba(255,0,122,0.4)`,
          }}
        >
          <span className="text-white font-bold text-lg">C</span>
        </div>
        <span className="text-xl font-bold tracking-tight text-white">
          CloseIA
        </span>
      </div>
      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto scrollbar-hide">
        {navSections.map((section) => {
          const filteredItems = section.items.filter((item) => {
            if (role === 'SELLER') {
              if (['Scripts', 'Equipe', 'Ao Vivo'].includes(item.name))
                return false
            }
            return true
          })
          if (filteredItems.length === 0) return null
          return (
            <div key={section.label}>
              <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest first:pt-0">
                {section.label}
              </div>
              <div className="space-y-1">
                {filteredItems.map((item) => {
                  const isActive = isActivePath(pathname, item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors',
                        isActive
                          ? 'bg-neon-pink/10 text-neon-pink'
                          : 'text-gray-400 hover:text-white'
                      )}
                    >
                      <span className="material-icons-outlined text-[20px]">
                        {item.icon}
                      </span>
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <span
              className="text-sm font-bold"
              style={{ color: NEON_PINK }}
            >
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{displayName}</p>
            <p className="text-[10px] text-gray-500 truncate">{role}</p>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <Link
            href="/settings"
            className="text-gray-500 hover:text-neon-pink transition-colors flex items-center gap-1 text-xs"
          >
            <span className="material-icons-outlined text-[16px]">settings</span>
            Config
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1 text-xs"
          >
            <span className="material-icons-outlined text-[16px]">logout</span>
            Sair
          </button>
        </div>
      </div>
    </aside>
  )
}

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
    items: [
      { name: 'Dashboard', href: '/', icon: 'dashboard' },
    ],
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
    label: 'Conta',
    items: [
      { name: 'Configurações', href: '/settings', icon: 'settings' },
    ],
  },
] as const

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname.startsWith(href)
}

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

  // Prevent hydration mismatch by using default values during server render/first client render
  const displayName = mounted && user?.user_metadata?.full_name
    ? user.user_metadata.full_name
    : (mounted && user?.email?.split('@')[0] ? user.email.split('@')[0] : 'Usuário')

  const role = (mounted && user?.user_metadata?.role) ?? 'Membro'

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed h-full z-10">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xl">C</span>
        </div>
        <span className="text-xl font-bold tracking-tight">CloseIA</span>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
        {navSections.map((section) => {
          // Filter items based on role
          const filteredItems = section.items.filter(item => {
            if (role === 'SELLER') {
              // Sellers cannot see Scripts, Team, or Live View
              if (['Scripts', 'Equipe', 'Ao Vivo'].includes(item.name)) return false;
            }
            return true;
          });

          if (filteredItems.length === 0) return null;

          return (
            <div key={section.label}>
              <p className="px-2 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {section.label}
              </p>
              <div className="space-y-1">
                {filteredItems.map((item) => {
                  const isActive = isActivePath(pathname, item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors',
                        isActive
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-primary'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
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
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-semibold text-sm">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            <p className="text-xs text-slate-500 truncate">{role}</p>
          </div>
        </div>
        <div className="flex justify-between items-center px-2">
          <Link
            href="/settings"
            className="text-slate-500 hover:text-primary transition-colors flex items-center gap-1 text-sm"
          >
            <span className="material-icons-outlined text-[18px]">settings</span>
            Configurações
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="text-slate-500 hover:text-red-500 transition-colors flex items-center gap-1 text-sm"
          >
            <span className="material-icons-outlined text-[18px]">logout</span>
            Sair
          </button>
        </div>
      </div>
    </aside>
  )
}

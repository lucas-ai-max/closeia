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
    items: [{ name: 'Dashboard', href: '/dashboard', icon: 'dashboard' }],
  },
  {
    label: 'App',
    items: [
      { name: 'Chamadas', href: '/calls', icon: 'call' },
      { name: 'Ao Vivo', href: '/live', icon: 'cell_tower' },
      { name: 'Analytics', href: '/analytics', icon: 'bar_chart' },
      { name: 'Coaches', href: '/coaches', icon: 'psychology' },
      { name: 'Equipe', href: '/team', icon: 'people' },
      { name: 'Planos', href: '/billing', icon: 'credit_card' },
    ],
  },
] as const

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname.startsWith(href)
}

const NEON_PINK = '#ff007a'

export function Sidebar() {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { user } = useAuth()
  const [profile, setProfile] = useState<{
    full_name: string | null
    role: string | null
    email: string | null
    avatar_url: string | null
  } | null>(null)

  useEffect(() => {
    setMounted(true)
    if (user) {
      supabase
        .from('profiles')
        .select('full_name, role, email, avatar_url')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data)
        })
    }
  }, [user, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Only resolve user data after mount to prevent server/client divergence
  const displayName = mounted
    ? (profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário')
    : 'Usuário'
  const displayRole = mounted
    ? (profile?.role || user?.user_metadata?.role || 'Membro')
    : 'Membro'

  return (
    <aside
      suppressHydrationWarning={true}
      className="w-64 shrink-0 bg-black border-r border-white/5 flex flex-col"
      style={{ borderColor: 'rgba(255,255,255,0.05)' }}
    >
      <div className="p-8 flex items-center" suppressHydrationWarning={true}>
        <img src="/logo.svg" alt="HelpSeller" className="h-8 w-auto" />
      </div>

      {/* Navigation: render skeleton or real content based on mounted state */}
      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto scrollbar-hide" suppressHydrationWarning={true}>
        {!mounted ? (
          /* SKELETON STATE — identical on server & client initial render */
          <div className="space-y-6 pt-2" suppressHydrationWarning>
            {navSections.map((section) => (
              <div key={section.label} suppressHydrationWarning>
                <div className="pb-2 px-4 text-[10px] font-bold text-gray-700 uppercase tracking-widest" suppressHydrationWarning>
                  {section.label}
                </div>
                <div className="space-y-1" suppressHydrationWarning>
                  {section.items.map((item) => (
                    <div
                      key={item.name}
                      suppressHydrationWarning={true}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    >
                      <div className="w-5 h-5 rounded bg-white/5 animate-pulse" suppressHydrationWarning />
                      <div className="h-4 w-20 rounded bg-white/5 animate-pulse" suppressHydrationWarning />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* REAL CONTENT — only rendered after useEffect sets mounted=true */
          navSections.map((section) => {
            const filteredItems = section.items.filter((item) => {
              if (displayRole === 'SELLER') {
                if (['Scripts', 'Equipe', 'Ao Vivo', 'Coaches'].includes(item.name))
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
                        suppressHydrationWarning={true}
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
          })
        )}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-white/5 space-y-1" suppressHydrationWarning={true}>
        <Link
          href="/settings"
          suppressHydrationWarning={true}
          className="flex items-center gap-3 rounded-xl p-2 -m-2 hover:bg-white/5 transition-colors group"
        >
          <div className="flex items-center gap-3" suppressHydrationWarning>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden relative" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }} suppressHydrationWarning>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" suppressHydrationWarning />
              ) : (
                <span className="text-sm font-bold text-white" suppressHydrationWarning>
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-black" style={{ backgroundColor: '#ff007a' }} suppressHydrationWarning />
            </div>
            <div className="hidden md:block overflow-hidden" suppressHydrationWarning>
              <p className="text-sm font-bold text-white truncate max-w-[140px]" suppressHydrationWarning>
                {displayName.toUpperCase()}
              </p>
              <p className="text-[10px] text-gray-500 truncate" suppressHydrationWarning>{displayRole}</p>
            </div>
          </div>
          <span className="material-icons-outlined text-gray-500 text-[16px] group-hover:text-neon-pink transition-colors shrink-0">
            settings
          </span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-medium text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors"
        >
          <span className="material-icons-outlined text-[16px]">logout</span>
          Sair
        </button>
      </div>
    </aside>
  )
}

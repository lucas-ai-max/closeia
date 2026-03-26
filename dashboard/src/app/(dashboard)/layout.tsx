'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { DashboardContentGuard } from '@/components/dashboard-content-guard'
import { ProductTour } from '@/components/product-tour'
import { FeedbackWidget } from '@/components/feedback-widget'

function ActiveSessionBanner() {
  const [active, setActive] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const check = () => setActive(localStorage.getItem('helpcloser_session_active') === '1')
    check()
    const interval = setInterval(check, 1000)
    window.addEventListener('storage', check)
    return () => { clearInterval(interval); window.removeEventListener('storage', check) }
  }, [])

  if (!active) return null

  const isOnSession = pathname === '/session'

  return (
    <div className="bg-amber-500/90 text-black px-4 py-2 text-sm font-semibold flex items-center justify-between rounded-lg mb-4">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
        {isOnSession
          ? 'Sessão em andamento — não saia desta página enquanto a call estiver ativa.'
          : 'Sessão ativa — volte para /session ou a transcrição será interrompida.'}
      </div>
      {!isOnSession && (
        <a href="/session" className="bg-black/20 hover:bg-black/30 text-white px-3 py-1 rounded-md text-xs font-bold transition-colors">
          Voltar à sessão
        </a>
      )}
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="dark flex h-screen overflow-hidden bg-[#121212] text-white" suppressHydrationWarning={true}>
      {/* Neon ambient glows */}
      <div
        className="fixed top-0 right-0 w-[500px] h-[500px] pointer-events-none z-0"
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,0,122,0.06) 0%, transparent 70%)' }}
        aria-hidden
      />
      <div
        className="fixed bottom-0 left-60 w-[600px] h-[400px] pointer-events-none z-0"
        style={{ background: 'radial-gradient(ellipse at bottom left, rgba(0,209,255,0.04) 0%, transparent 70%)' }}
        aria-hidden
      />
      <div className="hidden md:flex relative z-10" suppressHydrationWarning={true}>
        <Sidebar />
      </div>
      <MobileNav />
      <main className="flex-1 overflow-y-auto scrollbar-hide p-8 min-h-screen pt-14 md:pt-8 relative z-10">
        <ActiveSessionBanner />
        <DashboardContentGuard>{children}</DashboardContentGuard>
      </main>
      <ProductTour />
      <FeedbackWidget />
    </div>
  )
}

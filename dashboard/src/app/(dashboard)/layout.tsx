import { Sidebar } from '@/components/layout/sidebar'
import { RightSidebar } from '@/components/layout/right-sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="dark flex h-screen overflow-hidden bg-[#121212] text-white">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <MobileNav />
      <main className="flex-1 overflow-y-auto scrollbar-hide p-8 min-h-screen pt-14 md:pt-8">
        {children}
      </main>
      <div className="hidden lg:flex">
        <RightSidebar />
      </div>
    </div>
  )
}

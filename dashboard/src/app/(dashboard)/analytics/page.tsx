import { DashboardHeader } from '@/components/layout/dashboard-header'
import { ObjectionAnalytics } from '@/components/analytics/objection-analytics'
import { SellerDashboard } from '@/components/analytics/seller-dashboard'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function AnalyticsPage() {
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function getRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile) setRole((profile as any).role)
      }
      setLoading(false)
    }
    getRole()
  }, [])

  if (loading) return <div className="p-8">Carregando analytics...</div>

  return (
    <>
      <DashboardHeader title="Analytics" />
      <div className="space-y-6">
        {role === 'SELLER' ? (
          <SellerDashboard stats={{}} />
        ) : (
          <div className="grid gap-4">
            <ObjectionAnalytics />
            {/* Future: Add more manager analytics here */}
          </div>
        )}
      </div>
    </>
  )
}

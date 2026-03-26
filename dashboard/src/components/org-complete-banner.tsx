'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Building2, X } from 'lucide-react'

const STORAGE_KEY = 'helpcloser_org_banner_dismissed'

export function OrgCompleteBanner() {
  const [show, setShow] = useState(false)
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    checkOrgIncomplete()
  }, [])

  async function checkOrgIncomplete() {
    if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1') {
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()
    const orgId = (profile as { organization_id: string | null; role: string } | null)?.organization_id
    const role = (profile as { organization_id: string | null; role: string } | null)?.role
    if (role !== 'MANAGER' || !orgId) return
    const { data: org } = await supabase
      .from('organizations')
      .select('document, phone, email, address')
      .eq('id', orgId)
      .single()
    if (!org) return
    const allEmpty =
      !(org as { document: string | null; phone: string | null; email: string | null; address: string | null }).document &&
      !(org as { document: string | null; phone: string | null; email: string | null; address: string | null }).phone &&
      !(org as { document: string | null; phone: string | null; email: string | null; address: string | null }).email &&
      !(org as { document: string | null; phone: string | null; email: string | null; address: string | null }).address
    if (allEmpty) setShow(true)
  }

  function dismiss() {
    setShow(false)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, '1')
  }

  if (!mounted || !show) return null

  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-sm text-gray-300"
      role="banner"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Building2 className="w-5 h-5 shrink-0 text-[#ff007a]" />
        <span className="truncate">
          Quem entrou com Google pode completar os dados da organização em{' '}
          <Link
            href="/settings"
            className="font-semibold text-[#ff007a] hover:underline"
          >
            Configurações
          </Link>
          .
        </span>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fechar"
        className="p-1 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

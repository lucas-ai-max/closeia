'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { CheckCircle2, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

const NEON_GREEN = '#00ff94'
const NEON_PINK = '#ff007a'

type VerifyStatus = 'verifying' | 'active' | 'error'

export default function BillingSuccessPage() {
  const [mounted, setMounted] = useState(false)
  const [status, setStatus] = useState<VerifyStatus>('verifying')
  const [planName, setPlanName] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const verifySession = useCallback(async () => {
    if (!sessionId) {
      setStatus('active')
      return
    }

    try {
      const res = await fetch('/api/billing/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })

      const data = await res.json()

      if (res.ok && (data.status === 'active' || data.status === 'activated')) {
        setPlanName(data.plan ?? null)
        setStatus('active')
      } else if (data.status === 'pending') {
        // Payment still processing, retry after 3s (max 3 retries handled by caller)
        return 'retry'
      } else {
        console.error('[BILLING_SUCCESS] Verify failed:', data)
        setStatus('error')
      }
    } catch (err) {
      console.error('[BILLING_SUCCESS] Verify error:', err)
      setStatus('error')
    }
    return 'done'
  }, [sessionId])

  useEffect(() => {
    setMounted(true)

    let retries = 0
    const maxRetries = 5

    async function tryVerify() {
      const result = await verifySession()
      if (result === 'retry' && retries < maxRetries) {
        retries++
        setTimeout(tryVerify, 3000)
      } else if (result === 'retry') {
        // After max retries, assume it worked (webhook might handle it)
        setStatus('active')
      }
    }

    tryVerify()
  }, [verifySession])

  if (!mounted || status === 'verifying') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: NEON_GREEN }} />
        <h1 className="text-2xl font-bold text-white mb-2">Ativando seu plano...</h1>
        <p className="text-gray-400">Verificando pagamento com o Stripe</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ backgroundColor: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.3)' }}
        >
          <AlertCircle className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Erro na ativação</h1>
        <p className="text-gray-400 max-w-md mb-8">
          Seu pagamento foi processado, mas houve um problema ao ativar o plano.
          Entre em contato com o suporte para resolver.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/billing"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: NEON_PINK }}
          >
            Ver meu plano
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ backgroundColor: `${NEON_GREEN}15`, border: `2px solid ${NEON_GREEN}30` }}
      >
        <CheckCircle2 className="w-10 h-10" style={{ color: NEON_GREEN }} />
      </div>
      <h1 className="text-3xl font-bold text-white mb-3">Assinatura ativada!</h1>
      <p className="text-gray-400 max-w-md mb-8">
        {planName
          ? `Seu plano ${planName} está ativo. Aproveite todos os recursos do HelpCloser.`
          : 'Seu pagamento foi confirmado e o plano já está ativo. Aproveite todos os recursos do HelpCloser.'
        }
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ backgroundColor: NEON_PINK }}
        >
          Ir para o dashboard <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/billing"
          className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
        >
          Ver meu plano
        </Link>
      </div>
    </div>
  )
}

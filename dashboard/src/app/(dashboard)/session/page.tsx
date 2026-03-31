'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useWebSession } from '@/hooks/use-web-session'
import { SessionConfigForm } from '@/components/session/session-config'
import { SessionPanel } from '@/components/session/session-panel'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import type { SessionConfig } from '@/hooks/use-web-session'

const NEON_PINK = '#ff007a'
const PIP_WIDTH = 380
const PIP_HEIGHT = 700

export default function SessionPage() {
  const { state, start, stop, dismissCoachMessage, reset } = useWebSession()
  const [pipOpen, setPipOpen] = useState(false)
  const popupRef = useRef<Window | null>(null)
  const checkRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup popup on unmount
  useEffect(() => {
    return () => {
      if (checkRef.current) clearInterval(checkRef.current)
      if (popupRef.current && !popupRef.current.closed) {
        try { popupRef.current.close() } catch {}
      }
    }
  }, [])

  const openPip = useCallback(async () => {
    // Use window.open popup — stable across all browsers
    // Document PiP API was removed because it closes on focus changes and rapid clicks
    const left = window.screenX + window.outerWidth - PIP_WIDTH - 40
    const top = window.screenY + 80
    const popup = window.open(
      `/session/live`,
      'helpcloser-session',
      `popup=yes,width=${PIP_WIDTH},height=${PIP_HEIGHT},left=${left},top=${top},resizable=yes,scrollbars=no,menubar=no,toolbar=no,location=no,status=no`
    )
    popupRef.current = popup
    setPipOpen(true)

    if (checkRef.current) clearInterval(checkRef.current)
    checkRef.current = setInterval(() => {
      if (!popup || popup.closed) {
        if (checkRef.current) clearInterval(checkRef.current)
        popupRef.current = null
        setPipOpen(false)
      }
    }, 500)
  }, [])

  const closePip = useCallback(() => {
    if (checkRef.current) clearInterval(checkRef.current)
    if (popupRef.current && !popupRef.current.closed) {
      try { popupRef.current.close() } catch {}
    }
    popupRef.current = null
    setPipOpen(false)
  }, [])

  const togglePip = useCallback(() => {
    if (pipOpen) closePip()
    else openPip()
  }, [pipOpen, openPip, closePip])

  const handleStart = useCallback(async (config: SessionConfig) => {
    await openPip()
    start(config)
  }, [start, openPip])

  const handleReset = useCallback(() => {
    closePip()
    reset()
  }, [closePip, reset])

  // Config screen
  if (state.status === 'idle') {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Sessão" />
        <div className="px-6 pb-6">
          <SessionConfigForm onStart={handleStart} />
        </div>
      </div>
    )
  }

  // Active / ending / ended / error
  return (
    <div className="min-h-screen">
      <DashboardHeader title="Sessão" />
      <div className="px-6 pb-6">
        {/* PiP toggle */}
        {(state.status === 'active' || state.status === 'connecting' || state.status === 'configuring') && (
          <div className="flex justify-end mb-3">
            <button
              onClick={togglePip}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border"
              style={{
                backgroundColor: pipOpen ? `${NEON_PINK}15` : 'rgba(255,255,255,0.05)',
                borderColor: pipOpen ? `${NEON_PINK}40` : 'rgba(255,255,255,0.05)',
                color: pipOpen ? NEON_PINK : '#999',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 4.5v5H3m-1-6 6 6m13 0v-3c0-1.16-.84-2-2-2h-7m-9 9v2c0 1.05.95 2 2 2h3" />
                <rect width="10" height="7" x="12" y="13.5" ry="2" />
              </svg>
              {pipOpen ? 'Popup Ativo (Sempre Visível)' : 'Abrir Popup Flutuante'}
            </button>
          </div>
        )}

        <SessionPanel
          state={state}
          onStop={stop}
          onDismissCoachMessage={dismissCoachMessage}
          onReset={handleReset}
        />
      </div>
    </div>
  )
}

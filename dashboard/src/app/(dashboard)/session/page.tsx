'use client'

import { useRef, useState, useCallback } from 'react'
import { useWebSession } from '@/hooks/use-web-session'
import { SessionConfigForm } from '@/components/session/session-config'
import { SessionPanel } from '@/components/session/session-panel'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import type { SessionConfig } from '@/hooks/use-web-session'

const NEON_PINK = '#ff007a'
const POPUP_WIDTH = 380
const POPUP_HEIGHT = 700

export default function SessionPage() {
  const { state, start, stop, dismissCoachMessage, reset } = useWebSession()
  const popupRef = useRef<Window | null>(null)
  const [popupOpen, setPopupOpen] = useState(false)

  const openPopup = useCallback((config?: SessionConfig) => {
    // Build query params
    const params = new URLSearchParams()
    if (config) {
      params.set('lead', config.leadName)
      if (config.scriptId) params.set('script', config.scriptId)
      if (config.coachId) params.set('coach', config.coachId)
    }

    const left = window.screenX + window.outerWidth - POPUP_WIDTH - 40
    const top = window.screenY + 80
    const popup = window.open(
      `/session/live?${params.toString()}`,
      'helpseller-session',
      `popup=yes,width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top},resizable=yes,scrollbars=no,menubar=no,toolbar=no,location=no,status=no`
    )
    popupRef.current = popup
    setPopupOpen(true)

    // Detect popup close
    const check = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(check)
        popupRef.current = null
        setPopupOpen(false)
      }
    }, 500)
  }, [])

  const closePopup = useCallback(() => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close()
    }
    popupRef.current = null
    setPopupOpen(false)
  }, [])

  const togglePopup = useCallback(() => {
    if (popupOpen && popupRef.current && !popupRef.current.closed) {
      closePopup()
    } else {
      openPopup()
    }
  }, [popupOpen, openPopup, closePopup])

  const handleStart = useCallback((config: SessionConfig) => {
    // Open popup FIRST (synchronous, in direct click context) to avoid browser blocking as tab
    openPopup(config)
    // Then start the async session (getDisplayMedia, WebSocket, etc.)
    start(config)
  }, [start, openPopup])

  const handleReset = useCallback(() => {
    closePopup()
    reset()
  }, [closePopup, reset])

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
        {/* Popup toggle */}
        {(state.status === 'active' || state.status === 'connecting' || state.status === 'configuring') && (
          <div className="flex justify-end mb-3">
            <button
              onClick={togglePopup}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border"
              style={{
                backgroundColor: popupOpen ? `${NEON_PINK}15` : 'rgba(255,255,255,0.05)',
                borderColor: popupOpen ? `${NEON_PINK}40` : 'rgba(255,255,255,0.05)',
                color: popupOpen ? NEON_PINK : '#999',
              }}
            >
              <span className="material-icons-outlined text-lg">
                {popupOpen ? 'picture_in_picture' : 'open_in_new'}
              </span>
              {popupOpen ? 'Popup Ativo' : 'Abrir Popup'}
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

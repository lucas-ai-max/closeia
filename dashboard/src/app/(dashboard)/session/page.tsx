'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useWebSession } from '@/hooks/use-web-session'
import { SessionConfigForm } from '@/components/session/session-config'
import { SessionPanel } from '@/components/session/session-panel'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { PipPopupContent } from '@/components/session/pip-popup-content'
import type { SessionConfig } from '@/hooks/use-web-session'

const NEON_PINK = '#ff007a'
const PIP_WIDTH = 380
const PIP_HEIGHT = 700

export default function SessionPage() {
  const { state, start, stop, dismissCoachMessage, reset } = useWebSession()
  const pipWindowRef = useRef<Window | null>(null)
  const [pipContainer, setPipContainer] = useState<HTMLElement | null>(null)
  const [pipOpen, setPipOpen] = useState(false)
  const fallbackPopupRef = useRef<Window | null>(null)

  // Cleanup PiP on unmount
  useEffect(() => {
    return () => {
      if (pipWindowRef.current) {
        try { pipWindowRef.current.close() } catch {}
      }
    }
  }, [])

  const openPip = useCallback(async () => {
    // Try Document Picture-in-Picture API first (always-on-top)
    if ('documentPictureInPicture' in window) {
      try {
        const pip = await (window as any).documentPictureInPicture.requestWindow({
          width: PIP_WIDTH,
          height: PIP_HEIGHT,
        })
        pipWindowRef.current = pip

        // Copy stylesheets to PiP window
        const styles = document.querySelectorAll('style, link[rel="stylesheet"]')
        styles.forEach(s => {
          try { pip.document.head.appendChild(s.cloneNode(true)) } catch {}
        })

        // Add base styles
        const baseStyle = pip.document.createElement('style')
        baseStyle.textContent = `
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #0a0a0a; color: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; overflow: hidden; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: ${NEON_PINK}40; border-radius: 4px; }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          @keyframes spin { to { transform: rotate(360deg); } }
          .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
          .animate-spin { animation: spin 1s linear infinite; }
        `
        pip.document.head.appendChild(baseStyle)

        // Create container for React portal
        const container = pip.document.createElement('div')
        container.id = 'pip-root'
        pip.document.body.appendChild(container)
        setPipContainer(container)
        setPipOpen(true)

        // Detect PiP close
        pip.addEventListener('pagehide', () => {
          pipWindowRef.current = null
          setPipContainer(null)
          setPipOpen(false)
        })

        return
      } catch {
        // PiP API failed, fall through to window.open
      }
    }

    // Fallback: regular popup
    const left = window.screenX + window.outerWidth - PIP_WIDTH - 40
    const top = window.screenY + 80
    const popup = window.open(
      `/session/live`,
      'helpcloser-session',
      `popup=yes,width=${PIP_WIDTH},height=${PIP_HEIGHT},left=${left},top=${top},resizable=yes,scrollbars=no,menubar=no,toolbar=no,location=no,status=no`
    )
    fallbackPopupRef.current = popup
    setPipOpen(true)

    const check = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(check)
        fallbackPopupRef.current = null
        setPipOpen(false)
      }
    }, 500)
  }, [])

  const closePip = useCallback(() => {
    if (pipWindowRef.current) {
      try { pipWindowRef.current.close() } catch {}
      pipWindowRef.current = null
      setPipContainer(null)
    }
    if (fallbackPopupRef.current && !fallbackPopupRef.current.closed) {
      fallbackPopupRef.current.close()
    }
    fallbackPopupRef.current = null
    setPipOpen(false)
  }, [])

  const togglePip = useCallback(() => {
    if (pipOpen) closePip()
    else openPip()
  }, [pipOpen, openPip, closePip])

  const handleStart = useCallback(async (config: SessionConfig) => {
    // Open PiP first, then start session
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

      {/* Render into PiP window via portal */}
      {pipContainer && createPortal(
        <PipPopupContent
          state={state}
          onDismiss={dismissCoachMessage}
          onStop={stop}
        />,
        pipContainer
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface TourStep {
  /** CSS selector or data-tour attribute value */
  target: string
  /** Title of the step */
  title: string
  /** Description text */
  description: string
  /** Which route this step requires (navigates if needed) */
  route?: string
  /** Position of tooltip relative to target */
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="logo"]',
    title: 'Bem-vindo ao HelpSeller!',
    description: 'Seu coach de vendas com IA em tempo real. Vamos fazer um tour rápido pelas funcionalidades da plataforma.',
    route: '/dashboard',
    position: 'right',
  },
  {
    target: '[data-tour="nav-dashboard"]',
    title: 'Dashboard',
    description: 'Visão geral do seu desempenho: total de chamadas, taxa de conversão, ranking de vendedores e gráficos de tendência.',
    route: '/dashboard',
    position: 'right',
  },
  {
    target: '[data-tour="nav-session"]',
    title: 'Sessão Web',
    description: 'Inicie uma sessão de coaching diretamente pelo navegador, sem precisar da extensão. Compartilhe a aba do Meet/Zoom e receba coaching em tempo real.',
    route: '/dashboard',
    position: 'right',
  },
  {
    target: '[data-tour="nav-calls"]',
    title: 'Chamadas',
    description: 'Histórico completo de todas as chamadas. Veja transcrições, resumos da IA, gravações e o resultado de cada call.',
    route: '/dashboard',
    position: 'right',
  },
  {
    target: '[data-tour="nav-live"]',
    title: 'Torre Ao Vivo',
    description: 'Monitore chamadas em andamento em tempo real. Veja a transcrição ao vivo, o vídeo da tela e envie mensagens de coaching (whisper) para o vendedor.',
    route: '/dashboard',
    position: 'right',
  },
  {
    target: '[data-tour="nav-analytics"]',
    title: 'Analytics',
    description: 'Análise avançada com KPIs detalhados: taxa de conversão por vendedor, objeções mais frequentes, tendências e ranking de performance.',
    route: '/dashboard',
    position: 'right',
  },
  {
    target: '[data-tour="nav-coaches"]',
    title: 'Coaches',
    description: 'Configure perfis de coaching IA: defina a persona, metodologia (SPIN, Challenger, etc.), tom de voz, produto e roteiro de vendas.',
    route: '/dashboard',
    position: 'right',
  },
  {
    target: '[data-tour="nav-team"]',
    title: 'Equipe',
    description: 'Gerencie seu time de vendedores. Adicione, remova e acompanhe o status de cada membro da equipe.',
    route: '/dashboard',
    position: 'right',
  },
  {
    target: '[data-tour="nav-billing"]',
    title: 'Planos e Cobrança',
    description: 'Gerencie seu plano, compre horas extras e acompanhe seu consumo. Veja faturas e altere seu método de pagamento.',
    route: '/dashboard',
    position: 'right',
  },
  {
    target: 'main',
    title: 'Área Principal',
    description: 'Aqui é onde o conteúdo de cada página aparece. Use o menu lateral para navegar entre as funcionalidades.',
    route: '/dashboard',
    position: 'left',
  },
  {
    target: '[data-tour="logo"]',
    title: 'Pronto para começar!',
    description: 'Você já conhece as funcionalidades do HelpSeller. Comece criando um Coach em "Coaches" e inicie sua primeira sessão em "Sessão". Boas vendas!',
    route: '/dashboard',
    position: 'right',
  },
]

const STORAGE_KEY = 'helpseller-tour-completed'

export function ProductTour() {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const tooltipRef = useRef<HTMLDivElement>(null)

  const completeTour = useCallback(() => {
    setIsActive(false)
    setCurrentStep(0)
    localStorage.setItem(STORAGE_KEY, 'true')
  }, [])

  // Check if tour should auto-start
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY)
    if (!completed && pathname === '/dashboard') {
      const timer = setTimeout(() => setIsActive(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [pathname])

  const findTarget = useCallback(() => {
    if (!isActive) return
    const step = TOUR_STEPS[currentStep]
    if (!step) return

    const el = document.querySelector(step.target)
    if (el) {
      const rect = el.getBoundingClientRect()
      setTargetRect(rect)
      setIsNavigating(false)
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    } else if (!isNavigating) {
      // Element doesn't exist (hidden by plan) — skip to next step
      if (currentStep < TOUR_STEPS.length - 1) {
        setCurrentStep((s) => s + 1)
      } else {
        completeTour()
      }
    }
  }, [isActive, currentStep, isNavigating, completeTour])

  useEffect(() => {
    findTarget()
    const interval = setInterval(findTarget, 500)
    window.addEventListener('resize', findTarget)
    window.addEventListener('scroll', findTarget, true)
    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', findTarget)
      window.removeEventListener('scroll', findTarget, true)
    }
  }, [findTarget])

  // Navigate to the correct route if needed
  useEffect(() => {
    if (!isActive) return
    const step = TOUR_STEPS[currentStep]
    if (step?.route && pathname !== step.route) {
      setIsNavigating(true)
      router.push(step.route)
    }
  }, [currentStep, isActive, pathname, router])

  const next = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1)
    } else {
      completeTour()
    }
  }, [currentStep, completeTour])

  const prev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1)
  }, [currentStep])

  const skipTour = useCallback(() => {
    completeTour()
  }, [completeTour])

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'Escape') skipTour()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isActive, next, prev, skipTour])

  if (!isActive || !targetRect) return null

  const step = TOUR_STEPS[currentStep]
  const pos = step.position || 'right'
  const padding = 8

  // Calculate spotlight cutout
  const spotlight = {
    top: targetRect.top - padding,
    left: targetRect.left - padding,
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2,
  }

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    const gap = 16
    const tooltipWidth = 360

    switch (pos) {
      case 'right':
        return {
          top: Math.max(16, spotlight.top),
          left: spotlight.left + spotlight.width + gap,
          maxWidth: tooltipWidth,
        }
      case 'left':
        return {
          top: Math.max(16, spotlight.top),
          left: Math.max(16, spotlight.left - tooltipWidth - gap),
          maxWidth: tooltipWidth,
        }
      case 'bottom':
        return {
          top: spotlight.top + spotlight.height + gap,
          left: Math.max(16, spotlight.left),
          maxWidth: tooltipWidth,
        }
      case 'top':
        return {
          top: Math.max(16, spotlight.top - 200),
          left: Math.max(16, spotlight.left),
          maxWidth: tooltipWidth,
        }
      default:
        return {
          top: spotlight.top,
          left: spotlight.left + spotlight.width + gap,
          maxWidth: tooltipWidth,
        }
    }
  }

  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100

  return (
    <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: 'auto' }}>
      {/* Dark overlay with spotlight cutout using CSS clip-path */}
      <div
        className="absolute inset-0 transition-all duration-300"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          clipPath: `polygon(
            0% 0%, 0% 100%,
            ${spotlight.left}px 100%,
            ${spotlight.left}px ${spotlight.top}px,
            ${spotlight.left + spotlight.width}px ${spotlight.top}px,
            ${spotlight.left + spotlight.width}px ${spotlight.top + spotlight.height}px,
            ${spotlight.left}px ${spotlight.top + spotlight.height}px,
            ${spotlight.left}px 100%,
            100% 100%, 100% 0%
          )`,
        }}
        onClick={skipTour}
      />

      {/* Spotlight border glow */}
      <div
        className="absolute rounded-xl transition-all duration-300 pointer-events-none"
        style={{
          top: spotlight.top,
          left: spotlight.left,
          width: spotlight.width,
          height: spotlight.height,
          boxShadow: '0 0 0 2px #ff007a, 0 0 20px rgba(255, 0, 122, 0.3)',
        }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute transition-all duration-300"
        style={{
          ...getTooltipStyle(),
          pointerEvents: 'auto',
        }}
      >
        <div
          className="rounded-2xl p-5 shadow-2xl border"
          style={{
            backgroundColor: '#1a1a1a',
            borderColor: 'rgba(255, 0, 122, 0.2)',
          }}
        >
          {/* Progress bar */}
          <div className="w-full h-1 rounded-full mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #ff007a, #00d1ff)',
              }}
            />
          </div>

          {/* Step counter */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#ff007a' }}>
              Passo {currentStep + 1} de {TOUR_STEPS.length}
            </span>
            <button
              onClick={skipTour}
              className="text-[10px] text-gray-500 hover:text-white transition-colors"
            >
              Pular tour
            </button>
          </div>

          {/* Content */}
          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <span className="material-icons-outlined text-[20px]" style={{ color: '#ff007a' }}>
              {currentStep === TOUR_STEPS.length - 1 ? 'celebration' : 'info'}
            </span>
            {step.title}
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed mb-4">
            {step.description}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={prev}
              disabled={currentStep === 0}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="material-icons-outlined text-[16px]">arrow_back</span>
              Anterior
            </button>

            <button
              onClick={next}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #ff007a, #cc0062)',
                boxShadow: '0 4px 15px rgba(255, 0, 122, 0.3)',
              }}
            >
              {currentStep === TOUR_STEPS.length - 1 ? 'Concluir' : 'Próximo'}
              <span className="material-icons-outlined text-[16px]">
                {currentStep === TOUR_STEPS.length - 1 ? 'check' : 'arrow_forward'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading indicator when navigating */}
      {isNavigating && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-[#ff007a] rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

/** Button to restart the tour manually */
export function TourButton() {
  const handleStart = () => {
    localStorage.removeItem(STORAGE_KEY)
    window.location.reload()
  }

  return (
    <button
      onClick={handleStart}
      className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
      title="Tour Guiado"
    >
      <span className="material-icons-outlined text-[14px]">help_outline</span>
    </button>
  )
}

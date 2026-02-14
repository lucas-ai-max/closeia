'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Mic,
  BarChart3,
  FileText,
  MessageSquare,
  Zap,
  Shield,
  CheckCircle2,
  ArrowRight,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  Headphones,
  Plus,
  Minus,
  Check,
  Clock,
  UserCheck,
  BookOpen,
} from 'lucide-react'
import { StarField } from '@/components/landing/star-field'
import { Container } from '@/components/landing/container'

const NEON_PINK = '#ff007a'
const NEON_BLUE = '#00d1ff'
const NEON_GREEN = '#00ff94'
const NEON_ORANGE = '#ff8a00'
const NEON_PURPLE = '#9d00ff'

const FEATURES = [
  {
    icon: Mic,
    title: 'Coaching em tempo real',
    description: 'A IA escuta cada palavra da chamada e sugere respostas na hora — no ouvido do vendedor. Seu time fecha mais sem precisar decorar script. Dicas contextuais, no momento certo.',
    color: NEON_PINK,
  },
  {
    icon: FileText,
    title: 'Scripts que se adaptam',
    description: 'Crie playbooks por etapa do funil, defina a personalidade da IA (estratégica, empática ou challenger) e o nível de intervenção. Um script para cada tipo de venda.',
    color: NEON_BLUE,
  },
  {
    icon: BarChart3,
    title: 'Métricas que importam',
    description: 'Taxa de conversão, objeções mais ouvidas, desempenho por vendedor e por script. Dashboard em tempo real para você tomar decisão com base em dado, não em feeling.',
    color: NEON_GREEN,
  },
  {
    icon: MessageSquare,
    title: 'Whisper para gestores',
    description: 'Envie dicas em tempo real para o vendedor durante a chamada — só ele ouve. Corrija rota, destaque oportunidade ou dê o próximo argumento sem o cliente perceber.',
    color: NEON_ORANGE,
  },
  {
    icon: Zap,
    title: 'Integração com sua stack',
    description: 'Conecte com sua plataforma de reuniões e CRM. Setup rápido, sem depender de time de engenharia. Você configura, a IA entra na chamada e começa a apoiar.',
    color: NEON_PURPLE,
  },
  {
    icon: Shield,
    title: 'Privacidade e segurança',
    description: 'Dados criptografados e uso ético de IA. Você decide o que é gravado e por quanto tempo. Conformidade e controle total sobre as informações da sua equipe e clientes.',
    color: NEON_BLUE,
  },
]

const BENEFIT_CARDS = [
  {
    icon: Clock,
    title: 'Menos tempo perdido',
    description: 'Treinamento genérico vira prática na chamada. Seu time aprende vendendo, não em sala.',
    color: NEON_ORANGE,
  },
  {
    icon: Headphones,
    title: 'Respostas na hora',
    description: 'Sem pausar a chamada. A IA sugere no ouvido do vendedor, no momento certo.',
    color: NEON_PINK,
  },
  {
    icon: BarChart3,
    title: 'Métricas reais',
    description: 'Por vendedor e por script. Decisão com base em dado, não em feeling.',
    color: NEON_GREEN,
  },
  {
    icon: UserCheck,
    title: 'Gestor ao vivo',
    description: 'Acompanhe a chamada e envie dicas em tempo real. Só o vendedor ouve.',
    color: NEON_BLUE,
  },
  {
    icon: BookOpen,
    title: 'Objeções mapeadas',
    description: 'Melhores respostas organizadas em um só lugar. O time sempre preparado.',
    color: NEON_PURPLE,
  },
]

const TRUST_NAMES = [
  'Startups',
  'Scale-ups',
  'Enterprise',
  'Revendas',
  'B2B',
  'SaaS',
  'Inside Sales',
  'Equipes remotas',
]

const PLANS = [
  {
    id: 'gratis',
    name: 'Grátis',
    price: 'R$ 0',
    period: '/mês',
    description: 'Para testar o CloseIA com seu time.',
    features: [
      'Até 3 vendedores',
      'Coaching em tempo real',
      'Até 50 chamadas/mês',
      'Scripts e objeções',
      'Suporte por e-mail',
    ],
    ctaText: 'Começar grátis',
    ctaLink: '/register?plan=gratis',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$ 497',
    period: '/mês',
    description: 'Para equipes que querem escalar vendas.',
    popular: true,
    features: [
      'Vendedores ilimitados',
      'Chamadas ilimitadas',
      'Whisper para gestores',
      'Métricas e dashboard',
      'Integrações (CRM, Meet)',
      'Suporte prioritário',
    ],
    ctaText: 'Assinar Pro',
    ctaLink: '/register?plan=pro',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Sob consulta',
    description: 'Para grandes operações e compliance.',
    features: [
      'Tudo do Pro',
      'SSO e SAML',
      'Gestor de sucesso dedicado',
      'SLA e conformidade',
      'On-premise ou VPC',
    ],
    ctaText: 'Falar com vendas',
    ctaLink: '/register?plan=enterprise',
  },
] as const

const FAQ_ITEMS = [
  {
    question: 'Posso testar antes de assinar?',
    answer: 'Sim. O plano Grátis não exige cartão de crédito e inclui coaching em tempo real e até 50 chamadas por mês. Você pode migrar para Pro ou Enterprise quando quiser.',
  },
  {
    question: 'Quais formas de pagamento vocês aceitam?',
    answer: 'Aceitamos cartões de crédito (Visa, Mastercard, Amex), PIX e boleto. Para Enterprise, também trabalhamos com fatura e transferência.',
  },
  {
    question: 'Posso mudar de plano depois?',
    answer: 'Sim. Você pode fazer upgrade ou downgrade a qualquer momento. Em upgrades, o valor é proporcional ao restante do período.',
  },
  {
    question: 'Os dados das chamadas são gravados?',
    answer: 'Você define o que será gravado e por quanto tempo. Tudo é criptografado e pode ser ajustado por política de privacidade da sua empresa.',
  },
  {
    question: 'Integra com Google Meet e Zoom?',
    answer: 'Sim. O CloseIA se integra com as principais plataformas de reunião e CRMs. O setup é feito em poucos minutos, sem depender de TI.',
  },
]

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

interface FeatureCardProps {
  feature: (typeof FEATURES)[number]
}

function FeatureCard({ feature }: FeatureCardProps) {
  const [mousePercent, setMousePercent] = useState({ x: 50, y: 50 })
  const { r, g, b } = hexToRgb(feature.color)
  const glowSoft = `rgba(${r},${g},${b},0.1)`
  const glowStrong = `rgba(${r},${g},${b},0.25)`

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setMousePercent({ x, y })
  }

  const Icon = feature.icon
  return (
    <div
      className="group relative flex flex-col p-8 rounded-2xl bg-[#14151A]/60 backdrop-blur-sm border border-[#2A2A2A] hover:bg-[#18191F]/80 transition-colors duration-500 cursor-pointer overflow-hidden ring-1 ring-white/5"
      onMouseMove={handleMouseMove}
    >
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(650px circle at ${mousePercent.x}% ${mousePercent.y}%, ${glowSoft}, transparent 80%)`,
        }}
      />
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(600px circle at ${mousePercent.x}% ${mousePercent.y}%, ${glowStrong}, transparent 40%)`,
        }}
      />
      <div className="relative z-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl mb-6 border border-[#2A2A2A] bg-[#1E1F25] transition-all duration-500 group-hover:scale-110 shadow-lg shadow-black/20">
          <Icon className="h-6 w-6 opacity-60 transition-opacity duration-300 group-hover:opacity-100" style={{ color: feature.color }} />
        </div>
        <h3 className="text-lg font-medium text-white mb-2 flex items-center gap-2 tracking-tight group-hover:text-white transition-colors">
          {feature.title}
          <ArrowRight className="w-4 h-4 text-neon-pink opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 shrink-0" />
        </h3>
        <p className="text-[15px] text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">
          {feature.description}
        </p>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (mobileMenuOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  return (
    <main className="min-h-screen bg-[#0B0C10] text-white selection:bg-neon-pink/30">
      {/* Navbar — estilo NovaFlow */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled || mobileMenuOpen ? 'bg-[#0B0C10]/90 backdrop-blur-md border-b border-[#2A2A2A]' : 'bg-transparent'
        }`}
      >
        <Container className="flex items-center justify-between h-[72px]">
          <Link href="/" className="group flex items-center gap-3 font-medium text-lg z-50">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 text-white font-bold text-sm"
              style={{ backgroundColor: NEON_PINK, boxShadow: '0 0 16px rgba(255,0,122,0.4)' }}
            >
              C
            </div>
            <span className="font-bold tracking-tight">CloseIA</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Recursos</a>
            <a href="#benefits" className="hover:text-white transition-colors">Benefícios</a>
            <a href="#planos" className="hover:text-white transition-colors">Planos</a>
            <a href="#how" className="hover:text-white transition-colors">Como funciona</a>
          </nav>
          <div className="flex items-center gap-5">
            <div className="hidden md:flex items-center gap-5">
              <Link href="/login" className="text-[15px] font-medium text-gray-400 hover:text-white transition-colors">
                Entrar
              </Link>
              <Link
                href="/register"
                className="h-9 px-5 rounded-full text-[14px] font-medium text-white transition-all duration-300 hover:opacity-90 hover:scale-105 inline-flex items-center justify-center"
                style={{ backgroundColor: NEON_PINK, boxShadow: '0 0 20px -3px rgba(255,0,122,0.4)' }}
              >
                Começar grátis
              </Link>
            </div>
            <button
              type="button"
              className="md:hidden text-white p-2 -mr-2 z-50"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </Container>
        {mobileMenuOpen && (
          <div className="md:hidden fixed top-0 left-0 right-0 min-h-screen z-40 bg-[#0B0C10]/95 backdrop-blur-lg pt-[72px] px-4 pb-8 overflow-y-auto border-t border-[#2A2A2A]">
            <nav className="flex flex-col gap-2 p-4">
              <a href="#features" className="block text-lg font-medium py-3 border-b border-white/10 hover:text-neon-pink transition-colors" onClick={() => setMobileMenuOpen(false)}>Recursos</a>
              <a href="#benefits" className="block text-lg font-medium py-3 border-b border-white/10 hover:text-neon-pink transition-colors" onClick={() => setMobileMenuOpen(false)}>Benefícios</a>
              <a href="#planos" className="block text-lg font-medium py-3 border-b border-white/10 hover:text-neon-pink transition-colors" onClick={() => setMobileMenuOpen(false)}>Planos</a>
              <a href="#how" className="block text-lg font-medium py-3 border-b border-white/10 hover:text-neon-pink transition-colors" onClick={() => setMobileMenuOpen(false)}>Como funciona</a>
              <Link href="/login" className="block text-lg font-medium py-3 border-b border-white/10 hover:text-neon-pink transition-colors" onClick={() => setMobileMenuOpen(false)}>Entrar</Link>
              <Link
                href="/register"
                className="mt-4 py-3 rounded-xl text-center font-semibold text-white"
                style={{ backgroundColor: NEON_PINK }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Começar grátis
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Hero — estilo NovaFlow */}
      <section className="relative pt-40 pb-24 overflow-hidden">
        <StarField />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full pointer-events-none opacity-[0.25] blur-[120px]" style={{ backgroundColor: NEON_PINK }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[350px] h-[350px] rounded-full pointer-events-none opacity-[0.2] blur-[150px]" style={{ backgroundColor: NEON_BLUE }} />
        <Container className="relative z-10 flex flex-col items-center text-center">
          <h1 className="text-5xl md:text-7xl font-semibold text-white mb-6 max-w-4xl leading-[1.1] tracking-tight">
            Potencialize suas <span className="text-transparent bg-clip-text bg-linear-to-r from-neon-pink to-neon-blue">vendas</span>
            <br />
            com coaching em tempo real
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed">
            A IA escuta a chamada, sugere as melhores respostas na hora e entrega métricas reais.
            Seu time vende mais. Você acompanha tudo — ao vivo ou no relatório.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto">
            <Link
              href="/register"
              className="gap-2 rounded-full px-8 h-12 text-base font-semibold text-white inline-flex items-center justify-center w-full sm:w-auto transition-all duration-300 hover:opacity-90 hover:scale-[1.02]"
              style={{ backgroundColor: NEON_PINK, boxShadow: '0 0 24px -5px rgba(255,0,122,0.4)' }}
            >
              Criar conta grátis <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="rounded-full px-8 h-12 text-base font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-white inline-flex items-center justify-center w-full sm:w-auto backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]"
            >
              Já tenho conta
            </Link>
          </div>
          <p className="mt-8 text-sm text-gray-500 font-medium">Sem cartão de crédito. Configure em minutos.</p>
          {/* Mock: chamada + sugestão IA */}
          <div className="mt-20 w-full max-w-2xl rounded-xl border border-[#2A2A2A] bg-[#0B0C10]/80 backdrop-blur-xl shadow-2xl overflow-hidden ring-1 ring-white/5">
            <div className="h-11 border-b border-[#2A2A2A] bg-[#14151A]/90 flex items-center px-4 gap-2">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#292929]" />
                <div className="w-3 h-3 rounded-full bg-[#292929]" />
                <div className="w-3 h-3 rounded-full bg-[#292929]" />
              </div>
              <span className="mx-auto text-xs font-mono text-gray-500">Chamada ao vivo • CloseIA</span>
            </div>
            <div className="p-4 space-y-3 bg-[#111216]/50">
              <div className="flex items-start gap-3">
                <Headphones className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-400">Cliente: &quot;O preço está acima do que a gente tinha em mente...&quot;</p>
              </div>
              <div className="flex items-start gap-3 pl-2 border-l-2 border-neon-pink/50">
                <Sparkles className="w-4 h-4 text-neon-pink shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-neon-pink mb-0.5">Sugestão da IA</p>
                  <p className="text-sm text-white">Mencione o desconto para fidelidade e o ROI em 6 meses.</p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* TrustBar — marquee estilo NovaFlow */}
      <section className="py-24 overflow-hidden relative border-y border-[#1F2026]">
        <Container>
          <p className="text-center text-sm text-gray-500 mb-12 font-medium tracking-[0.2em] uppercase opacity-60">
            Confiado por equipes de vendas em
          </p>
          <div className="relative w-full overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-linear-to-r from-[#0B0C10] via-[#0B0C10]/80 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-linear-to-l from-[#0B0C10] via-[#0B0C10]/80 to-transparent z-10 pointer-events-none" />
            <div className="flex overflow-hidden">
              <div className="landing-marquee flex items-center gap-16 pr-16 whitespace-nowrap">
                {[...TRUST_NAMES, ...TRUST_NAMES].map((name, i) => (
                  <span key={`${name}-${i}`} className="text-2xl md:text-3xl font-bold text-[#333] hover:text-white transition-colors duration-500 cursor-default select-none tracking-tight">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section id="how" className="py-20">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Como funciona</h2>
            <p className="mt-4 text-gray-500 leading-relaxed">
              Você cadastra seus scripts e objeções. O vendedor entra na chamada com o app aberto.
              A IA escuta em tempo real, sugere respostas e dicas no ouvido dele e registra o que importa.
              No dashboard, você vê métricas, gravações e oportunidades de melhoria.
            </p>
          </div>
        </Container>
      </section>

      {/* Features — Engineered for High-Performance style (NovaFlow) */}
      <section id="features" className="py-32">
        <Container>
          <div className="flex items-center gap-4 mb-6 max-w-xs mx-auto">
            <div className="h-px flex-1 bg-linear-to-r from-transparent to-[#2A2A2A]" />
            <span className="text-xs font-semibold text-neon-pink uppercase tracking-widest px-3 py-1 border border-neon-pink/20 rounded-full bg-neon-pink/5 shadow-[0_0_10px_-3px_rgba(255,0,122,0.2)]">
              Plataforma
            </span>
            <div className="h-px flex-1 bg-linear-to-l from-transparent to-[#2A2A2A]" />
          </div>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl md:text-6xl font-semibold text-white mb-6 tracking-tighter leading-[1.1]">
              Feito para{' '}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-neon-pink to-neon-blue">
                equipes que vendem mais
              </span>
            </h2>
            <p className="text-xl text-gray-500 leading-relaxed">
              O kit completo para eliminar treinamento genérico e fechar mais negócios com confiança. Scripts, métricas, whisper e IA no mesmo lugar.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        </Container>
      </section>

      {/* ProductDetails — 2 blocos estilo NovaFlow adaptados */}
      <section className="py-32 overflow-hidden">
        <Container>
          <div className="flex flex-col md:flex-row items-center gap-20">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-pink/10 text-neon-pink text-xs font-medium mb-6 border border-neon-pink/20 shadow-[0_0_15px_-3px_rgba(255,0,122,0.3)]">
                <Sparkles className="w-3 h-3" /> IA na chamada
              </div>
              <h2 className="text-4xl md:text-5xl font-semibold text-white mb-6 leading-[1.1] tracking-tight">
                Colabore com sua <span className="text-transparent bg-clip-text bg-linear-to-r from-neon-pink to-neon-blue">IA de vendas</span>
              </h2>
              <p className="text-lg text-gray-500 mb-8 leading-relaxed max-w-lg">
                O CloseIA não só escuta; entende o contexto. Sugere respostas na hora, trata objeções e desbloqueia seu time em tempo real.
              </p>
              <Link href="/register" className="inline-flex items-center gap-2 h-11 px-6 rounded-full border border-white/10 bg-white/2 hover:bg-white/5 hover:border-white/20 text-white text-sm font-medium transition-all">
                Começar agora <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex-1 w-full relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-neon-pink opacity-[0.08] blur-[120px] -z-10" />
              <div className="rounded-2xl border border-[#2A2A2A] bg-[#121317]/80 backdrop-blur-xl p-6 shadow-2xl ring-1 ring-white/5 overflow-hidden">
                <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                  <div className="flex gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-[10px] font-mono text-gray-500">CloseIA • Chamada</span>
                </div>
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-neon-pink to-neon-blue/80 flex items-center justify-center shrink-0 shadow-lg shadow-neon-pink/20">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="space-y-3 flex-1 max-w-[90%]">
                    <div className="bg-[#1F2026] border border-[#2A2A2A] rounded-2xl rounded-tl-sm p-4 text-[13px] text-white leading-relaxed">
                      Sugestão: &quot;Podemos parcelar em 12x sem juros. Quer que eu já reserve essa condição?&quot;
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="px-3 py-1.5 bg-neon-pink/10 hover:bg-neon-pink/20 text-neon-pink border border-neon-pink/20 text-xs font-medium rounded-full transition-all cursor-pointer">
                        Usar sugestão
                      </button>
                      <button type="button" className="px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#333] text-gray-500 hover:text-white text-xs font-medium rounded-full transition-colors border border-[#3A3A3A]">
                        Ignorar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-32">
        <Container>
          <div className="flex flex-col md:flex-row-reverse items-center gap-20">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-green/10 text-neon-green text-xs font-medium mb-6 border border-neon-green/20">
                <BarChart3 className="w-3 h-3" /> Dashboard
              </div>
              <h2 className="text-4xl md:text-5xl font-semibold text-white mb-6 leading-[1.1] tracking-tight">
                Métricas em <span className="text-transparent bg-clip-text bg-linear-to-r from-neon-green to-emerald-400">tempo real</span>
              </h2>
              <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                Taxa de conversão, objeções mais ouvidas e desempenho por vendedor. Tome decisões com base em dado, não em feeling.
              </p>
              <Link href="/register" className="inline-flex items-center gap-2 h-11 px-6 rounded-full border border-white/10 bg-white/2 hover:bg-white/5 text-white text-sm font-medium transition-all">
                Ver dashboard <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex-1 w-full">
              <div className="rounded-xl border border-[#2A2A2A] bg-[#111216] overflow-hidden shadow-2xl ring-1 ring-white/5">
                <div className="h-10 border-b border-[#2A2A2A] flex items-center bg-[#16171C] px-4">
                  <span className="text-xs text-gray-500 font-mono">Métricas • Este mês</span>
                </div>
                <div className="p-6 flex items-end gap-2 h-32">
                  {[65, 80, 45, 90, 70, 85].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t bg-[#2A2A2A] transition-all hover:bg-neon-green/50" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Benefits — estilo TechSpecs + cards (referência NovaFlow) */}
      <section id="benefits" className="py-24 border-y border-[#2A2A2A] bg-[#0F1014]">
        <Container>
          <div className="flex items-center gap-4 mb-6 max-w-xs mx-auto">
            <div className="h-px flex-1 bg-linear-to-r from-transparent to-[#2A2A2A]" />
            <span className="text-xs font-semibold text-neon-green uppercase tracking-widest px-3 py-1 border border-neon-green/20 rounded-full bg-neon-green/5">
              Benefícios
            </span>
            <div className="h-px flex-1 bg-linear-to-l from-transparent to-[#2A2A2A]" />
          </div>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-semibold text-white mb-4 tracking-tight">
              Por que usar o <span className="text-transparent bg-clip-text bg-linear-to-r from-neon-pink to-neon-blue">CloseIA</span>?
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed">
              Menos treinamento genérico, mais resultado na ponta. Seu time vende melhor e você acompanha tudo.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {BENEFIT_CARDS.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className="group p-6 rounded-2xl bg-[#14151A] border border-[#2A2A2A] hover:border-white/10 transition-all duration-300"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl mb-4 border border-[#2A2A2A] bg-[#1E1F25] group-hover:border-[#2A2A2A] transition-colors"
                    style={{ color: item.color, boxShadow: `0 0 20px -5px ${item.color}40` }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
                </div>
              )
            })}
          </div>
        </Container>
      </section>

      {/* Planos */}
      <section id="planos" className="py-24 border-t border-[#2A2A2A]">
        <Container>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Planos que cabem no seu time
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Comece grátis. Escale quando precisar. Sem surpresas na fatura.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-300 ${
                  plan.popular
                    ? 'border-neon-pink bg-[#14151A]/80 ring-1 ring-neon-pink/30 shadow-[0_0_40px_-10px_rgba(255,0,122,0.2)]'
                    : 'border-[#2A2A2A] bg-[#14151A]/60 hover:border-white/10'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold bg-neon-pink text-white">
                    Mais popular
                  </span>
                )}
                <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  {plan.period && <span className="text-gray-500">{plan.period}</span>}
                </div>
                <p className="mt-2 text-sm text-gray-500">{plan.description}</p>
                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-400">
                      <Check className="w-4 h-4 shrink-0 text-neon-green" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.ctaLink}
                  className={`mt-8 w-full inline-flex items-center justify-center rounded-xl py-3 text-sm font-semibold transition-all ${
                    plan.popular
                      ? 'bg-neon-pink text-white hover:opacity-90 shadow-[0_0_20px_-5px_rgba(255,0,122,0.4)]'
                      : 'border border-[#2A2A2A] bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  {plan.ctaText}
                </Link>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 border-t border-[#2A2A2A]">
        <Container>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Perguntas frequentes
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Tudo o que você precisa saber sobre o CloseIA e os planos.
            </p>
          </div>
          <div className="max-w-3xl mx-auto divide-y divide-[#2A2A2A] border-y border-[#2A2A2A]">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="group">
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                  className="w-full flex items-center justify-between py-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-pink rounded"
                  aria-expanded={openFaqIndex === i}
                  aria-controls={`faq-answer-${i}`}
                >
                  <span className="font-medium text-white text-lg pr-4 group-hover:text-neon-pink transition-colors">
                    {item.question}
                  </span>
                  <span className="shrink-0 text-gray-500 group-hover:text-neon-pink transition-colors">
                    {openFaqIndex === i ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </span>
                </button>
                {openFaqIndex === i && (
                  <div id={`faq-answer-${i}`} className="pb-6 text-gray-500 leading-relaxed" role="region">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-24 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none opacity-[0.18] blur-[140px]" style={{ backgroundColor: NEON_PINK }} />
        <Container>
          <div className="relative rounded-3xl border p-12 text-center md:p-16 overflow-hidden ring-1 ring-white/5 shadow-2xl bg-[#0B0C10] border-[#2A2A2A]">
          <div className="landing-grid-bg absolute inset-0 opacity-20" aria-hidden />
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Pronto para <span className="text-transparent bg-clip-text bg-linear-to-r from-neon-pink to-neon-blue">vender mais</span>?
            </h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto leading-relaxed">
              Crie sua conta em minutos. Sem cartão de crédito.
              Configure seus primeiros scripts e comece a treinar seu time com IA.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-semibold text-white transition-opacity hover:opacity-90"
              style={{
                backgroundColor: NEON_PINK,
                boxShadow: '0 0 28px rgba(255,0,122,0.35)',
              }}
            >
              Começar agora
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
          </div>
        </Container>
      </section>

      {/* Footer — multi-coluna estilo NovaFlow */}
      <footer className="bg-[#0B0C10] pt-32 pb-12 border-t border-[#2A2A2A]">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-16">
            <div className="col-span-2 md:col-span-2">
              <Link href="/" className="flex items-center gap-2 text-white font-medium mb-6 text-lg">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: NEON_PINK, boxShadow: '0 0 12px rgba(255,0,122,0.3)' }}>C</div>
                <span className="font-semibold tracking-tight">CloseIA</span>
              </Link>
              <p className="text-sm text-gray-500 max-w-xs">Coaching de vendas powered by IA. Seu time vende mais.</p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-4">Produto</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><a href="#features" className="hover:text-white transition-colors">Recursos</a></li>
                <li><a href="#benefits" className="hover:text-white transition-colors">Benefícios</a></li>
                <li><a href="#planos" className="hover:text-white transition-colors">Planos</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#how" className="hover:text-white transition-colors">Como funciona</a></li>
                <li><Link href="/register" className="hover:text-white transition-colors">Começar grátis</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-4">Empresa</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><a href="#" className="hover:text-white transition-colors">Sobre</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Entrar</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Termos</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 text-xs text-gray-500">
            © {new Date().getFullYear()} CloseIA. Todos os direitos reservados.
          </div>
        </Container>
      </footer>
    </main>
  )
}

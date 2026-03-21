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
  AlertTriangle,
  EyeOff,
  Target,
  Quote,
  Compass,
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
    title: 'A IA sussurra a resposta certa',
    description: 'Enquanto o cliente fala, a IA já mostra na tela do vendedor o que dizer. Ele nunca mais trava, nunca mais improvisa. Responde com segurança — como se tivesse anos de experiência.',
    color: NEON_PINK,
  },
  {
    icon: MessageSquare,
    title: 'Gestor na call sem o cliente saber',
    description: 'Você entra na chamada do seu vendedor, ouve tudo e manda dicas que só ele vê. Corrige a rota na hora, sem o cliente perceber. Como ter um coach invisível do lado.',
    color: NEON_ORANGE,
  },
  {
    icon: Compass,
    title: 'Guia o vendedor passo a passo',
    description: 'A IA mostra em que momento da conversa o vendedor está e qual a próxima pergunta ideal. Ele segue o caminho certo até o fechamento — sem pular etapas.',
    color: NEON_GREEN,
  },
  {
    icon: FileText,
    title: 'Roteiros prontos para cada situação',
    description: 'Crie roteiros diferentes para cada tipo de venda — prospecção, demonstração, renovação. A IA usa o roteiro certo automaticamente e adapta as sugestões ao contexto da conversa.',
    color: NEON_BLUE,
  },
  {
    icon: BarChart3,
    title: 'Veja onde seu time está perdendo vendas',
    description: 'Descubra quais objeções mais aparecem, quem converte mais e onde cada vendedor trava. Números claros para você tomar decisões — sem depender de achismo.',
    color: NEON_PURPLE,
  },
  {
    icon: Zap,
    title: 'Funciona em 2 minutos, sem instalar nada',
    description: 'Acesse pelo navegador, faça login e comece. Funciona com Google Meet, Zoom e qualquer chamada online. Seu vendedor configura sozinho — sem precisar de equipe técnica.',
    color: NEON_BLUE,
  },
]

const BENEFIT_CARDS = [
  {
    icon: Clock,
    title: 'Treina vendendo, não em sala',
    description: 'Seu vendedor aprende no momento que importa — durante a chamada real, com cliente real.',
    color: NEON_ORANGE,
  },
  {
    icon: Headphones,
    title: 'Nunca mais trava na call',
    description: 'A resposta aparece na tela antes que o cliente perceba a hesitação. Zero silêncio constrangedor.',
    color: NEON_PINK,
  },
  {
    icon: BarChart3,
    title: 'Saiba exatamente onde melhorar',
    description: 'Veja quem converte mais, quais objeções aparecem e onde cada vendedor precisa de ajuda.',
    color: NEON_GREEN,
  },
  {
    icon: UserCheck,
    title: 'Acompanhe sem atrapalhar',
    description: 'Entre na chamada do vendedor e mande dicas em tempo real. Só ele vê. O cliente nem sabe.',
    color: NEON_BLUE,
  },
  {
    icon: BookOpen,
    title: 'Respostas prontas para objeções',
    description: 'Cadastre as objeções do seu mercado e as melhores respostas. A IA entrega na hora certa.',
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

const TRUST_STATS = [
  { value: '+12.000', label: 'chamadas analisadas' },
  { value: '+38%', label: 'aumento médio na conversão' },
  { value: '2min', label: 'para o primeiro coaching' },
  { value: 'R$397', label: 'para começar (2 vendedores)' },
]

const PAIN_CARDS = [
  {
    icon: AlertTriangle,
    title: 'O silêncio que custa negócios',
    description: 'Vendedores travam em objeções de preço, prazo e concorrência. 3 segundos de hesitação destroem a credibilidade conquistada em 30 minutos de call.',
    color: NEON_PINK,
  },
  {
    icon: EyeOff,
    title: 'Gestor cego sobre o que acontece',
    description: 'Você só descobre o que saiu errado depois — no CRM, na reunião de pipeline, ou quando o cliente some. Tarde demais para corrigir a rota.',
    color: NEON_ORANGE,
  },
  {
    icon: Target,
    title: 'Treinamento que não vira prática',
    description: 'Sala de treinamento é diferente de call real com cliente real. Seu time sai motivado e volta ao mesmo comportamento em 48 horas.',
    color: NEON_PURPLE,
  },
]

const TESTIMONIALS = [
  {
    quote: 'Meu vendedor mais novo fechou o mesmo volume que o sênior no primeiro mês de uso. A IA basicamente colocou 3 anos de experiência no ouvido dele.',
    name: 'Rafael B.',
    role: 'Head de Vendas, SaaS B2B',
    location: 'São Paulo',
  },
  {
    quote: 'Testei o Gong e o Aircover. Os dois são caros demais pro nosso tamanho e em inglês. O HelpSeller faz tudo que preciso, em português, a um décimo do preço.',
    name: 'Ana M.',
    role: 'Diretora Comercial, Scale-up',
    location: 'BH',
  },
  {
    quote: 'O Whisper mudou tudo pra mim como gestor. Eu entro na call, ouço onde o vendedor está travando e mando a dica certa. Ele responde com confiança. O cliente não sabe de nada.',
    name: 'Lucas C.',
    role: 'Gerente de Inside Sales, Consultoria',
    location: 'Curitiba',
  },
]

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'R$ 397',
    period: '/mês',
    description: 'Para duplas e trios que querem fechar mais, agora.',
    trial: '7 dias grátis',
    features: [
      '2 vendedores',
      '15h de calls/mês (compartilhadas)',
      'Coaching IA em tempo real',
      'Detecção de objeções',
      'Indicador de fase SPIN',
      'Dashboard básico',
    ],
    extra: 'R$ 10 por hora adicional',
    ctaText: 'Começar agora',
    ctaLink: '/register?plan=starter',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$ 897',
    period: '/mês',
    description: 'Para times estruturados que querem escalar com dados.',
    popular: true,
    features: [
      '5 vendedores',
      '60h de calls/mês (compartilhadas)',
      'Coaching IA em tempo real',
      'Histórico de chamadas',
      'Resumo automático pós-call',
      'Análise completa da chamada',
      'Analytics avançado',
      'Ranking de vendedores',
      'Dashboard manager',
      'Reprocessamento de análise',
    ],
    extra: 'R$ 9 por hora adicional',
    ctaText: 'Assinar Pro',
    ctaLink: '/register?plan=pro',
  },
  {
    id: 'team',
    name: 'Team',
    price: 'R$ 1.997',
    period: '/mês',
    description: 'Para times maiores com visibilidade total em tempo real.',
    features: [
      '10 vendedores',
      '150h de calls/mês (compartilhadas)',
      'Torre de comando ao vivo',
      'Manager Whisper',
      'Coaching IA em tempo real',
      'Análise avançada de chamadas',
      'KPIs e analytics avançados',
      'Histórico completo',
      'Gestão de equipe',
    ],
    extra: 'R$ 8 por hora adicional',
    ctaText: 'Assinar Team',
    ctaLink: '/register?plan=team',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Personalizado',
    period: '',
    description: 'Plano 100% adaptado à operação da sua empresa.',
    features: [
      'Vendedores ilimitados',
      'Horas de calls sob demanda',
      'Todas as funcionalidades inclusas',
      'Onboarding dedicado',
      'Integrações personalizadas',
      'Suporte prioritário',
      'SLA dedicado',
      'Gerente de conta exclusivo',
    ],
    ctaText: 'Falar com vendas',
    ctaLink: 'https://wa.me/5511999999999?text=Quero%20conhecer%20o%20plano%20Enterprise%20do%20HelpSeller',
    isExternal: true,
  },
] as { id: string; name: string; price: string; period?: string; description: string; popular?: boolean; trial?: string; features: string[]; extra?: string; ctaText: string; ctaLink: string; isExternal?: boolean }[]

const FAQ_ITEMS = [
  {
    question: 'O cliente vai saber que a IA está na call?',
    answer: 'Não. A IA processa o áudio localmente e exibe as sugestões apenas na tela do vendedor. Para o cliente, é uma chamada normal. O Whisper do gestor também é invisível.',
  },
  {
    question: 'Funciona com Google Meet, Zoom e telefone?',
    answer: 'Sim. Basta iniciar uma sessão no dashboard e compartilhar o áudio da aba do Google Meet, Zoom ou Teams. Funciona direto no navegador.',
  },
  {
    question: 'Quanto tempo leva para ver resultados?',
    answer: 'A maioria dos times reporta melhora na segurança dos vendedores já na primeira semana. Resultados mensuráveis em conversão aparecem entre 3 e 6 semanas.',
  },
  {
    question: 'Preciso de equipe de TI para instalar?',
    answer: 'Não. É 100% web — acesse pelo navegador, faça login e comece. Qualquer vendedor configura sozinho em 2 minutos.',
  },
  {
    question: 'As chamadas ficam gravadas? Quem tem acesso?',
    answer: 'Você decide o que é gravado e por quanto tempo. Os dados são criptografados e segmentados por empresa.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer: 'Sim, sem burocracia. Cancele pelo painel com um clique.',
  },
  {
    question: 'Integra com meu CRM?',
    answer: 'O resumo automático pós-call e os dados de desempenho podem ser exportados. Integrações nativas com Salesforce, HubSpot e Pipedrive estão em roadmap.',
  },
  {
    question: 'O trial de 7 dias é realmente grátis?',
    answer: 'Sim. Você acessa todos os recursos do plano escolhido por 7 dias. No 8º dia, você decide se quer continuar.',
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
      className="group relative flex flex-col p-5 sm:p-8 rounded-2xl bg-[#14151A]/60 backdrop-blur-sm border border-[#2A2A2A] hover:bg-[#18191F]/80 transition-colors duration-500 cursor-pointer overflow-hidden ring-1 ring-white/5"
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
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || mobileMenuOpen ? 'bg-[#0B0C10]/90 backdrop-blur-md border-b border-[#2A2A2A]' : 'bg-transparent'
          }`}
      >
        <Container className="flex items-center justify-between h-[72px]">
          <Link href="/" className="group flex items-center font-medium text-lg z-50">
            <img src="/logo.svg" alt="HelpSeller" className="h-8 sm:h-12 w-auto transition-transform group-hover:scale-105" />
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
          <div className="md:hidden fixed inset-0 z-40 bg-[#0B0C10] backdrop-blur-lg pt-[72px] px-4 pb-8 overflow-y-auto">
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
      <section className="relative pt-28 sm:pt-40 pb-16 sm:pb-24 overflow-hidden">
        <StarField />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] rounded-full pointer-events-none opacity-[0.25] blur-[120px]" style={{ backgroundColor: NEON_PINK }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200px] sm:w-[350px] h-[200px] sm:h-[350px] rounded-full pointer-events-none opacity-[0.2] blur-[150px]" style={{ backgroundColor: NEON_BLUE }} />
        <Container className="relative z-10 flex flex-col items-center text-center">
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-semibold text-white mb-4 sm:mb-6 max-w-4xl leading-[1.1] tracking-tight">
            Enquanto o cliente fala, a IA já sabe o que seu vendedor{' '}
            <em className="not-italic text-transparent bg-clip-text bg-linear-to-r from-neon-pink to-neon-blue">precisa dizer</em>
          </h1>
          <p className="text-base sm:text-xl text-gray-400 max-w-2xl mb-8 sm:mb-10 leading-relaxed px-2">
            A IA ouve cada chamada e sussurra a resposta certa no ouvido do seu vendedor — em tempo real, em português, enquanto o cliente ainda está na linha. Sem pausar. Sem improvisar. Sem perder o negócio.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto">
            <Link
              href="/register"
              className="gap-2 rounded-full px-8 h-12 text-base font-semibold text-white inline-flex items-center justify-center w-full sm:w-auto transition-all duration-300 hover:opacity-90 hover:scale-[1.02]"
              style={{ backgroundColor: NEON_PINK, boxShadow: '0 0 24px -5px rgba(255,0,122,0.4)' }}
            >
              Criar conta grátis <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how"
              className="rounded-full px-8 h-12 text-base font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-white inline-flex items-center justify-center w-full sm:w-auto backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]"
            >
              Ver como funciona
            </a>
          </div>
          <p className="mt-6 sm:mt-8 text-xs sm:text-sm text-gray-500 font-medium px-4">100% web · Funciona no navegador · Setup em 2 minutos</p>
          {/* Mock: chamada + sugestão IA */}
          <div className="mt-12 sm:mt-20 w-full max-w-2xl rounded-xl border border-[#2A2A2A] bg-[#0B0C10]/80 backdrop-blur-xl shadow-2xl overflow-hidden ring-1 ring-white/5">
            <div className="h-11 border-b border-[#2A2A2A] bg-[#14151A]/90 flex items-center px-4 gap-2">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#292929]" />
                <div className="w-3 h-3 rounded-full bg-[#292929]" />
                <div className="w-3 h-3 rounded-full bg-[#292929]" />
              </div>
              <span className="mx-auto text-xs font-mono text-gray-500">Chamada ao vivo • HelpSeller</span>
            </div>
            <div className="p-4 space-y-3 bg-[#111216]/50">
              <div className="flex items-start gap-3">
                <Headphones className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-400">Cliente: &quot;O preço está bem acima do nosso orçamento atual. Eu não sei se conseguimos fechar isso agora...&quot;</p>
              </div>
              <div className="flex items-start gap-3 pl-2 border-l-2 border-neon-pink/50">
                <Sparkles className="w-4 h-4 text-neon-pink shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-neon-pink mb-0.5">Sugestão da IA</p>
                  <p className="text-sm text-white">Entendo, orçamento é uma prioridade real. Posso mostrar o ROI que nossos clientes têm em média nos primeiros 60 dias — geralmente o produto se paga em 2 meses.</p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* TrustBar — stats + marquee estilo NovaFlow */}
      <section className="py-16 sm:py-24 overflow-hidden relative border-y border-[#1F2026]">
        <Container>
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-12 sm:mb-16">
            {TRUST_STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-xs sm:text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mb-12 font-medium tracking-[0.2em] uppercase opacity-60">
            Confiado por equipes de vendas em
          </p>
          <div className="relative w-full overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-linear-to-r from-[#0B0C10] via-[#0B0C10]/80 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-linear-to-l from-[#0B0C10] via-[#0B0C10]/80 to-transparent z-10 pointer-events-none" />
            <div className="flex overflow-hidden">
              <div className="landing-marquee flex items-center gap-16 pr-16 whitespace-nowrap">
                {[...TRUST_NAMES, ...TRUST_NAMES].map((name, i) => (
                  <span key={`${name}-${i}`} className="text-lg sm:text-2xl md:text-3xl font-bold text-[#333] hover:text-white transition-colors duration-500 cursor-default select-none tracking-tight">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* O problema real */}
      <section className="py-16 sm:py-24">
        <Container>
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 px-2">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-semibold text-white mb-4 sm:mb-6 tracking-tight">
              O treinamento não vai à campo com o vendedor
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed mb-4">
              Você investe em treinamento, cria playbooks, ensina objeções. Mas quando o cliente diz &quot;está caro&quot; ou &quot;preciso pensar&quot;, o vendedor improvisa — e improvisa mal.
            </p>
            <p className="text-lg text-gray-500 leading-relaxed">
              O problema não é o vendedor. É que ninguém estava lá para ajudar no momento exato que importava.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {PAIN_CARDS.map((item) => {
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

      {/* How it works */}
      <section id="how" className="py-16 sm:py-20">
        <Container>
          <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16 px-2">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">De zero a coaching na próxima chamada</h2>
            <p className="mt-4 text-gray-500 leading-relaxed">
              Três etapas. Dois minutos de setup. Nenhuma dependência de TI.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {[
              {
                step: '1',
                title: 'Você cadastra seus scripts',
                description: 'Crie playbooks por etapa do funil, defina as objeções mais comuns do seu mercado e escolha a personalidade da IA — estratégica, empática ou challenger. Leva 15 minutos.',
              },
              {
                step: '2',
                title: 'O vendedor inicia a sessão',
                description: 'Acessa o dashboard, clica em "Iniciar Sessão" e compartilha o áudio da reunião. Sem instalar nada, sem integrar CRM, sem depender de TI. 2 minutos.',
              },
              {
                step: '3',
                title: 'A IA trabalha durante a call',
                description: 'A IA escuta em tempo real, detecta o momento da objeção e mostra a resposta certa na tela do vendedor. Só ele vê. O cliente não percebe nada. O negócio avança.',
              },
            ].map((item) => (
              <div key={item.step} className="relative p-6 rounded-2xl bg-[#14151A] border border-[#2A2A2A] hover:border-white/10 transition-all duration-300">
                <div className="flex h-10 w-10 items-center justify-center rounded-full mb-4 text-sm font-bold text-white" style={{ backgroundColor: NEON_PINK, boxShadow: '0 0 20px -5px rgba(255,0,122,0.4)' }}>
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Features — Engineered for High-Performance style (NovaFlow) */}
      <section id="features" className="py-16 sm:py-32">
        <Container>
          <div className="flex items-center gap-4 mb-6 max-w-xs mx-auto">
            <div className="h-px flex-1 bg-linear-to-r from-transparent to-[#2A2A2A]" />
            <span className="text-xs font-semibold text-neon-pink uppercase tracking-widest px-3 py-1 border border-neon-pink/20 rounded-full bg-neon-pink/5 shadow-[0_0_10px_-3px_rgba(255,0,122,0.2)]">
              Recursos
            </span>
            <div className="h-px flex-1 bg-linear-to-l from-transparent to-[#2A2A2A]" />
          </div>
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 px-2">
            <h2 className="text-2xl sm:text-4xl md:text-6xl font-semibold text-white mb-6 tracking-tighter leading-[1.1]">
              Tudo que seu time{' '}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-neon-pink to-neon-blue">
                precisa
              </span>
              . Nada que não usa.
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        </Container>
      </section>

      {/* ProductDetails — 2 blocos estilo NovaFlow adaptados */}
      <section className="py-16 sm:py-32 overflow-hidden">
        <Container>
          <div className="flex flex-col md:flex-row items-center gap-10 sm:gap-20">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-pink/10 text-neon-pink text-xs font-medium mb-6 border border-neon-pink/20 shadow-[0_0_15px_-3px_rgba(255,0,122,0.3)]">
                <Sparkles className="w-3 h-3" /> IA na chamada
              </div>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-semibold text-white mb-4 sm:mb-6 leading-[1.1] tracking-tight">
                Colabore com sua <span className="text-transparent bg-clip-text bg-linear-to-r from-neon-pink to-neon-blue">IA de vendas</span>
              </h2>
              <p className="text-lg text-gray-500 mb-8 leading-relaxed max-w-lg">
                O HelpSeller não só escuta; entende o contexto. Sugere respostas na hora, trata objeções e desbloqueia seu time em tempo real.
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
                  <span className="text-[10px] font-mono text-gray-500">HelpSeller • Chamada</span>
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

      <section className="py-16 sm:py-32">
        <Container>
          <div className="flex flex-col md:flex-row-reverse items-center gap-10 sm:gap-20">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-green/10 text-neon-green text-xs font-medium mb-6 border border-neon-green/20">
                <BarChart3 className="w-3 h-3" /> Dashboard
              </div>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-semibold text-white mb-4 sm:mb-6 leading-[1.1] tracking-tight">
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
                <div className="h-10 border-b border-[#2A2A2A] flex items-center justify-between bg-[#16171C] px-4">
                  <span className="text-xs text-gray-500 font-mono">Dashboard • Este mês</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                    <span className="text-[10px] text-neon-green font-medium">AO VIVO</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-px bg-[#2A2A2A]/50">
                  {[
                    { label: 'Chamadas hoje', value: '12', change: 'Convertidas: 8', up: true },
                    { label: 'Horas usadas', value: '42h', change: '18h restantes', up: false },
                    { label: 'Em negociação', value: '5', change: 'follow-up pendente', up: false },
                  ].map((kpi) => (
                    <div key={kpi.label} className="bg-[#111216] p-3">
                      <p className="text-[10px] text-gray-500 mb-1">{kpi.label}</p>
                      <p className="text-sm font-semibold text-white">{kpi.value}</p>
                      <p className={`text-[10px] mt-0.5 ${kpi.up ? 'text-neon-green' : 'text-amber-400'}`}>{kpi.change}</p>
                    </div>
                  ))}
                </div>
                <div className="p-4">
                  <p className="text-[10px] text-gray-500 mb-3">Chamadas por semana</p>
                  <div className="flex items-end gap-1.5 h-24">
                    {[
                      { h: 35, label: 'S1' }, { h: 48, label: 'S2' }, { h: 42, label: 'S3' }, { h: 65, label: 'S4' },
                      { h: 58, label: 'S5' }, { h: 72, label: 'S6' }, { h: 68, label: 'S7' }, { h: 85, label: 'S8' },
                    ].map((bar) => (
                      <div key={bar.label} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t transition-all duration-500 hover:opacity-80"
                          style={{
                            height: `${bar.h}%`,
                            background: bar.h >= 70 ? 'linear-gradient(to top, #00ff94, #00d4aa)' : bar.h >= 50 ? 'linear-gradient(to top, rgba(0,209,255,0.25), #00d1ff)' : '#2A2A2A',
                          }}
                        />
                        <span className="text-[8px] text-gray-600">{bar.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-[#2A2A2A] px-4 py-3">
                  <p className="text-[10px] text-gray-500 mb-2">Top vendedores</p>
                  <div className="space-y-1.5">
                    {[
                      { name: 'Felipe P.', pct: 82, color: '#00ff94' },
                      { name: 'Ana M.', pct: 71, color: '#00d1ff' },
                      { name: 'Lucas C.', pct: 64, color: '#ff007a' },
                    ].map((seller) => (
                      <div key={seller.name} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 w-14 shrink-0">{seller.name}</span>
                        <div className="flex-1 h-1.5 bg-[#1E1F25] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${seller.pct}%`, backgroundColor: seller.color }} />
                        </div>
                        <span className="text-[10px] text-white font-medium w-8 text-right">{seller.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Benefits — estilo TechSpecs + cards (referência NovaFlow) */}
      <section id="benefits" className="py-16 sm:py-24 border-y border-[#2A2A2A] bg-[#0F1014]">
        <Container>
          <div className="flex items-center gap-4 mb-6 max-w-xs mx-auto">
            <div className="h-px flex-1 bg-linear-to-r from-transparent to-[#2A2A2A]" />
            <span className="text-xs font-semibold text-neon-green uppercase tracking-widest px-3 py-1 border border-neon-green/20 rounded-full bg-neon-green/5">
              Benefícios
            </span>
            <div className="h-px flex-1 bg-linear-to-l from-transparent to-[#2A2A2A]" />
          </div>
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 px-2">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-semibold text-white mb-4 tracking-tight">
              Por que usar o <span className="text-transparent bg-clip-text bg-linear-to-r from-neon-pink to-neon-blue">HelpSeller</span>?
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
      <section id="planos" className="py-16 sm:py-24 border-t border-[#2A2A2A]">
        <Container>
          <div className="text-center mb-12 sm:mb-16 px-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
              Preço justo para times brasileiros
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Sem surpresa, sem cobrança em dólar, sem call de vendas para saber o preço.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-300 ${plan.popular
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
                  <span className="text-2xl font-bold text-white">{plan.price}</span>
                  {plan.period && <span className="text-gray-500 text-sm">{plan.period}</span>}
                </div>
                <p className="mt-2 text-sm text-gray-500">{plan.description}</p>
                {plan.trial && (
                  <div className="mt-3 px-3 py-1.5 rounded-lg bg-neon-green/10 border border-neon-green/20 text-neon-green text-xs font-semibold text-center">
                    {plan.trial}
                  </div>
                )}
                <ul className="mt-5 space-y-2.5 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-400">
                      <Check className="w-4 h-4 shrink-0 text-neon-green mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {plan.extra && (
                  <p className="mt-3 text-xs text-gray-500 border-t border-white/5 pt-3">
                    + {plan.extra}
                  </p>
                )}
                {plan.isExternal ? (
                  <a
                    href={plan.ctaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 w-full inline-flex items-center justify-center rounded-xl py-3 text-sm font-semibold transition-all border border-[#2A2A2A] bg-white/5 text-white hover:bg-white/10"
                  >
                    {plan.ctaText}
                  </a>
                ) : (
                  <Link
                    href={plan.ctaLink}
                    className={`mt-6 w-full inline-flex items-center justify-center rounded-xl py-3 text-sm font-semibold transition-all ${plan.popular
                        ? 'bg-neon-pink text-white hover:opacity-90 shadow-[0_0_20px_-5px_rgba(255,0,122,0.4)]'
                        : 'border border-[#2A2A2A] bg-white/5 text-white hover:bg-white/10'
                      }`}
                  >
                    {plan.ctaText}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Testimonials */}
      <section className="py-16 sm:py-24 border-t border-[#2A2A2A] bg-[#0F1014]">
        <Container>
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
              O que nossos clientes dizem
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="group p-6 rounded-2xl bg-[#14151A] border border-[#2A2A2A] hover:border-white/10 transition-all duration-300"
              >
                <Quote className="w-8 h-8 text-neon-pink/30 mb-4" />
                <p className="text-sm text-gray-400 leading-relaxed mb-6">
                  &quot;{t.quote}&quot;
                </p>
                <div className="border-t border-white/5 pt-4">
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                  <p className="text-xs text-gray-500">{t.location}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 sm:py-24 border-t border-[#2A2A2A]">
        <Container>
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
              Perguntas frequentes
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Tudo o que você precisa saber sobre o HelpSeller e os planos.
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
                  <span className="font-medium text-white text-base sm:text-lg pr-4 group-hover:text-neon-pink transition-colors">
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
      <section className="py-16 sm:py-24 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] rounded-full pointer-events-none opacity-[0.18] blur-[140px]" style={{ backgroundColor: NEON_PINK }} />
        <Container>
          <div className="relative rounded-2xl sm:rounded-3xl border p-6 sm:p-12 text-center md:p-16 overflow-hidden ring-1 ring-white/5 shadow-2xl bg-[#0B0C10] border-[#2A2A2A]">
            <div className="landing-grid-bg absolute inset-0 opacity-20" aria-hidden />
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-white sm:text-3xl md:text-4xl">
                A resposta certa já está pronta. Seu vendedor só precisa{' '}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-neon-pink to-neon-blue">usá-la</span>
              </h2>
              <p className="mt-4 text-gray-500 max-w-xl mx-auto leading-relaxed">
                Configure hoje. A IA já estará no ouvido do seu time na próxima chamada.
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
              <p className="mt-6 text-sm text-gray-500 font-medium">
                +12.000 chamadas analisadas · +38% de conversão em média · Único em português para PMEs
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Footer — multi-coluna estilo NovaFlow */}
      <footer className="bg-[#0B0C10] pt-16 sm:pt-32 pb-12 border-t border-[#2A2A2A]">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 sm:gap-10 mb-12 sm:mb-16">
            <div className="col-span-2 md:col-span-2">
              <Link href="/" className="flex items-center text-white font-medium mb-6 text-lg">
                <img src="/logo.svg" alt="HelpSeller" className="h-8 sm:h-12 w-auto" />
              </Link>
              <p className="text-sm text-gray-500 max-w-xs">Coaching de vendas com IA em tempo real. O único produto feito para times brasileiros que querem fechar mais.</p>
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
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacidade</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Termos de Uso</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-[#2A2A2A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-gray-500">
            <div>
              <p>© {new Date().getFullYear()} HelpSeller. Todos os direitos reservados.</p>
              <p className="mt-1">CNPJ: 53.979.090/0001-70</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacidade</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Termos de Uso</Link>
            </div>
          </div>
        </Container>
      </footer>
    </main>
  )
}

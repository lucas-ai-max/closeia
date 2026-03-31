'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Gift, Link2, Banknote, CheckCircle } from 'lucide-react'

const NEON_PINK = '#ff007a'

const BENEFITS = [
  {
    icon: Gift,
    title: 'Comissao de 20%',
    description: 'Ganhe em cada pagamento dos seus indicados',
  },
  {
    icon: Link2,
    title: 'Link exclusivo',
    description: 'Compartilhe seu link personalizado',
  },
  {
    icon: Banknote,
    title: 'Saque via PIX',
    description: 'Solicite saques a qualquer momento',
  },
]

const PIX_TYPES = ['CPF', 'Email', 'Telefone', 'Aleatoria'] as const

export default function AffiliateCadastroPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    pix_key: '',
    pix_type: '',
    how_promote: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/affiliate/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao enviar cadastro')
      }
      setSuccess(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao enviar cadastro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white scroll-smooth">
      {/* Navbar */}
      <nav className="w-full px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="text-2xl font-bold tracking-tight">
          <span className="text-[#ff007a]">Help</span>Closer
        </Link>
        <Link
          href="/login"
          className="text-sm text-[#999] hover:text-white transition-colors"
        >
          Entrar
        </Link>
      </nav>

      <main className="flex flex-col items-center px-6 pt-12 pb-24 sm:pt-20 sm:pb-32">
        <div className="max-w-4xl w-full">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-4">
              Programa de Afiliados <span className="text-[#ff007a]">HelpCloser</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-[#999] max-w-2xl mx-auto leading-relaxed">
              Indique clientes, ganhe comissoes de 20% em cada assinatura.
            </p>
          </div>

          {/* Benefits */}
          <div className="grid gap-6 sm:grid-cols-3 mb-16">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="rounded-2xl border border-white/5 bg-[#1e1e1e] p-6 text-center"
              >
                <div
                  className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${NEON_PINK}15` }}
                >
                  <b.icon className="w-6 h-6" style={{ color: NEON_PINK }} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{b.title}</h3>
                <p className="text-sm text-gray-400">{b.description}</p>
              </div>
            ))}
          </div>

          {/* Form / Success */}
          <div className="max-w-xl mx-auto">
            {success ? (
              <div className="rounded-2xl border border-white/5 bg-[#1e1e1e] p-10 text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
                <h2 className="text-2xl font-bold text-white mb-2">Cadastro enviado!</h2>
                <p className="text-gray-400">
                  Vamos analisar e entrar em contato em breve.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/5 bg-[#1e1e1e] p-8">
                <h2 className="text-xl font-semibold text-white mb-6">Cadastre-se como Afiliado</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Nome */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Nome completo *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={form.name}
                      onChange={handleChange}
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder:text-gray-600 focus:ring-1 focus:ring-[#ff007a] focus:border-[#ff007a] focus:outline-none transition-colors"
                      placeholder="Seu nome completo"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Email *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder:text-gray-600 focus:ring-1 focus:ring-[#ff007a] focus:border-[#ff007a] focus:outline-none transition-colors"
                      placeholder="seu@email.com"
                    />
                  </div>

                  {/* Telefone */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Telefone / WhatsApp *</label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={form.phone}
                      onChange={handleChange}
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder:text-gray-600 focus:ring-1 focus:ring-[#ff007a] focus:border-[#ff007a] focus:outline-none transition-colors"
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  {/* Chave PIX */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Chave PIX *</label>
                    <input
                      type="text"
                      name="pix_key"
                      required
                      value={form.pix_key}
                      onChange={handleChange}
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder:text-gray-600 focus:ring-1 focus:ring-[#ff007a] focus:border-[#ff007a] focus:outline-none transition-colors"
                      placeholder="Sua chave PIX"
                    />
                  </div>

                  {/* Tipo PIX */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Tipo da chave PIX *</label>
                    <select
                      name="pix_type"
                      required
                      value={form.pix_type}
                      onChange={handleChange}
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-[#ff007a] focus:border-[#ff007a] focus:outline-none transition-colors appearance-none"
                    >
                      <option value="" disabled>Selecione o tipo</option>
                      {PIX_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Como pretende divulgar */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Como pretende divulgar?</label>
                    <textarea
                      name="how_promote"
                      value={form.how_promote}
                      onChange={handleChange}
                      rows={3}
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder:text-gray-600 focus:ring-1 focus:ring-[#ff007a] focus:border-[#ff007a] focus:outline-none transition-colors resize-none"
                      placeholder="Redes sociais, comunidades, YouTube..."
                    />
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl text-base font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: NEON_PINK, boxShadow: '0 0 20px -5px rgba(255,0,122,0.4)' }}
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Quero ser Afiliado
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-8 border-t border-white/5">
        <p className="text-center text-sm text-[#666]">
          &copy; 2026 HelpCloser &middot; helpcloser.app
        </p>
      </footer>
    </div>
  )
}

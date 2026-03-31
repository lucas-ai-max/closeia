'use client'

import Link from 'next/link'

export default function ConhecaHelpSeller() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white scroll-smooth">
      {/* Navbar */}
      <nav className="w-full px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="text-2xl font-bold tracking-tight">
          <span className="text-[#ff007a]">Help</span>Closer
        </Link>
        <Link
          href="/register"
          className="text-sm text-[#999] hover:text-white transition-colors"
        >
          Criar conta
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-col items-center px-6 pt-12 pb-24 sm:pt-20 sm:pb-32">
        <div className="max-w-4xl w-full text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-6">
            Enquanto o cliente fala, a IA j&aacute; sabe o que seu vendedor precisa dizer
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-[#999] max-w-3xl mx-auto leading-relaxed mb-12">
            A IA ouve cada chamada e sussurra a resposta certa no ouvido do seu vendedor
            &mdash; em tempo real, em portugu&ecirc;s, enquanto o cliente ainda est&aacute; na linha.
            Sem pausar. Sem improvisar. Sem perder o neg&oacute;cio.
          </p>

          {/* Video with glow */}
          <div className="relative w-full max-w-[800px] mx-auto mb-14">
            {/* Gradient glow behind video */}
            <div className="absolute -inset-4 bg-gradient-to-r from-[#ff007a]/20 via-[#ff007a]/10 to-[#ff007a]/20 rounded-3xl blur-2xl opacity-60" />
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-2xl shadow-[#ff007a]/10 border border-white/5">
              <iframe
                src="https://www.youtube.com/embed/cQSiPgGD30w"
                title="HelpCloser Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 bg-[#ff007a] hover:bg-[#e0006b] text-white font-semibold text-lg rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-lg shadow-[#ff007a]/25"
            >
              Quero para minha equipe
            </Link>
            <Link
              href="/register?plan=starter"
              className="w-full sm:w-auto px-8 py-4 border-2 border-[#ff007a] text-[#ff007a] hover:bg-[#ff007a]/10 font-semibold text-lg rounded-xl transition-all duration-200 hover:scale-[1.02]"
            >
              TESTE 7 DIAS GR&Aacute;TIS
            </Link>
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

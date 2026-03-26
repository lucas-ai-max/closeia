'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0B0C10] text-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <h1 className="text-4xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-gray-500 mb-10">Ultima atualizacao: 10 de marco de 2026</p>

        <div className="prose prose-invert prose-gray max-w-none space-y-8 text-gray-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Aceitacao dos Termos</h2>
            <p>
              Ao acessar ou utilizar a plataforma HelpCloser, operada pela empresa inscrita no CNPJ 53.979.090/0001-70,
              voce concorda em cumprir e estar vinculado a estes Termos de Uso. Caso nao concorde com algum dos termos,
              nao utilize nossos servicos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Descricao do Servico</h2>
            <p>
              O HelpCloser e uma plataforma SaaS de coaching de vendas com inteligencia artificial que oferece:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Coaching em tempo real durante chamadas de vendas via extensao do navegador.</li>
              <li>Transcricao automatica de chamadas com analise por IA.</li>
              <li>Deteccao de objecoes e sugestoes contextuais para vendedores.</li>
              <li>Dashboard de analytics com metricas de desempenho individual e da equipe.</li>
              <li>Gestao de scripts e playbooks de vendas.</li>
              <li>Funcionalidade de whisper para gestores acompanharem chamadas ao vivo.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Cadastro e Conta</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Voce deve fornecer informacoes verdadeiras e completas durante o cadastro.</li>
              <li>Voce e responsavel por manter a confidencialidade da sua senha e conta.</li>
              <li>Cada organizacao pode ter multiplos usuarios (vendedores e gestores) conforme o plano contratado.</li>
              <li>Voce deve notificar imediatamente sobre qualquer uso nao autorizado da sua conta.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Planos e Pagamentos</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Os planos disponiveis e seus respectivos precos estao descritos na pagina de planos.</li>
              <li>Os pagamentos sao processados mensalmente via Stripe, com suporte a cartao de credito, PIX e boleto.</li>
              <li>Upgrades e downgrades podem ser feitos a qualquer momento, com valor proporcional ao periodo restante.</li>
              <li>O plano Starter inclui periodo de teste gratuito de 7 dias.</li>
              <li>Horas de chamada excedentes sao cobradas conforme a tarifa adicional do plano contratado.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Uso Aceitavel</h2>
            <p>Voce concorda em nao:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Utilizar o servico para fins ilegais ou nao autorizados.</li>
              <li>Tentar acessar dados de outros usuarios ou organizacoes.</li>
              <li>Realizar engenharia reversa, descompilar ou desmontar o software.</li>
              <li>Usar o servico para gravar chamadas sem o consentimento das partes envolvidas, conforme legislacao vigente.</li>
              <li>Sobrecarregar ou interferir na infraestrutura do servico.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Propriedade Intelectual</h2>
            <p>
              Todo o conteudo, codigo, design, marcas e tecnologia do HelpCloser sao de propriedade exclusiva da Empresa.
              Voce recebe uma licenca limitada, nao exclusiva e nao transferivel para usar o servico conforme estes termos.
              Os dados gerados por voce (scripts, configuracoes, dados de chamadas) permanecem de sua propriedade.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Disponibilidade e SLA</h2>
            <p>
              Nos empenhamos para manter o servico disponivel 24/7, porem nao garantimos disponibilidade ininterrupta.
              Manutencoes programadas serao comunicadas com antecedencia. Para clientes Enterprise, oferecemos SLA
              dedicado conforme contrato especifico.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Cancelamento</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Voce pode cancelar sua assinatura a qualquer momento pelo painel de configuracoes.</li>
              <li>Apos o cancelamento, o acesso permanece ativo ate o final do periodo ja pago.</li>
              <li>Nos reservamos o direito de suspender ou encerrar contas que violem estes termos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Limitacao de Responsabilidade</h2>
            <p>
              O HelpCloser e fornecido &quot;como esta&quot;. Nao garantimos que as sugestoes da IA resultarao em
              fechamento de vendas. Nossa responsabilidade e limitada ao valor pago pelo servico nos ultimos
              12 meses. Nao somos responsaveis por danos indiretos, perda de lucros ou dados decorrentes do
              uso do servico.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Legislacao Aplicavel</h2>
            <p>
              Estes termos sao regidos pelas leis da Republica Federativa do Brasil. Quaisquer disputas
              serao resolvidas no foro da comarca da sede da Empresa, com exclusao de qualquer outro,
              por mais privilegiado que seja.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Contato</h2>
            <p>
              Para duvidas sobre estes termos, entre em contato pelo e-mail:{' '}
              <a href="mailto:contato@helpseller.com.br" className="text-neon-pink hover:underline">contato@helpseller.com.br</a>
            </p>
          </section>

          <div className="pt-8 border-t border-[#2A2A2A] text-sm text-gray-500">
            <p>HelpCloser — CNPJ: 53.979.090/0001-70</p>
          </div>
        </div>
      </div>
    </main>
  )
}

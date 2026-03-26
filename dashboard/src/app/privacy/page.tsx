'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0B0C10] text-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <h1 className="text-4xl font-bold mb-2">Politica de Privacidade</h1>
        <p className="text-gray-500 mb-10">Ultima atualizacao: 10 de marco de 2026</p>

        <div className="prose prose-invert prose-gray max-w-none space-y-8 text-gray-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Introducao</h2>
            <p>
              A HelpCloser (&quot;nos&quot;, &quot;nosso&quot; ou &quot;Empresa&quot;), inscrita no CNPJ 53.979.090/0001-70,
              esta comprometida em proteger a privacidade dos seus usuarios. Esta Politica de Privacidade descreve como
              coletamos, usamos, armazenamos e protegemos suas informacoes pessoais ao utilizar nossa plataforma de
              coaching de vendas com inteligencia artificial.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Dados que Coletamos</h2>
            <p>Coletamos os seguintes tipos de informacoes:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong className="text-white">Dados de cadastro:</strong> nome, e-mail, senha (criptografada) e dados da organizacao.</li>
              <li><strong className="text-white">Dados de uso:</strong> metricas de chamadas, duracoes, transcricoes de audio (quando autorizado) e interacoes com a plataforma.</li>
              <li><strong className="text-white">Dados de pagamento:</strong> processados de forma segura via Stripe. Nao armazenamos dados de cartao de credito em nossos servidores.</li>
              <li><strong className="text-white">Dados tecnicos:</strong> endereco IP, tipo de navegador, sistema operacional e logs de acesso.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Como Usamos seus Dados</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fornecer e melhorar nossos servicos de coaching de vendas com IA.</li>
              <li>Processar transcricoes de chamadas para gerar sugestoes em tempo real.</li>
              <li>Gerar analytics e metricas de desempenho para gestores e vendedores.</li>
              <li>Processar pagamentos e gerenciar assinaturas.</li>
              <li>Enviar comunicacoes sobre o servico (atualizacoes, seguranca, suporte).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Audio e Transcricoes</h2>
            <p>
              O HelpCloser utiliza acesso ao microfone para transcrever chamadas de vendas em tempo real.
              O audio e processado em tempo real e nao e armazenado permanentemente, a menos que o usuario
              configure explicitamente a gravacao. Transcricoes sao armazenadas de forma criptografada e
              acessiveis apenas pela organizacao do usuario.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Seguranca dos Dados</h2>
            <p>
              Utilizamos criptografia em transito (TLS/SSL) e em repouso para proteger seus dados.
              Nossa infraestrutura e hospedada em provedores de nuvem com certificacoes de seguranca
              reconhecidas internacionalmente (SOC 2, ISO 27001). O acesso aos dados e restrito
              e controlado por politicas de permissao.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Compartilhamento de Dados</h2>
            <p>Nao vendemos seus dados pessoais. Podemos compartilhar dados apenas com:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong className="text-white">Processadores de pagamento:</strong> Stripe, para processar transacoes financeiras.</li>
              <li><strong className="text-white">Provedores de IA:</strong> para processamento de transcricoes e geracao de sugestoes (dados anonimizados quando possivel).</li>
              <li><strong className="text-white">Obrigacoes legais:</strong> quando exigido por lei ou ordem judicial.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Seus Direitos (LGPD)</h2>
            <p>Em conformidade com a Lei Geral de Protecao de Dados (LGPD - Lei 13.709/2018), voce tem direito a:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Acessar seus dados pessoais.</li>
              <li>Corrigir dados incompletos ou desatualizados.</li>
              <li>Solicitar a exclusao dos seus dados.</li>
              <li>Revogar o consentimento a qualquer momento.</li>
              <li>Solicitar a portabilidade dos seus dados.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Retencao de Dados</h2>
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessario para fornecer
              nossos servicos. Apos o cancelamento da conta, os dados sao retidos por ate 90 dias para
              fins de backup e conformidade, e depois sao permanentemente excluidos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Contato</h2>
            <p>
              Para questoes relacionadas a privacidade ou para exercer seus direitos, entre em contato
              conosco pelo e-mail: <a href="mailto:privacidade@helpseller.com.br" className="text-neon-pink hover:underline">privacidade@helpseller.com.br</a>
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

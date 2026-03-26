export const metadata = {
  title: 'Como ativar o microfone - HelpCloser',
};

const steps = [
  {
    number: 1,
    title: 'Abra as configurações do Chrome',
    description: 'Na barra de endereço do Google Chrome, digite o endereço abaixo e pressione Enter:',
    code: 'chrome://settings/content/microphone',
    tip: 'Ou clique nos 3 pontos no canto superior direito > Configurações > Privacidade e segurança > Configurações do site > Microfone.',
  },
  {
    number: 2,
    title: 'Verifique o microfone selecionado',
    description: 'No topo da página, certifique-se de que o microfone correto está selecionado no menu suspenso. Se você usa fone de ouvido ou headset, selecione-o aqui.',
  },
  {
    number: 3,
    title: 'Permita o acesso ao microfone',
    description: 'Certifique-se de que a opção "Os sites podem pedir para usar seu microfone" está ativada. Se o HelpCloser aparecer na lista de bloqueados, clique na lixeira ao lado para removê-lo.',
  },
  {
    number: 4,
    title: 'Permita na extensão HelpCloser',
    description: 'Com uma reunião aberta no Google Meet ou Zoom, clique no ícone do HelpCloser na barra de extensões. Ao iniciar a gravação pela primeira vez, o navegador pedirá permissão - clique em "Permitir".',
  },
  {
    number: 5,
    title: 'Verifique no Google Meet / Zoom',
    description: 'No Google Meet, clique no ícone de cadeado na barra de endereço e confirme que o microfone está como "Permitir". No Zoom Web, faça o mesmo processo.',
  },
];

export default function GuiaMicrofonePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#ff007a]/10 border border-[#ff007a]/30 mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff007a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-3">Como ativar o microfone</h1>
          <p className="text-[#a3a3a3] text-sm leading-relaxed max-w-md mx-auto">
            Siga os passos abaixo para permitir que o HelpCloser acesse seu microfone e transcreva suas falas em tempo real.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative pl-14 pb-6"
            >
              {/* Connector line */}
              {step.number < steps.length && (
                <div className="absolute left-[19px] top-10 bottom-0 w-px bg-[#ff007a]/20" />
              )}

              {/* Step number */}
              <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-[#ff007a]/10 border border-[#ff007a]/30 flex items-center justify-center text-[#ff007a] font-bold text-sm">
                {step.number}
              </div>

              {/* Content */}
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
                <h3 className="font-semibold text-[15px] mb-2">{step.title}</h3>
                <p className="text-[#a3a3a3] text-[13px] leading-relaxed">{step.description}</p>

                {step.code && (
                  <div className="mt-3 bg-black/40 border border-white/[0.08] rounded-lg px-4 py-3 font-mono text-[13px] text-[#ff007a] select-all">
                    {step.code}
                  </div>
                )}

                {step.tip && (
                  <p className="mt-3 text-[12px] text-[#737373] leading-relaxed">
                    <span className="text-[#ff007a] font-medium">Dica:</span> {step.tip}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-5 py-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span className="text-green-400 text-[13px] font-medium">
              Pronto! Volte à extensão e clique para iniciar a gravação.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

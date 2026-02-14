'use client'

import Link from 'next/link'

const NEON_PINK = '#ff007a'
const NEON_GREEN = '#00ff94'
const NEON_PURPLE = '#9d00ff'
const NEON_BLUE = '#00d1ff'
const NEON_ORANGE = '#ff8a00'

const TODAY_ITEMS = [
  {
    icon: 'call',
    label: 'Chamada concluída',
    sub: 'João Silva • 12:45',
    value: 'Score 92',
    positive: true,
  },
  {
    icon: 'trending_up',
    label: 'Nova conversão',
    sub: 'Script Vendas Pro • 09:12',
    value: '+1',
    positive: true,
  },
]

const PROMO_ITEMS = [
  { day: '12', weekDay: 'Sex', title: 'Script Ativo', sub: 'Vendas • Hoje' },
  { day: '15', weekDay: 'Seg', title: 'Treino de objeções', sub: 'Equipe • 08:00' },
]

export function RightSidebar() {
  return (
    <aside
      className="w-80 shrink-0 bg-black border-l border-white/5 p-6 overflow-y-auto scrollbar-hide"
      style={{ borderColor: 'rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-center justify-end gap-4 mb-8">
        <div className="relative">
          <span className="material-icons-outlined text-gray-400">
            notifications
          </span>
          <span
            className="absolute top-0 right-0 w-2 h-2 rounded-full"
            style={{ backgroundColor: NEON_PINK }}
          />
        </div>
        <span className="material-icons-outlined text-gray-400">mail</span>
      </div>

      {/* Card Resumo */}
      <div
        className="relative p-5 rounded-2xl mb-8 border-l-4 overflow-hidden"
        style={{
          backgroundColor: 'rgba(30, 30, 30, 0.9)',
          borderColor: NEON_PINK,
          boxShadow: '0 0 24px rgba(255, 0, 122, 0.08)',
        }}
      >
        <div className="mb-3">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            Resumo
          </span>
        </div>
        <div className="text-3xl font-bold text-white tracking-tight mb-1">
          1.234
        </div>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest">
          Chamadas este mês
        </p>
      </div>

      {/* Hoje */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-white">Hoje</h3>
          <Link href="/calls" className="text-gray-500 text-xs hover:text-white">
            Ver tudo
          </Link>
        </div>
        <div className="space-y-4">
          {TODAY_ITEMS.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between glass-card-dark p-3 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: item.positive
                      ? `${NEON_GREEN}20`
                      : `${NEON_PINK}20`,
                  }}
                >
                  <span
                    className="material-icons-outlined text-lg"
                    style={{
                      color: item.positive ? NEON_GREEN : NEON_PINK,
                    }}
                  >
                    {item.icon}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{item.label}</div>
                  <div className="text-[10px] text-gray-500">{item.sub}</div>
                </div>
              </div>
              <div
                className={`text-xs font-bold ${item.positive ? '' : ''}`}
                style={item.positive ? { color: NEON_GREEN } : undefined}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scripts em destaque */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-white">Em destaque</h3>
          <span className="text-xs text-gray-500">Este mês</span>
        </div>
        <div className="space-y-3">
          <Link
            href="/scripts"
            className="flex items-center gap-3 glass-card-dark p-3 rounded-xl border-l-4 hover:bg-white/5 transition-colors"
            style={{ borderLeftColor: NEON_ORANGE }}
          >
            <div className="text-center min-w-[32px]">
              <div className="text-xs font-bold text-white">12</div>
              <div className="text-[9px] text-gray-500 uppercase">Sex</div>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Script Vendas</div>
              <div className="text-[10px] text-gray-500">Ativo • Hoje</div>
            </div>
          </Link>
          <Link
            href="/scripts"
            className="flex items-center gap-3 glass-card-dark p-3 rounded-xl border-l-4 hover:bg-white/5 transition-colors"
            style={{ borderLeftColor: NEON_PURPLE }}
          >
            <div className="text-center min-w-[32px]">
              <div className="text-xs font-bold text-white">15</div>
              <div className="text-[9px] text-gray-500 uppercase">Seg</div>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Objeções</div>
              <div className="text-[10px] text-gray-500">Treino • 08:00</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Chamadas recentes (Message Box style) */}
      <div>
        <h3 className="font-bold text-sm text-white mb-4">Chamadas recentes</h3>
        <div className="space-y-4">
          {['Maria S.', 'Pedro O.', 'Ana L.'].map((name, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gray-700 border border-white/10 flex items-center justify-center text-white text-sm font-bold">
                  {name.charAt(0)}
                </div>
                <span
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-black"
                  style={{
                    backgroundColor: i === 0 ? NEON_GREEN : '#6b7280',
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-white">{name}</span>
                  <span className="text-[10px] text-gray-600">
                    {i === 0 ? '2m' : '1h'}
                  </span>
                </div>
                <div className="text-[10px] text-gray-500 truncate">
                  {i === 0 ? 'Chamada finalizada' : 'Em andamento'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

import { useRef, useEffect, useMemo } from 'react';
import { useCoachingStore } from '../stores/coaching-store';
import { CardItem } from './CardItem';

const SPIN_PHASES: Record<string, { label: string; color: string; bg: string; border: string; description: string }> = {
    S: { label: 'Situação', color: 'text-cyan-300', bg: 'bg-cyan-900/30', border: 'border-cyan-500/40', description: 'Coletando fatos sobre o contexto' },
    P: { label: 'Problema', color: 'text-amber-300', bg: 'bg-amber-900/30', border: 'border-amber-500/40', description: 'Descobrindo dores e insatisfações' },
    I: { label: 'Implicação', color: 'text-red-300', bg: 'bg-red-900/30', border: 'border-red-500/40', description: 'Amplificando as consequências' },
    N: { label: 'Necessidade', color: 'text-green-300', bg: 'bg-green-900/30', border: 'border-green-500/40', description: 'Fazendo o cliente verbalizar a solução' },
};

export function CoachPanel() {
    const cards = useCoachingStore(state => state.cards);
    const currentSpinPhase = useCoachingStore(state => state.currentSpinPhase);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Derive the latest SPIN phase from the most recent card with a phase
    const latestPhase = useMemo(() => {
        if (currentSpinPhase) return currentSpinPhase;
        const cardWithPhase = cards.find(c => !c.isDismissed && c.metadata?.phase);
        return cardWithPhase?.metadata?.phase || null;
    }, [cards, currentSpinPhase]);

    const phaseInfo = latestPhase ? SPIN_PHASES[latestPhase] : null;
    const activeCards = cards.filter(c => !c.isDismissed);

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar" ref={scrollRef}>
            {/* SPIN Phase Banner */}
            {phaseInfo && (
                <div className={`mx-4 mt-3 mb-1 px-3 py-2.5 rounded-lg border ${phaseInfo.bg} ${phaseInfo.border} transition-all duration-500`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-black tracking-widest ${phaseInfo.color}`}>
                                SPIN:{latestPhase}
                            </span>
                            <span className={`text-sm font-semibold ${phaseInfo.color}`}>
                                {phaseInfo.label}
                            </span>
                        </div>
                        <div className="flex gap-1">
                            {['S', 'P', 'I', 'N'].map(p => (
                                <div
                                    key={p}
                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${p === latestPhase
                                            ? `${SPIN_PHASES[p].color.replace('text-', 'bg-')} scale-125 ring-1 ring-white/30`
                                            : 'bg-slate-600/50'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{phaseInfo.description}</p>
                </div>
            )}

            {/* Cards */}
            <div className="p-4 space-y-1">
                {activeCards.map(card => (
                    <CardItem key={card.id} card={card} />
                ))}

                {activeCards.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50 pt-12">
                        <p className="text-sm">
                            {phaseInfo ? 'Analisando conversa...' : 'Aguardando conversa...'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

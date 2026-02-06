import { useRef, useEffect } from 'react';
import { useCoachingStore } from '../stores/coaching-store';
import { CardItem } from './CardItem';

export function CoachPanel() {
    const cards = useCoachingStore(state => state.cards);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to top when new card is added if it's high priority, 
    // or simple standard behavior implies "newest on top" so we shouldn't need valid scrolling down.
    // The layout request says "Latest on top", so we render list normally but maybe overflow is handled differently.
    // Actually, standard chat is bottom-up, but feed is top-down. 
    // "Cards empilhados, mais recente no topo" -> Standard vertical list.

    return (
        <div
            className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar"
            ref={scrollRef}
        >
            {cards.filter(c => !c.isDismissed).map(card => (
                <CardItem key={card.id} card={card} />
            ))}

            {cards.filter(c => !c.isDismissed).length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                    <p className="text-sm">Aguardando insights...</p>
                </div>
            )}
        </div>
    );
}

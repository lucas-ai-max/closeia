import { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Transcript {
    text: string;
    speaker: 'user' | 'lead';
    timestamp: number;
}

export function TranscriptMini({ transcripts }: { transcripts: Transcript[] }) {
    const [expanded, setExpanded] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcripts, expanded]);

    // Show last 3 messages if collapsed
    const displayedTranscripts = expanded ? transcripts : transcripts.slice(-3);

    return (
        <div className={`shrink-0 border-t border-white/10 bg-[#1A1B2E] transition-all duration-300 ${expanded ? 'h-64' : 'h-auto max-h-40'
            }`}>
            <div
                className="px-4 py-1 flex items-center justify-center cursor-pointer hover:bg-white/5"
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronUp size={14} className="text-slate-500" />}
            </div>

            <div
                className="px-4 py-2 space-y-2 overflow-y-auto custom-scrollbar"
                style={{ height: expanded ? 'calc(100% - 24px)' : 'auto' }}
                ref={scrollRef}
            >
                {displayedTranscripts.map((t, i) => (
                    <div key={i} className={`text-sm leading-snug ${t.speaker === 'user' ? 'text-blue-200' : 'text-slate-300'
                        }`}>
                        <span className="font-bold mr-1 text-xs opacity-50">
                            {t.speaker === 'user' ? 'VOCÊ' : 'LEAD'}:
                        </span>
                        {/* Highlight keywords logic would go here, simpler for now */}
                        {t.text}
                    </div>
                ))}
            </div>
        </div>
    );
}

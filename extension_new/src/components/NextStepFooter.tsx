import { useCoachingStore } from '../stores/coaching-store';
import { User, Mic, ShoppingCart } from 'lucide-react';

export function NextStepFooter() {
    const {
        nextStep,
        nextStepQuestion,
        leadProfile,
        buyingSignalsCount,
        activeSpeaker,
        setSpeaker
    } = useCoachingStore();

    return (
        <div className="shrink-0 border-t border-white/10 bg-[#252640] text-white">
            {/* Lead Profile Bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-black/20">
                <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1.5">
                        <User size={14} className="text-slate-400" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                            {leadProfile}
                        </span>
                    </div>
                    <div className="w-px h-3 bg-white/20" />
                    <div className="flex items-center space-x-1.5 text-emerald-400">
                        <ShoppingCart size={14} />
                        <span className="text-xs font-bold">{buyingSignalsCount} sinais</span>
                    </div>
                </div>

                <div className="flex bg-black/30 rounded-full p-0.5">
                    <button
                        onClick={() => setSpeaker('user')}
                        className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] transition-colors ${activeSpeaker === 'user' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <Mic size={10} />
                        <span>Eu</span>
                    </button>
                    <button
                        onClick={() => setSpeaker('lead')}
                        className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] transition-colors ${activeSpeaker === 'lead' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <User size={10} />
                        <span>Lead</span>
                    </button>
                </div>
            </div>

            {/* Recommended Action */}
            <div className="p-4">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-bold">
                    PRÓXIMO PASSO
                </div>
                <div className="font-medium text-sm mb-1">{nextStep}</div>
                <div className="text-indigo-300 text-xs italic">
                    "{nextStepQuestion}"
                </div>
            </div>
        </div>
    );
}

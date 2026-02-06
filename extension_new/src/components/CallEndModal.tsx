import { X, ExternalLink, Star } from 'lucide-react';
import { useCoachingStore } from '../stores/coaching-store';

export function CallEndModal() {
    const { showEndModal, setCallSummary, buyingSignalsCount } = useCoachingStore();

    if (!showEndModal) return null;

    return (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setCallSummary(false)}
            />

            {/* Modal */}
            <div className="relative bg-[#1A1B2E] text-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-white/10 animate-scale-in">
                {/* Header */}
                <div className="relative h-24 bg-gradient-to-br from-blue-600 to-indigo-700 flex flex-col items-center justify-center text-center p-4">
                    <h2 className="text-2xl font-bold mb-1">Call Finalizada!</h2>
                    <p className="text-blue-100 opacity-90 text-sm">Ótimo trabalho! Aqui está seu resumo.</p>
                    <button
                        onClick={() => setCallSummary(false)}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Score */}
                    <div className="flex items-center justify-center space-x-2">
                        <Star className="text-yellow-400 fill-yellow-400" size={24} />
                        <span className="text-3xl font-bold">85</span>
                        <span className="text-sm text-slate-400">/ 100</span>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-lg p-3 text-center border border-white/5">
                            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Sinais de Compra</div>
                            <div className="text-xl font-bold text-emerald-400">{buyingSignalsCount}</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3 text-center border border-white/5">
                            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Duração</div>
                            <div className="text-xl font-bold text-blue-300">12:30</div>
                        </div>
                    </div>

                    {/* Strengths */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-300 mb-2">Pontos Fortes</h4>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 text-xs rounded-full">Rapport Excelente</span>
                            <span className="px-2 py-1 bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 text-xs rounded-full">Contorno de Objeções</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            onClick={() => setCallSummary(false)}
                            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors text-sm"
                        >
                            Fechar
                        </button>
                        <a
                            href="http://localhost:3000/calls/123" // Example link
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors text-sm flex items-center justify-center space-x-2"
                        >
                            <span>Ver Dashboard</span>
                            <ExternalLink size={14} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

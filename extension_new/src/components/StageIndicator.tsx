import { useState } from 'react';
import { useCoachingStore } from '../stores/coaching-store';
import { ChevronDown, CheckCircle, PlayCircle, Circle } from 'lucide-react';

export function StageIndicator() {
    const { stages, currentStageIndex, setStage } = useCoachingStore();
    const [expanded, setExpanded] = useState(false);

    const currentStage = stages[currentStageIndex];
    const progress = Math.round(((currentStageIndex + 1) / stages.length) * 100);

    return (
        <div className="shrink-0 bg-[#1A1B2E] border-b border-white/10 text-white relative z-20">
            {/* Main Indicator */}
            <div
                className="px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                        <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">
                            Etapa {currentStageIndex + 1}/{stages.length}
                        </span>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </div>
                    <span className="text-xs font-mono text-slate-400">{progress}%</span>
                </div>

                <h3 className="font-bold text-lg leading-tight mb-2">{currentStage.name}</h3>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Dropdown */}
            {expanded && (
                <div className="absolute top-full left-0 w-full bg-[#252640] border-b border-white/10 shadow-xl max-h-64 overflow-y-auto custom-scrollbar">
                    {stages.map((stage, idx) => (
                        <div
                            key={stage.id}
                            onClick={() => {
                                setStage(idx);
                                setExpanded(false);
                            }}
                            className={`px-4 py-3 flex items-center space-x-3 cursor-pointer hover:bg-white/5 border-b border-white/5 last:border-0 ${idx === currentStageIndex ? 'bg-white/5' : ''
                                }`}
                        >
                            {idx < currentStageIndex ? (
                                <CheckCircle size={16} className="text-emerald-500" />
                            ) : idx === currentStageIndex ? (
                                <PlayCircle size={16} className="text-blue-400" />
                            ) : (
                                <Circle size={16} className="text-slate-600" />
                            )}

                            <span className={`text-sm ${idx === currentStageIndex ? 'text-white font-medium' : 'text-slate-400'
                                }`}>
                                {stage.name}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

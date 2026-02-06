import { Activity, Maximize2 } from 'lucide-react';
import { useCoachingStore } from '../stores/coaching-store';

export function MinimizedBar() {
    const { toggleMinimize, connectionStatus, cards } = useCoachingStore();
    // Check for recent high priority alerts (e.g., last 5 seconds)
    const hasUrgentAlert = cards.some(c =>
        !c.isDismissed &&
        (c.type === 'alert' || c.type === 'signal') &&
        Date.now() - c.timestamp < 5000
    );

    return (
        <div
            className={`fixed top-0 right-0 h-screen w-[48px] bg-[#1A1B2E] border-l border-white/10 flex flex-col items-center py-4 z-[2147483647] transition-all duration-300 ${hasUrgentAlert ? 'animate-pulse border-l-4 border-red-500' : ''
                }`}
            onClick={toggleMinimize}
        >
            <button className="mb-6 hover:bg-white/10 p-2 rounded text-white">
                <Maximize2 size={20} />
            </button>

            <div className={`w-3 h-3 rounded-full mb-6 ${connectionStatus === 'recording' ? 'bg-green-500 animate-pulse' :
                    connectionStatus === 'connected' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />

            <div className="flex-1 w-full flex items-center justify-center">
                <div className="rotate-90 whitespace-nowrap text-white font-bold tracking-widest text-xs opacity-50 flex items-center">
                    <Activity size={14} className="mr-2 -rotate-90" />
                    SALES COPILOT
                </div>
            </div>

            {hasUrgentAlert && (
                <div className="mt-4 w-2 h-2 bg-red-500 rounded-full" />
            )}
        </div>
    );
}

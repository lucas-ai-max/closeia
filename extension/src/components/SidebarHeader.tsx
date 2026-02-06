import { useEffect, useState } from 'react';
import { useCoachingStore } from '../stores/coaching-store';
import { Minimize2, Maximize2, Activity } from 'lucide-react';

export function SidebarHeader() {
    const { isMinimized, toggleMinimize, connectionStatus, startTime } = useCoachingStore();
    const [elapsed, setElapsed] = useState('00:00');

    useEffect(() => {
        if (!startTime) return;
        const interval = setInterval(() => {
            const seconds = Math.floor((Date.now() - startTime) / 1000);
            const m = Math.floor(seconds / 60).toString().padStart(2, '0');
            const s = (seconds % 60).toString().padStart(2, '0');
            setElapsed(`${m}:${s}`);
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    if (isMinimized) return null;

    return (
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/10 bg-[#1A1B2E] text-white shrink-0">
            <div className="flex items-center space-x-3">
                <Activity size={18} className="text-blue-400" />
                <span className="font-bold tracking-tight">SALES COPILOT</span>
                <div className={`w-2 h-2 rounded-full ${connectionStatus === 'recording' ? 'bg-green-500 animate-pulse' :
                        connectionStatus === 'connected' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
            </div>

            <div className="flex items-center space-x-3">
                <span className="font-mono text-sm opacity-80">{elapsed}</span>
                <button
                    onClick={toggleMinimize}
                    className="hover:bg-white/10 rounded p-1 transition-colors"
                >
                    <Minimize2 size={16} />
                </button>
            </div>
        </div>
    );
}

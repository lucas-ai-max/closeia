import { useEffect, useState } from 'react';
import { useCoachingStore } from '../stores/coaching-store';
import { SidebarHeader } from './SidebarHeader';
import { StageIndicator } from './StageIndicator';
import { CoachPanel } from './CoachPanel';
import { TranscriptMini } from './TranscriptMini';
import { NextStepFooter } from './NextStepFooter';
import { MinimizedBar } from './MinimizedBar';

export default function Sidebar() {
    const { isMinimized, isDark, toggleMinimize, setConnectionStatus, addCard, setStage, setLeadProfile, setCallSummary } = useCoachingStore();
    const [transcripts, setTranscripts] = useState<any[]>([]);

    useEffect(() => {
        // Mock connection status for demo if not driven by real events yet
        setConnectionStatus('recording');

        const listener = (msg: any) => {
            if (msg.type === 'TRANSCRIPT_UPDATE') {
                setTranscripts(prev => [...prev, { ...msg.data, speaker: 'lead' }]); // Mock speaker logic
            } else if (msg.type === 'STATUS_UPDATE') {
                if (msg.status === 'RECORDING') setConnectionStatus('recording');
                else if (msg.status === 'PROGRAMMED') setConnectionStatus('connected');
                else setConnectionStatus('disconnected');
            } else if (msg.type === 'COACHING_MESSAGE') {
                // Handle arbitrary coaching events 
                // In real app, these come from backend via WS -> Background -> Content
            }
        };
        chrome.runtime.onMessage.addListener(listener);
        return () => chrome.runtime.onMessage.removeListener(listener);
    }, []);

    // Also listen to window events if we want to simulate for dev
    useEffect(() => {
        const handleTest = (e: any) => {
            // e.g. window.postMessage({ type: 'TEST_CARD' }, '*')
        }
        window.addEventListener('message', handleTest);
        return () => window.removeEventListener('message', handleTest);
    }, []);

    if (isMinimized) {
        return <MinimizedBar />;
    }

    return (
        <div className={`h-full flex flex-col font-sans transition-colors duration-300 ${isDark ? 'bg-[#1A1B2E] text-white' : 'bg-white text-slate-900 border-l border-slate-200'
            }`}>
            <SidebarHeader />
            <StageIndicator />
            <CoachPanel />
            <TranscriptMini transcripts={transcripts} />
            <NextStepFooter />
        </div>
    );
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import SimpleSidebar from '@/components/SimpleSidebar';
import { startParticipantMonitoring, stopParticipantMonitoring, sendParticipantInfoNow, startMicStateMonitoring, stopMicStateMonitoring, getLeadName } from './meet-participants';
// import '@/index.css';

console.log('HelpSeller Content Script Loaded');

if (window.location.hostname === 'meet.google.com') {
    startParticipantMonitoring();
    startMicStateMonitoring();
    if (document.readyState !== 'complete') {
        window.addEventListener('load', () => startParticipantMonitoring());
    }
    // Ao sair/atualizar a página, pedir ao background para enviar call:end (backend finaliza a call)
    const tryEndCall = () => {
        chrome.runtime.sendMessage({ type: 'TRY_END_CALL' }).catch(() => {});
    };
    window.addEventListener('beforeunload', tryEndCall);
    window.addEventListener('pagehide', tryEndCall);
}

// Painel flutuante: posição (left/top) aplicada pelo SimpleSidebar
const host = document.createElement('div');
host.id = 'sales-copilot-root';
host.style.cssText = 'position:fixed;width:0;height:0;z-index:2147483647;transition: width 0.2s ease, height 0.2s ease;border-radius:12px;overflow:hidden;visibility:hidden;pointer-events:none;';
document.body.appendChild(host);

function setHostClosed(): void {
    host.style.width = '0';
    host.style.height = '0';
    host.style.visibility = 'hidden';
    host.style.pointerEvents = 'none';
    host.style.boxShadow = 'none';
    host.style.border = 'none';
}
function setHostOpen(): void {
    host.style.width = '360px';
    host.style.height = '80vh';
    host.style.visibility = 'visible';
    host.style.pointerEvents = 'auto';
    host.style.boxShadow = '0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,0,122,0.1)';
}

chrome.storage.local.get(['sidebarPosition', 'sidebarOpen'], (r: { sidebarPosition?: { left: number; top: number }; sidebarOpen?: boolean }) => {
    const pos = r.sidebarPosition;
    const defaultLeft = Math.max(0, window.innerWidth - 360 - 16);
    host.style.left = (pos?.left ?? defaultLeft) + 'px';
    host.style.top = (pos?.top ?? 16) + 'px';
    const open = r.sidebarOpen === true;
    if (!open) {
        setHostClosed();
        return;
    }
    chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (response: { session?: any } | undefined) => {
        if (!response?.session) {
            chrome.storage.local.set({ sidebarOpen: false }).catch(() => {});
            setHostClosed();
            return;
        }
        isOpen = true;
        setHostOpen();
    });
});
chrome.storage.onChanged.addListener((changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
    if (areaName === 'local' && changes.sidebarOpen?.newValue === false) {
        isOpen = false;
        setHostClosed();
    }
});

const shadow = host.attachShadow({ mode: 'open' });

// Inject complete CSS directly - no external dependencies
const style = document.createElement('style');
style.textContent = `
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }
    
    :host {
        display: block;
        width: 100%;
        height: 100%;
        min-height: 0;
    }

    :host > div {
        min-height: 0;
        height: 100%;
    }

    body, div, span, button, input, p, h1, h2, h3, h4 {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.5;
    }
    
    /* Container base */
    .h-full { height: 100%; }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .space-x-2 > * + * { margin-left: 0.5rem; }
    .space-x-3 > * + * { margin-left: 0.75rem; }
    .space-y-1 > * + * { margin-top: 0.25rem; }
    .space-y-2 > * + * { margin-top: 0.5rem; }
    
    /* Colors - black + pink theme */
    .bg-\\[\\#1A1B2E\\] { background-color: #0d0d0d; }
    .bg-\\[\\#252640\\] { background-color: #1a1a1a; }
    .text-white { color: white; }
    .text-blue-400 { color: #ff007a; }
    .text-slate-400 { color: #a1a1aa; }
    .text-slate-300 { color: #d4d4d8; }
    .text-emerald-400 { color: #ff007a; }
    
    /* Borders */
    .border-b { border-bottom-width: 1px; }
    .border-white\\/10 { border-color: rgba(255, 0, 122, 0.15); }
    .border-white\\/5 { border-color: rgba(255, 0, 122, 0.08); }
    
    /* Padding & Margin */
    .p-1 { padding: 0.25rem; }
    .p-2 { padding: 0.5rem; }
    .p-3 { padding: 0.75rem; }
    .p-4 { padding: 1rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
    .mb-1 { margin-bottom: 0.25rem; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-3 { margin-bottom: 0.75rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    
    /* Sizing */
    .h-14 { height: 3.5rem; }
    .w-2 { width: 0.5rem; }
    .w-3 { width: 0.75rem; }
    .h-2 { height: 0.5rem; }
    .h-3 { height: 0.75rem; }
    .shrink-0 { flex-shrink: 0; }
    .flex-1 { flex: 1 1 0%; }
    
    /* Text */
    .text-xs { font-size: 0.75rem; }
    .text-sm { font-size: 0.875rem; }
    .text-lg { font-size: 1.125rem; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .font-medium { font-weight: 500; }
    .font-mono { font-family: ui-monospace, monospace; }
    .uppercase { text-transform: uppercase; }
    .tracking-tight { letter-spacing: -0.025em; }
    .tracking-wider { letter-spacing: 0.05em; }
    .leading-tight { line-height: 1.25; }
    .leading-relaxed { line-height: 1.625; }
    
    /* Effects */
    .rounded { border-radius: 0.25rem; }
    .rounded-lg { border-radius: 0.5rem; }
    .rounded-full { border-radius: 9999px; }
    .opacity-50 { opacity: 0.5; }
    .opacity-80 { opacity: 0.8; }
    .opacity-90 { opacity: 0.9; }
    
    /* Transitions */
    .transition-colors { transition-property: color, background-color, border-color; transition-duration: 150ms; }
    .transition-all { transition-property: all; transition-duration: 150ms; }
    .duration-300 { transition-duration: 300ms; }
    
    /* Hover states */
    .hover\\:bg-white\\/10:hover { background-color: rgba(255, 255, 255, 0.1); }
    .hover\\:bg-white\\/5:hover { background-color: rgba(255, 255, 255, 0.05); }
    
    /* Cursor */
    .cursor-pointer { cursor: pointer; }
    
    /* Overflow */
    .overflow-y-auto { overflow-y: auto; }
    .overflow-hidden { overflow: hidden; }
    
    /* Position */
    .relative { position: relative; }
    .fixed { position: fixed; }
    
    /* Animations */
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    
    .bg-green-500 { background-color: #22c55e; }
    .bg-yellow-500 { background-color: #eab308; }
    .bg-red-500 { background-color: #ef4444; }
    
    /* Scrollbar */
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.1);
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 0, 122, 0.35);
        border-radius: 3px;
    }
`;
shadow.appendChild(style);

// We arguably need to inject tailwind base styles too or use a constructed stylesheet.
// For simplicity in this step, assuming index.css build output works or we use inline styles for critical layout containers.

const root = ReactDOM.createRoot(shadow);

// Sidebar starts closed; never auto-opens. User opens via popup or (if no popup) icon click.
let isOpen = false;

function persistSidebarOpen(open: boolean): void {
    chrome.storage.local.set({ sidebarOpen: open }).catch(() => {});
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    console.log('Content script received message:', msg.type);

    if (msg.type === 'TOGGLE_SIDEBAR_TRUSTED') {
        isOpen = !isOpen;
        if (isOpen) setHostOpen();
        else setHostClosed();
        persistSidebarOpen(isOpen);
        console.log('Sidebar toggled (trusted):', isOpen ? 'OPEN' : 'CLOSED');
    } else if (msg.type === 'TOGGLE_SIDEBAR') {
        if (!isOpen) {
            chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (response: { session?: any } | undefined) => {
                if (!response?.session) return;
                isOpen = true;
                setHostOpen();
                persistSidebarOpen(true);
                console.log('Sidebar toggled: OPEN');
            });
        } else {
            isOpen = false;
            setHostClosed();
            persistSidebarOpen(false);
            console.log('Sidebar toggled: CLOSED');
        }
    } else if (msg.type === 'OPEN_SIDEBAR') {
        chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (response: { session?: any } | undefined) => {
            if (!response?.session) return;
            isOpen = true;
            setHostOpen();
            persistSidebarOpen(true);
            console.log('Sidebar opened');
        });
    } else if (msg.type === 'CLOSE_SIDEBAR') {
        isOpen = false;
        setHostClosed();
        persistSidebarOpen(false);
        console.log('Sidebar closed');
    } else if (msg.type === 'GET_SIDEBAR_OPEN') {
        sendResponse({ open: isOpen });
        return true;
    } else if (msg.type === 'GET_ACTIVE_SPEAKER') {
        const leadName = getLeadName();
        sendResponse({ activeSpeaker: leadName });
        return true;
    } else if (msg.type === 'STATUS_UPDATE' && window.location.hostname === 'meet.google.com') {
        if (msg.status === 'RECORDING') {
            sendParticipantInfoNow();
        } else if (msg.status === 'PROGRAMMED' || msg.status === 'ERROR') {
            stopParticipantMonitoring();
            stopMicStateMonitoring();
        }
    }
});

console.log('Rendering Sidebar component...');

root.render(
    <React.StrictMode>
        <SimpleSidebar />
    </React.StrictMode>
);

console.log('Sidebar component rendered. Host element:', host);

// Auto-open logic removed to require user interaction
// setTimeout(() => {
//     console.log('Auto-opening sidebar on Google Meet...');
//     isOpen = true;
//     host.style.width = '360px';

//     // Notify background to start capture if user is logged in
//     chrome.runtime.sendMessage({ type: 'START_CAPTURE' }).catch(() => {
//         console.log('Background not ready or user not logged in');
//     });
// }, 2000); // 2 second delay


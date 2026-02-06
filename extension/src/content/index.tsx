import React from 'react';
import ReactDOM from 'react-dom/client';
import SimpleSidebar from '@/components/SimpleSidebar';
// import '@/index.css';

console.log('Sales Copilot Content Script Loaded');

// Shadow DOM Injection
const host = document.createElement('div');
host.id = 'sales-copilot-root';
host.style.cssText = 'position:fixed;top:0;right:0;width:0px;height:100vh;z-index:2147483647;transition: width 0.3s ease-in-out;'; // Start with 0 width
document.body.appendChild(host);

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
        all: initial;
        display: block;
        width: 100%;
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
    
    /* Colors */
    .bg-\\[\\#1A1B2E\\] { background-color: #1A1B2E; }
    .bg-\\[\\#252640\\] { background-color: #252640; }
    .text-white { color: white; }
    .text-blue-400 { color: #60a5fa; }
    .text-slate-400 { color: #94a3b8; }
    .text-slate-300 { color: #cbd5e1; }
    .text-emerald-400 { color: #34d399; }
    
    /* Borders */
    .border-b { border-bottom-width: 1px; }
    .border-white\\/10 { border-color: rgba(255, 255, 255, 0.1); }
    .border-white\\/5 { border-color: rgba(255, 255, 255, 0.05); }
    
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
        background: rgba(255, 255, 255, 0.3);
        border-radius: 3px;
    }
`;
shadow.appendChild(style);

// We arguably need to inject tailwind base styles too or use a constructed stylesheet.
// For simplicity in this step, assuming index.css build output works or we use inline styles for critical layout containers.

const root = ReactDOM.createRoot(shadow);

// Message Listener to toggle sidebar
let isOpen = false;

chrome.runtime.onMessage.addListener((msg) => {
    console.log('Content script received message:', msg.type);

    if (msg.type === 'TOGGLE_SIDEBAR') {
        isOpen = !isOpen;
        host.style.width = isOpen ? '360px' : '0px';
        console.log('Sidebar toggled:', isOpen ? 'OPEN' : 'CLOSED');
    } else if (msg.type === 'OPEN_SIDEBAR') {
        isOpen = true;
        host.style.width = '360px'; // Expand
        console.log('Sidebar opened');
    } else if (msg.type === 'CLOSE_SIDEBAR') {
        isOpen = false;
        host.style.width = '0px';
        console.log('Sidebar closed');
    }
});

console.log('Rendering Sidebar component...');

root.render(
    <React.StrictMode>
        <SimpleSidebar />
    </React.StrictMode>
);

console.log('Sidebar component rendered. Host element:', host);

// Auto-open sidebar after a short delay (to ensure page is ready)
setTimeout(() => {
    console.log('Auto-opening sidebar on Google Meet...');
    isOpen = true;
    host.style.width = '360px';

    // Notify background to start capture if user is logged in
    chrome.runtime.sendMessage({ type: 'START_CAPTURE' }).catch(() => {
        console.log('Background not ready or user not logged in');
    });
}, 2000); // 2 second delay


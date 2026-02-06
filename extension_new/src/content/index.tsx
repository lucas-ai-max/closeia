import React from 'react';
import ReactDOM from 'react-dom/client';
import Sidebar from '@/components/Sidebar';
// import '@/index.css';

console.log('Sales Copilot Content Script Loaded');

// Shadow DOM Injection
const host = document.createElement('div');
host.id = 'sales-copilot-root';
host.style.cssText = 'position:fixed;top:0;right:0;width:0px;height:100vh;z-index:2147483647;transition: width 0.3s ease-in-out;'; // Start with 0 width
document.body.appendChild(host);

const shadow = host.attachShadow({ mode: 'open' });

// Inject styles into Shadow DOM
// In dev (CRXJS), styles are injected differently. In prod, we look for manifest css.
// For now, we manually fetch index.css content if needed or use CRXJS magic.
// CRXJS usually handles css injection, but into main page. Shadow DOM needs explicit style tag.
// We will use a link to the web accessible resource.

const styleLink = document.createElement('link');
styleLink.rel = 'stylesheet';
styleLink.href = chrome.runtime.getURL('src/index.css');
shadow.appendChild(styleLink);

// We arguably need to inject tailwind base styles too or use a constructed stylesheet.
// For simplicity in this step, assuming index.css build output works or we use inline styles for critical layout containers.

const root = ReactDOM.createRoot(shadow);

// Message Listener to toggle sidebar
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'OPEN_SIDEBAR') {
        host.style.width = '360px'; // Expand
    } else if (msg.type === 'CLOSE_SIDEBAR') {
        host.style.width = '0px';
    }
});

root.render(
    <React.StrictMode>
        <Sidebar />
    </React.StrictMode>
);

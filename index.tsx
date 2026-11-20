
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './translations.more';

// Google Maps Platform client-side auth/quota failure detection
if (typeof window !== 'undefined') {
  (window as any).gm_authFailure = () => {
    window.dispatchEvent(new Event('gmp-quota-exceeded'));
  };
  const origConsoleError = console.error;
  console.error = (...args: any[]) => {
    origConsoleError.apply(console, args);
    const msg = args.map((a) => String(a ?? '')).join(' ');
    if (msg.includes('OverQuotaMapError') || msg.includes('QuotaExceededError')) {
      window.dispatchEvent(new Event('gmp-quota-exceeded'));
    }
  };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

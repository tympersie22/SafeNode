import React from 'react';
import ReactDOM from 'react-dom/client';
import { initSentry } from './services/sentryService';
import AppRouter from './AppRouter';
import './index.css';

// Initialize Sentry (must be first, but doesn't block render)
try {
  initSentry();
} catch (error) {
  // Sentry initialization failed, but app can still run
  console.warn('Sentry initialization failed:', error);
}

// Error boundary for debugging (Sentry will handle these, but keep for development)
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);
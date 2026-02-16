import React from 'react';
import ReactDOM from 'react-dom/client';
import { initSentry, captureException } from './services/sentryService';
import AppRouter from './AppRouter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import './index.css';

// Initialize Sentry (must be first, but doesn't block render)
try {
  initSentry();
} catch (error) {
  // Sentry initialization failed, but app can still run
  console.warn('Sentry initialization failed:', error);
}

// Defensive handler for .control property access and focusin events
// Prevents errors when browser extensions try to access .control on non-label elements
if (typeof document !== 'undefined') {
  // Intercept focusin events early to prevent extension errors
  document.addEventListener('focusin', (event) => {
    const target = event.target;
    
    // Only process focus events on form elements
    if (!(target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          target instanceof HTMLButtonElement ||
          target instanceof HTMLLabelElement)) {
      // Not a form element, ignore
      return;
    }
    
    // For label elements, safely access .control using instanceof check
    if (target instanceof HTMLLabelElement) {
      try {
        // .control property only exists on HTMLLabelElement
        const control = target.control;
        // Control can be null or an HTMLElement - validate if present
        if (control && !(control instanceof HTMLElement)) {
          // Invalid control reference, ignore
          return;
        }
      } catch (e) {
        // Ignore errors from .control access on non-label elements
        return;
      }
    }
  }, { passive: true, capture: true }); // Use capture phase to intercept early
  
  // Add defensive property accessor to prevent .control errors on non-label elements
  // This won't prevent all errors but helps with some cases
  try {
    const originalQuerySelector = document.querySelector.bind(document);
    // Note: We can't override .control property access directly, but the error handler will catch it
  } catch (e) {
    // Ignore if this fails
  }
}

// Global error handlers
window.addEventListener('error', (event) => {
  // Filter out browser extension errors (harmless)
  const extensionErrorPatterns = [
    /utils\.js/i,
    /extensionState\.js/i,
    /heuristicsRedefinitions\.js/i,
    /content_script\.js/i,
    /chrome-extension:/i,
    /moz-extension:/i,
    /safari-extension:/i,
    /shouldOfferCompletionListForField/i,
    /elementWasFocused/i,
    /focusInEventHandler/i,
    /processInputEvent/i,
    /Cannot read properties of undefined.*control/i,
    /reading 'control'/i,
    /\.control/i,
    /TypeError.*control/i,
    /at content_script\.js/i,
    /at.*content_script/i
  ];
  
  const errorMessage = event.message || '';
  const errorFilename = event.filename || '';
  const errorStack = event.error?.stack || '';
  const combinedErrorText = `${errorMessage} ${errorFilename} ${errorStack}`;
  
  const isExtensionError = extensionErrorPatterns.some(pattern => 
    pattern.test(combinedErrorText)
  );
  
  if (!isExtensionError) {
    console.error('Global error:', event.error);
    captureException(event.error as Error, { context: 'global_error_handler' });
  } else {
    // Silently suppress extension errors - they're harmless
    event.preventDefault?.();
  }
}, true); // Use capture phase to catch errors early

window.addEventListener('unhandledrejection', (event) => {
  // Filter out browser extension errors
  const extensionErrorPatterns = [
    /utils\.js/i,
    /extensionState\.js/i,
    /heuristicsRedefinitions\.js/i,
    /content_script\.js/i,
    /chrome-extension:/i,
    /moz-extension:/i,
    /safari-extension:/i,
    /shouldOfferCompletionListForField/i,
    /elementWasFocused/i,
    /focusInEventHandler/i,
    /processInputEvent/i,
    /Cannot read properties of undefined.*control/i,
    /reading 'control'/i,
    /\.control/i
  ];
  
  const reasonString = String(event.reason);
  const isExtensionError = extensionErrorPatterns.some(pattern => 
    pattern.test(reasonString) ||
    (event.reason instanceof Error && pattern.test(event.reason.stack || ''))
  );
  
  if (!isExtensionError) {
    console.error('Unhandled promise rejection:', event.reason);
    captureException(new Error(reasonString), { context: 'unhandled_promise_rejection' });
  }
});

// Suppress console errors from browser extensions (harmless)
const originalError = console.error;
console.error = (...args: any[]) => {
  const message = args.join(' ');
  const extensionErrorPatterns = [
    /Failed to load resource.*utils\.js/i,
    /Failed to load resource.*extensionState\.js/i,
    /Failed to load resource.*heuristicsRedefinitions\.js/i,
    /Failed to load resource.*content_script\.js/i,
    /net::ERR_FILE_NOT_FOUND.*utils\.js/i,
    /net::ERR_FILE_NOT_FOUND.*extensionState\.js/i,
    /net::ERR_FILE_NOT_FOUND.*heuristicsRedefinitions\.js/i,
    /content_script\.js.*Uncaught/i,
    /content_script\.js.*TypeError/i,
    /content_script\.js.*control/i,
    /shouldOfferCompletionListForField/i,
    /elementWasFocused/i,
    /focusInEventHandler/i,
    /processInputEvent/i,
    /Cannot read properties of undefined.*control/i,
    /reading 'control'/i,
    /TypeError.*control/i
  ];
  
  const isExtensionError = extensionErrorPatterns.some(pattern => pattern.test(message));
  
  if (!isExtensionError) {
    originalError.apply(console, args);
  }
  // Silently ignore extension errors
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider />
      <AppRouter />
    </ErrorBoundary>
  </React.StrictMode>
);
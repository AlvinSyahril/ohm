import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const reportedMessages = new Set<string>();

function reportClientError(eventName: string, message: string, stack?: string, context?: Record<string, unknown>) {
  if (!message || message.includes('ResizeObserver loop') || reportedMessages.has(message)) return;
  reportedMessages.add(message);
  if (reportedMessages.size > 50) reportedMessages.clear();

  const body = JSON.stringify({ event: eventName, message, stack, context });
  fetch('/api/client-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Logging must stay silent if backend is shutting down
  });
}

window.addEventListener('error', (event) => {
  const err = event.error instanceof Error ? event.error : null;
  const message = err?.message || event.message || 'Uncaught window error';
  reportClientError('window-error', message, err?.stack, {
    filename: event.filename || null,
    lineno: event.lineno || null,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (reason && typeof reason === 'object' && 'name' in reason && reason.name === 'AbortError') return;
  const err = reason instanceof Error ? reason : null;
  const message = err?.message || (typeof reason === 'string' ? reason : 'Unhandled promise rejection');
  reportClientError('unhandled-rejection', message, err?.stack);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

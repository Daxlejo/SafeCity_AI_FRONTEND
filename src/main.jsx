import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';
import './styles/index.css';
import './styles/dynamic-form.css';

// ─── Service Worker Registration (PWA) ──────────────────────────────────────
// Registers the SW only in production to avoid caching issues during development.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((reg) => console.info('[SW] Registered:', reg.scope))
      .catch((err) => console.warn('[SW] Registration failed:', err));
  });
}

// ─── Push Notification Permission Request ────────────────────────────────────
// Request permission on first interaction (avoids blocking auto-prompt).
// See public/service-worker.js for VAPID backend integration steps.
if ('Notification' in window && Notification.permission === 'default') {
  document.addEventListener(
    'click',
    () => {
      Notification.requestPermission().then((permission) => {
        console.info('[Push] Notification permission:', permission);
      });
    },
    { once: true }
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);

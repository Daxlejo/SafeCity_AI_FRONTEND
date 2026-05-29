import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, Car, AlertCircle, Info, X, CheckCircle } from 'lucide-react';

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext(null);

// ─── Toast type configuration ────────────────────────────────────────────────

const TOAST_CONFIG = {
  alert:   { icon: ShieldAlert,   color: 'var(--error)',   bg: 'var(--error-bg)' },
  warning: { icon: Car,           color: 'var(--warning)', bg: 'var(--warning-bg)' },
  info:    { icon: Info,          color: 'var(--info)',    bg: 'var(--info-bg)' },
  success: { icon: CheckCircle,   color: 'var(--success)', bg: 'var(--success-bg)' },
  default: { icon: AlertCircle,   color: 'var(--accent)',  bg: 'var(--accent-glow)' },
};

const AUTO_DISMISS_MS = 4500;

// ─── Individual Toast Item ────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }) {
  const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.default;
  const IconComp = config.icon;

  return (
    <div
      className={`toast-item ${toast.exiting ? 'toast-exit' : 'toast-enter'}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="toast-icon-wrap" style={{ background: config.bg }}>
        <IconComp size={16} style={{ color: config.color, flexShrink: 0 }} />
      </div>
      <div className="toast-body">
        <span className="toast-message">{toast.message}</span>
      </div>
      <button
        className="toast-close"
        onClick={() => onDismiss(toast.id)}
        aria-label="Cerrar notificación"
      >
        <X size={13} />
      </button>
    </div>
  );
}

// ─── Toast Container (portal to body) ────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="toast-container" aria-label="Notificaciones">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timerRefs = useRef({});
  const counterRef = useRef(0);

  const dismiss = useCallback((id) => {
    // Mark as exiting to trigger animation, then remove
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    clearTimeout(timerRefs.current[id]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      delete timerRefs.current[id];
    }, 300);
  }, []);

  const showToast = useCallback((message, type = 'default') => {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev.slice(-3), { id, message, type, exiting: false }]);

    timerRefs.current[id] = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

import { useEffect, useRef, useCallback } from 'react';

// ═══════════════════════════════════════════
// HOOK: useInactivityTimer
// ═══════════════════════════════════════════
// Escucha eventos de actividad del usuario (mouse, teclado, touch).
// Si pasan `timeoutMs` sin ningún evento, ejecuta `onTimeout`.
// 2 minutos antes del timeout, ejecuta `onWarning` para mostrar
// un aviso al usuario.
//
// Uso:
//   useInactivityTimer({
//     onTimeout: () => logout(),
//     onWarning: () => showToast('Tu sesión cerrará pronto...'),
//     timeoutMs: 20 * 60 * 1000,       // 20 minutos
//     warningBeforeMs: 2 * 60 * 1000,   // avisar 2 min antes
//     enabled: !!user,                   // solo si hay sesión activa
//   });
// ═══════════════════════════════════════════

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'];

/**
 * Hook de inactividad — cierra sesión automáticamente tras un periodo
 * sin interacción del usuario.
 *
 * @param {Object} options
 * @param {Function} options.onTimeout   — Callback al expirar la inactividad
 * @param {Function} options.onWarning   — Callback 2 min antes del timeout
 * @param {number}   options.timeoutMs   — Milisegundos de inactividad (default 20 min)
 * @param {number}   options.warningBeforeMs — Ms antes del timeout para avisar (default 2 min)
 * @param {boolean}  options.enabled     — Activa/desactiva el timer
 */
export default function useInactivityTimer({
  onTimeout,
  onWarning,
  timeoutMs = 20 * 60 * 1000,
  warningBeforeMs = 2 * 60 * 1000,
  enabled = true,
} = {}) {
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const warningFiredRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
  }, []);

  const resetTimers = useCallback(() => {
    clearTimers();
    warningFiredRef.current = false;

    // Programar aviso de advertencia (2 min antes del timeout)
    const warningDelay = timeoutMs - warningBeforeMs;
    if (warningDelay > 0 && onWarning) {
      warningRef.current = setTimeout(() => {
        warningFiredRef.current = true;
        onWarning();
      }, warningDelay);
    }

    // Programar cierre de sesión por inactividad
    timeoutRef.current = setTimeout(() => {
      if (onTimeout) onTimeout();
    }, timeoutMs);
  }, [clearTimers, timeoutMs, warningBeforeMs, onTimeout, onWarning]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    // Handler: cualquier actividad reinicia los timers
    const handleActivity = () => resetTimers();

    // Registrar listeners de actividad
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Iniciar timers al montar
    resetTimers();

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, resetTimers, clearTimers]);
}

import { useState, useEffect, useCallback } from 'react';
import { reportsAPI } from '../services/api';

// ═══════════════════════════════════════════
// HOOK: useReportQuota
// ═══════════════════════════════════════════
// Consume el endpoint GET /api/reports/quota (Agente 1)
// y expone los datos de cuota del usuario actual.
//
// Retorna:
//   { quota, loading, error, refresh }
//
// quota = { limit, used, remaining, resetsAt }
// ═══════════════════════════════════════════

/**
 * Hook que obtiene la cuota de reportes del usuario autenticado.
 *
 * @param {boolean} enabled — Si es false, no hace la petición (ej: usuario no autenticado)
 * @returns {{ quota: Object|null, loading: boolean, error: string|null, refresh: Function }}
 */
export default function useReportQuota(enabled = true) {
  const [quota, setQuota] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchQuota = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await reportsAPI.getQuota();
      setQuota(res.data);
    } catch (err) {
      // Si el endpoint aún no existe (Agente 1 no lo ha creado),
      // fallback silencioso para no romper la UI
      if (err.response?.status === 404) {
        setQuota({ limit: 5, used: 0, remaining: 5, resetsAt: null });
      } else {
        setError(err.response?.data?.message || 'Error al obtener cuota de reportes');
      }
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchQuota();
  }, [fetchQuota]);

  return { quota, loading, error, refresh: fetchQuota };
}

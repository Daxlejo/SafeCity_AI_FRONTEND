import { useState, useEffect, useCallback } from 'react';
import { statsAPI } from '../services/api';

/**
 * Hook: consume GET /api/stats/heatmap y GET /api/stats/dangerous-zone-week.
 * Expone { points, dangerousZone, loading, error, refresh }.
 *
 * - points: Array de { latitude, longitude, intensity, incidentType }
 * - dangerousZone: { latitude, longitude, radiusMeters, reportCount, topIncidentType, label } | null
 * - loading: boolean
 * - error: string | null
 * - refresh: función para recargar los datos manualmente
 */
export default function useHeatmapData() {
  const [points, setPoints] = useState([]);
  const [dangerousZone, setDangerousZone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Ejecutar ambas peticiones en paralelo
      const [heatmapRes, zoneRes] = await Promise.allSettled([
        statsAPI.getHeatmap(),
        statsAPI.getDangerousZoneWeek(),
      ]);

      // Heatmap points
      if (heatmapRes.status === 'fulfilled') {
        setPoints(heatmapRes.value.data || []);
      } else {
        console.error('Error cargando heatmap:', heatmapRes.reason);
        setPoints([]);
      }

      // Zona peligrosa de la semana (puede ser 204 No Content)
      if (zoneRes.status === 'fulfilled' && zoneRes.value.data) {
        setDangerousZone(zoneRes.value.data);
      } else {
        setDangerousZone(null);
      }
    } catch (err) {
      console.error('Error en useHeatmapData:', err);
      setError('No se pudieron cargar los datos del mapa de calor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { points, dangerousZone, loading, error, refresh: fetchData };
}

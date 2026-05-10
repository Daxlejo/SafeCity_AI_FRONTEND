import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.heat';

/**
 * Componente Leaflet que integra leaflet.heat para renderizar
 * el mapa de calor sobre el mapa existente.
 *
 * Props:
 * - map: instancia de L.map (requerida)
 * - points: Array de { latitude, longitude, intensity, incidentType }
 * - visible: boolean — controla si la capa se muestra o se oculta
 *
 * La capa se agrega/remueve dinámicamente según la prop `visible`.
 * Los puntos se transforman a [lat, lng, intensity] para leaflet.heat.
 */
export default function HeatmapLayer({ map, points, visible }) {
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    // Si no es visible, remover la capa existente
    if (!visible) {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      return;
    }

    // Transformar puntos al formato de leaflet.heat: [lat, lng, intensity]
    const heatPoints = (points || [])
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => [p.latitude, p.longitude, p.intensity || 1]);

    // Si ya existe una capa, actualizarla; si no, crear una nueva
    if (heatLayerRef.current) {
      heatLayerRef.current.setLatLngs(heatPoints);
    } else {
      heatLayerRef.current = L.heatLayer(heatPoints, {
        // ═══ Configuración visual del heatmap ═══
        radius: 25,          // Radio de cada punto en píxeles
        blur: 20,            // Difuminado de bordes
        maxZoom: 17,         // Zoom máximo al que se aplica la intensidad
        max: 10,             // Valor máximo de intensidad para normalización
        minOpacity: 0.35,    // Opacidad mínima del gradiente
        gradient: {
          // Gradiente premium: azul → cian → verde → amarillo → rojo
          0.0: '#1e3a5f',
          0.2: '#2563eb',
          0.4: '#06b6d4',
          0.6: '#10b981',
          0.75: '#f59e0b',
          0.9: '#ef4444',
          1.0: '#dc2626',
        },
      }).addTo(map);
    }

    // Cleanup: remover la capa al desmontar
    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, points, visible]);

  // Este componente no renderiza DOM propio — opera directamente sobre el mapa Leaflet
  return null;
}

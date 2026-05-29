import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { AlertTriangle, MapPin, TrendingUp } from 'lucide-react';

/**
 * Tarjeta/banner flotante que muestra la zona más peligrosa de la semana.
 * Se renderiza sobre el mapa como overlay y dibuja un círculo rojo
 * en la zona indicada.
 *
 * Props:
 * - map: instancia de L.map (requerida)
 * - zone: DangerousZoneSummaryDTO | null
 *   { latitude, longitude, radiusMeters, reportCount, topIncidentType, label }
 * - visible: boolean — se muestra solo cuando el heatmap está activo
 * - onFlyTo: función opcional para hacer flyTo a la zona
 */

// Etiquetas en español para tipos de incidente
const INCIDENT_LABELS = {
  ROBBERY: 'Robo / Hurto',
  ACCIDENT: 'Accidente de Tránsito',
  TRAFFIC: 'Congestión Vial',
  TRANSIT_OP: 'Operativo de Tránsito',
  OTHER: 'Otro Incidente',
};

export default function DangerousZoneBanner({ map, zone, visible }) {
  const circleRef = useRef(null);

  // Dibujar/remover círculo de zona peligrosa en el mapa
  useEffect(() => {
    if (!map) return;

    // Remover círculo anterior
    if (circleRef.current) {
      map.removeLayer(circleRef.current);
      circleRef.current = null;
    }

    // Solo dibujar si visible y hay zona
    if (visible && zone && zone.latitude && zone.longitude) {
      circleRef.current = L.circle([zone.latitude, zone.longitude], {
        radius: zone.radiusMeters || 100,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '8, 4',
        className: 'dangerous-zone-circle',
      }).addTo(map);

      // Popup informativo en el círculo
      const typeLabel = INCIDENT_LABELS[zone.topIncidentType] || zone.topIncidentType;
      circleRef.current.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:160px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="background:rgba(239,68,68,0.15);color:#ef4444;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">⚠️ ZONA PELIGROSA</span>
          </div>
          <p style="font-size:12px;color:#94a3b8;margin:4px 0;">
            ${zone.reportCount} incidentes esta semana
          </p>
          <p style="font-size:11px;color:#64748b;">
            Tipo principal: <strong style="color:#f87171;">${typeLabel}</strong>
          </p>
        </div>
      `);
    }

    return () => {
      if (circleRef.current) {
        map.removeLayer(circleRef.current);
        circleRef.current = null;
      }
    };
  }, [map, zone, visible]);

  // No renderizar si no es visible o no hay datos
  if (!visible || !zone) return null;

  const typeLabel = INCIDENT_LABELS[zone.topIncidentType] || zone.topIncidentType;

  const handleFlyTo = () => {
    if (map && zone.latitude && zone.longitude) {
      map.flyTo([zone.latitude, zone.longitude], 16, { duration: 1.2 });
    }
  };

  return (
    <div className="dangerous-zone-banner" onClick={handleFlyTo}>
      <div className="dangerous-zone-banner-icon">
        <AlertTriangle size={18} />
      </div>
      <div className="dangerous-zone-banner-content">
        <div className="dangerous-zone-banner-title">
          Zona más peligrosa de la semana
        </div>
        <div className="dangerous-zone-banner-details">
          <span className="dangerous-zone-banner-stat">
            <TrendingUp size={12} />
            {zone.reportCount} incidentes
          </span>
          <span className="dangerous-zone-banner-type">
            <MapPin size={12} />
            {typeLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { reportsAPI } from '../services/api';
import { connectWebSocket, disconnectWebSocket, isConnected } from '../services/websocket';
import {
  MapPin, Send, Crosshair, Plus, X, Lock
} from 'lucide-react';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const INCIDENT_TYPES = [
  { value: 'ROBBERY', label: 'Robo', color: '#ef4444' },
  { value: 'ACCIDENT', label: 'Accidente', color: '#f59e0b' },
  { value: 'TRAFFIC', label: 'Tráfico', color: '#eab308' },
  { value: 'TRANSIT_OP', label: 'Op. Tránsito', color: '#3b82f6' },
  { value: 'OTHER', label: 'Otro', color: '#64748b' },
];

function getIncidentColor(type) {
  return INCIDENT_TYPES.find((t) => t.value === type)?.color || '#64748b';
}

function createColoredIcon(color) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:12px;height:12px;background:${color};border:2px solid rgba(255,255,255,0.9);border-radius:50%;box-shadow:0 0 8px ${color}80;"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

// Tile URLs por tema
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

export default function MapView({
  reports, setReports, wsConnected, setWsConnected,
  section, isAuthenticated, reportMode, setReportMode, theme
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef([]);
  const selectedMarkerRef = useRef(null);
  const reportModeRef = useRef(reportMode);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('ROBBERY');
  const [submitting, setSubmitting] = useState(false);

  // Sincronizar ref con prop para evitar stale closure en el click handler
  useEffect(() => { reportModeRef.current = reportMode; }, [reportMode]);

  // Inicializar mapa
  useEffect(() => {
    if (section !== 'main' || mapInstance.current || !mapRef.current) return;

    mapInstance.current = L.map(mapRef.current, { zoomControl: true }).setView([1.2136, -77.2811], 14);

    const tileUrl = theme === 'light' ? TILE_LIGHT : TILE_DARK;
    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution: '&copy; CARTO',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    // Click en mapa solo funciona en report mode (usa ref para evitar stale closure)
    mapInstance.current.on('click', (e) => {
      if (!reportModeRef.current) return;
      const { lat, lng } = e.latlng;
      setSelectedLocation({ lat, lng });
      if (selectedMarkerRef.current) {
        selectedMarkerRef.current.setLatLng([lat, lng]);
      } else {
        selectedMarkerRef.current = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: `<div style="width:16px;height:16px;background:#6366f1;border:3px solid white;border-radius:50%;box-shadow:0 0 12px rgba(99,102,241,0.6);"></div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
        }).addTo(mapInstance.current).bindPopup('Ubicación seleccionada').openPopup();
      }
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        tileLayerRef.current = null;
      }
    };
  }, [section]);

  // Cambiar tiles cuando cambia el tema
  useEffect(() => {
    if (section !== 'main' || !mapInstance.current || !tileLayerRef.current) return;
    const tileUrl = theme === 'light' ? TILE_LIGHT : TILE_DARK;
    tileLayerRef.current.setUrl(tileUrl);
  }, [theme, section]);

  // Renderizar markers
  const renderMarkers = useCallback((data) => {
    if (!mapInstance.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    data.forEach((r) => {
      if (!r.latitude || !r.longitude) return;
      const color = getIncidentColor(r.incidentType);
      const trustPercent = r.trustScore != null ? r.trustScore.toFixed(0) : '—';
      const trustColor = r.trustScore >= 60 ? '#10b981' : r.trustScore >= 40 ? '#f59e0b' : '#ef4444';

      const m = L.marker([r.latitude, r.longitude], { icon: createColoredIcon(color) }).bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:180px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="background:${color}20;color:${color};padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;text-transform:uppercase;">${r.incidentType}</span>
            <span style="background:${r.status === 'VERIFIED' ? '#10b98120' : '#f59e0b20'};color:${r.status === 'VERIFIED' ? '#10b981' : '#f59e0b'};padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;">${r.status}</span>
          </div>
          <p style="font-size:12px;color:#94a3b8;margin:4px 0;">${r.description || 'Sin descripción'}</p>
          <div style="font-size:11px;margin-top:6px;"><span style="color:${trustColor};font-weight:600;">Confianza: ${trustPercent}%</span></div>
          ${r.address ? `<div style="font-size:11px;color:#64748b;margin-top:4px;">${r.address}</div>` : ''}
        </div>
      `);
      m.addTo(mapInstance.current);
      markersRef.current.push(m);
    });
  }, []);

  useEffect(() => {
    if (section === 'main') renderMarkers(reports);
  }, [reports, renderMarkers, section]);

  // WebSocket
  useEffect(() => {
    if (section !== 'main') return;
    connectWebSocket((newReport) => {
      setReports((prev) => {
        const filtered = prev.filter((r) => r.id !== newReport.id);
        return [newReport, ...filtered];
      });
    });
    const interval = setInterval(() => setWsConnected(isConnected()), 3000);
    return () => {
      clearInterval(interval);
      disconnectWebSocket();
    };
  }, [section, setReports, setWsConnected]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLocation) return;
    setSubmitting(true);
    try {
      await reportsAPI.create({
        description: desc,
        incidentType: type,
        address: `${selectedLocation.lat.toFixed(5)}, ${selectedLocation.lng.toFixed(5)}`,
        source: 'CITIZEN_TEXT',
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
      });
      setDesc('');
      setSelectedLocation(null);
      setReportMode(false);
      if (selectedMarkerRef.current) { selectedMarkerRef.current.remove(); selectedMarkerRef.current = null; }
    } catch (err) {
      console.error('Error creating report:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const cancelReportMode = () => {
    setReportMode(false);
    setSelectedLocation(null);
    if (selectedMarkerRef.current) { selectedMarkerRef.current.remove(); selectedMarkerRef.current = null; }
  };

  // ═══════════════ SIDEBAR ═══════════════
  if (section === 'sidebar') {
    return (
      <div className="sidebar-content">
        {/* Botón para crear reporte (solo si está autenticado) */}
        {isAuthenticated ? (
          reportMode ? (
            <div className="glass-card">
              <div className="section-header">
                <h2>Nuevo Reporte</h2>
                <button className="btn btn-ghost btn-sm" onClick={cancelReportMode}>
                  <X size={14} /> Cancelar
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Tipo de incidente</label>
                  <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
                    {INCIDENT_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <textarea className="form-textarea" rows="3" required value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Describe el incidente..." />
                </div>
                <div className="form-group">
                  <label>Ubicación</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <Crosshair size={14} style={{ color: selectedLocation ? 'var(--success)' : 'var(--text-muted)' }} />
                    <span style={{ color: selectedLocation ? 'var(--success)' : 'var(--text-muted)' }}>
                      {selectedLocation ? `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}` : 'Haz clic en el mapa para marcar'}
                    </span>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-full" disabled={!selectedLocation || submitting}>
                  {submitting ? <span className="spinner" /> : <Send size={16} />}
                  {submitting ? 'Enviando...' : 'Enviar Reporte'}
                </button>
              </form>
            </div>
          ) : (
            <button className="btn btn-primary btn-full" onClick={() => setReportMode(true)}>
              <Plus size={18} /> Crear Reporte
            </button>
          )
        ) : (
          <div className="glass-card" style={{ textAlign: 'center', padding: '1rem' }}>
            <Lock size={20} style={{ color: 'var(--text-muted)', margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Inicia sesión para crear reportes</p>
          </div>
        )}

        {/* Lista de reportes (siempre visible, público) */}
        <div className="section-header" style={{ marginTop: '0.5rem' }}>
          <h2>Incidentes Recientes</h2>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{reports.length}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {reports.length === 0 ? (
            <div className="empty-state"><MapPin size={24} /><p>No hay reportes recientes</p></div>
          ) : (
            reports.slice(0, 30).map((r) => (
              <div className="report-card" key={r.id} onClick={() => {
                if (r.latitude && r.longitude && mapInstance.current) mapInstance.current.flyTo([r.latitude, r.longitude], 16);
              }}>
                <div className="report-card-header">
                  <span className={`badge badge-${r.incidentType?.toLowerCase()}`}>{r.incidentType}</span>
                  <span className={`badge badge-status badge-${r.status?.toLowerCase()}`}>{r.status}</span>
                </div>
                <div className="report-card-desc">{r.description}</div>
                <div className="report-card-meta">
                  <span><MapPin size={11} /> {r.address || 'Sin dirección'}</span>
                  {r.trustScore != null && (
                    <span style={{ color: r.trustScore >= 60 ? 'var(--success)' : 'var(--warning)' }}>{r.trustScore.toFixed(0)}%</span>
                  )}
                </div>
                {r.trustScore != null && (
                  <div className="trust-bar">
                    <div className="trust-bar-fill" style={{ width: `${r.trustScore}%`, background: r.trustScore >= 70 ? 'var(--success)' : r.trustScore >= 40 ? 'var(--warning)' : 'var(--error)' }} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ═══════════════ MAIN (MAP) ═══════════════
  return (
    <div className={`main-content ${reportMode ? 'report-mode-active' : ''}`}>
      {reportMode && (
        <div className="report-mode-banner">
          <Crosshair size={14} />
          Modo reporte: haz clic en el mapa para marcar ubicación
          <button onClick={cancelReportMode} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0 }}>
            <X size={14} />
          </button>
        </div>
      )}
      <div className="map-wrapper">
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}

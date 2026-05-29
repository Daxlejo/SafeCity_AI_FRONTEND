import { useEffect, useRef, useCallback, useState } from 'react';
import useGeolocation from '../hooks/useGeolocation';
import useHeatmapData from '../hooks/useHeatmapData';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { connectWebSocket, disconnectWebSocket, isConnected } from '../services/websocket';
import { uploadAPI } from '../services/api';
import { MapPin, Send, Crosshair, Plus, X, LogIn, Navigation, Camera, Flame } from 'lucide-react';
import HeatmapLayer from '../components/HeatmapLayer';
import DangerousZoneBanner from '../components/DangerousZoneBanner';
import DynamicReportForm from '../components/DynamicReportForm';
import { translateType, translateStatus } from '../services/dictionary';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const INCIDENT_TYPES = [
  { value: 'ROBBERY',    label: 'Robo / Hurto',          color: '#ef4444', cssVar: 'var(--robbery)' },
  { value: 'ACCIDENT',   label: 'Accidente de Tránsito', color: '#f59e0b', cssVar: 'var(--accident)' },
  { value: 'TRAFFIC',    label: 'Congestión Vial',        color: '#eab308', cssVar: 'var(--traffic)' },
  { value: 'TRANSIT_OP', label: 'Operativo de Tránsito',  color: '#3b82f6', cssVar: 'var(--transit_op)' },
  { value: 'OTHER',      label: 'Otro Incidente',         color: '#64748b', cssVar: 'var(--other)' },
];

function getIncidentColor(type) {
  return INCIDENT_TYPES.find((t) => t.value === type)?.color || '#64748b';
}

// ─── Lucide SVG paths (static, stable across minor versions) ─────────────────
// These are the raw <path> elements from lucide-react source for the icons we need.

const LUCIDE_PATHS = {
  // ShieldAlert — for ROBBERY
  ShieldAlert: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>`,

  // Car — for ACCIDENT
  Car: `<path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v5a2 2 0 0 1-2 2h-1m-8 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0m8 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0"/>`,

  // TriangleAlert — for TRAFFIC
  TriangleAlert: `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>`,

  // Shield — for TRANSIT_OP
  Shield: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`,

  // CircleDot — for OTHER
  CircleDot: `<circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="3"/>`,
};

const INCIDENT_ICON_MAP = {
  ROBBERY:    LUCIDE_PATHS.ShieldAlert,
  ACCIDENT:   LUCIDE_PATHS.Car,
  TRAFFIC:    LUCIDE_PATHS.TriangleAlert,
  TRANSIT_OP: LUCIDE_PATHS.Shield,
  OTHER:      LUCIDE_PATHS.CircleDot,
};

function createIncidentIcon(type, isRecent = false) {
  const color = getIncidentColor(type);
  const svgPaths = INCIDENT_ICON_MAP[type] || LUCIDE_PATHS.CircleDot;
  const pulseClass = isRecent ? 'pulse' : '';

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    ${svgPaths}
  </svg>`;

  return L.divIcon({
    className: 'incident-marker',
    html: `<div class="incident-marker-inner ${pulseClass}" style="background:${color};">${svgString}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}


const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

export default function MapView({
  reports, setReports, wsConnected, setWsConnected,
  section, isAuthenticated, isAdmin, reportMode, setReportMode,
  selectedLocation, setSelectedLocation,
  reportTitle, setReportTitle,
  reportDesc, setReportDesc, reportType, setReportType,
  isSubmitting, handleSubmitReport, cancelReportMode,
  onReportClick,
  onLoginClick,
  onNewReport,
  mapInstanceRef,
  theme,
  isMobile,
  // 🔗 Agente 2 → Agente 4: toggle de mapa de calor
  showHeatmap, setShowHeatmap,
  // TrueScore del usuario (para modal de verificación)
  userTrustScore,
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const tileLayerRef = useRef(null);
  const colorLayerRef = useRef(null);
  const markersRef = useRef([]);
  const selectedMarkerRef = useRef(null);
  const reportModeRef = useRef(reportMode);
  const setSelectedLocationRef = useRef(setSelectedLocation);

  const [photoFile, setPhotoFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);

  const [iaAnswers, setIaAnswers] = useState({});

  useEffect(() => {
    setIaAnswers({});
  }, [reportType]);

  const handleGenerateAIDesc = () => {
    let text = '';
    const typeLabel = translateType(reportType);

    if (reportType === 'ACCIDENT') {
      const heridos = iaAnswers.heridos || 'No';
      const obst = iaAnswers.obstruccion || 'No';
      const vehs = iaAnswers.vehiculos || '2';
      text = `Se reporta un ${typeLabel.toLowerCase()} con ${vehs} vehículo(s) implicado(s). ${
        heridos === 'Sí' ? 'Se confirma la presencia de heridos en la vía' : 'No se reportan personas heridas'
      }. ${
        obst === 'Sí' ? 'Hay obstrucción severa del tráfico' : 'El paso vehicular fluye con precaución'
      }.`;
    } else if (reportType === 'TRAFFIC') {
      const bloqueo = iaAnswers.bloqueo || 'No';
      const causa = iaAnswers.causa || 'Desconocido';
      text = `Reporte de ${typeLabel.toLowerCase()} debido a ${
        causa === 'Accidente' ? 'un accidente previo en la zona' :
        causa === 'Obras en vía' ? 'obras viales activas' :
        causa === 'Manifestación' ? 'manifestaciones ciudadanas' : 'causas desconocidas'
      }. ${
        bloqueo === 'Sí' ? 'La vía está completamente bloqueada' : 'Tránsito lento pero en movimiento'
      }.`;
    } else if (reportType === 'TRANSIT_OP') {
      const policia = iaAnswers.policia || 'Sí';
      const retencion = iaAnswers.retencion || 'No';
      text = `Se observa una ${typeLabel.toLowerCase()}${
        policia === 'Sí' ? ' coordinada por agentes de tránsito y policía' : ''
      }. ${
        retencion === 'Sí' ? 'Se están reteniendo vehículos para inspección' : 'Flujo normal de inspección preventiva'
      }.`;
    } else if (reportType === 'ROBBERY') {
      const arma = iaAnswers.arma || 'No';
      const afectados = iaAnswers.afectados || 'No';
      const sospechosos = iaAnswers.sospechosos || '1';
      text = `Incidente de ${typeLabel.toLowerCase()} reportado en la zona. Involucra a ${sospechosos} sospechoso(s). ${
        arma === 'Sí' ? 'Cometido con arma visible' : 'Sin uso de armas aparentes'
      }. ${
        afectados === 'Sí' ? 'Se reportan afectados que requieren asistencia' : 'No hay personas heridas reportadas'
      }.`;
    } else {
      const gravedad = iaAnswers.gravedad || 'Leve';
      const policia_req = iaAnswers.policia_req || 'No';
      text = `Reporte de incidente de tipo ${typeLabel.toLowerCase()} con gravedad ${gravedad.toLowerCase()}. ${
        policia_req === 'Sí' ? 'Se solicita con urgencia presencia de la policía nacional' : 'Inspección de prevención normal'
      }.`;
    }

    if (text.length < 30) {
      text = `${text} Por favor, transitar con extrema precaución por la zona indicada.`;
    }
    if (text.length > 200) {
      text = text.substring(0, 197) + '...';
    }

    setReportDesc(text);
  };

  const IA_QUESTIONS = {
    ACCIDENT: [
      { id: 'heridos', label: '¿Hay heridos en la vía?', options: ['Sí', 'No'] },
      { id: 'obstruccion', label: '¿Hay obstrucción del tráfico?', options: ['Sí', 'No'] },
      { id: 'vehiculos', label: 'Vehículos involucrados', options: ['1', '2', '3+'] }
    ],
    TRAFFIC: [
      { id: 'bloqueo', label: '¿Bloqueo total de la vía?', options: ['Sí', 'No'] },
      { id: 'causa', label: 'Causa aparente', options: ['Accidente', 'Obras en vía', 'Manifestación', 'Desconocido'] }
    ],
    TRANSIT_OP: [
      { id: 'policia', label: '¿Es un operativo policial?', options: ['Sí', 'No'] },
      { id: 'retencion', label: '¿Hay retención de vehículos?', options: ['Sí', 'No'] }
    ],
    ROBBERY: [
      { id: 'arma', label: '¿Fue con arma o violencia?', options: ['Sí', 'No'] },
      { id: 'afectados', label: '¿Hay heridos o afectados?', options: ['Sí', 'No'] },
      { id: 'sospechosos', label: 'Sospechosos visibles', options: ['1', '2', '3+'] }
    ],
    OTHER: [
      { id: 'gravedad', label: '¿Nivel de gravedad?', options: ['Leve', 'Moderado', 'Crítico'] },
      { id: 'policia_req', label: '¿Requiere presencia policial?', options: ['Sí', 'No'] }
    ]
  };

  // ═══ Agente 4: Hook de datos para Heatmap y Zona Peligrosa ═══
  const { points: heatmapPoints, dangerousZone, loading: heatmapLoading } = useHeatmapData();

  // ═══ Hook de Geolocalización (reemplaza código GPS inline) ═══
  const { location: geoLocation, status: geoStatus, errorType: geoErrorType, errorMessage: geoError, requestLocation, clearError } = useGeolocation();
  const geoLocating = geoStatus === 'loading';

  // Sincronizar refs
  useEffect(() => { reportModeRef.current = reportMode; }, [reportMode]);
  useEffect(() => { setSelectedLocationRef.current = setSelectedLocation; }, [setSelectedLocation]);

  // Manejar el marker de ubicación seleccionada
  useEffect(() => {
    if (section !== 'main' || !mapInstance.current) return;

    if (selectedLocation) {
      if (selectedMarkerRef.current) {
        selectedMarkerRef.current.setLatLng([selectedLocation.lat, selectedLocation.lng]);
      } else {
        selectedMarkerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: `<div style="width:16px;height:16px;background:#6366f1;border:3px solid white;border-radius:50%;box-shadow:0 0 12px rgba(99,102,241,0.6);"></div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
        }).addTo(mapInstance.current).bindPopup('Ubicación seleccionada').openPopup();
      }
    } else {
      if (selectedMarkerRef.current) {
        selectedMarkerRef.current.remove();
        selectedMarkerRef.current = null;
      }
    }
  }, [selectedLocation, section]);

  // Inicializar mapa
  useEffect(() => {
    if (section !== 'main' || mapInstance.current || !mapRef.current) return;

    mapInstance.current = L.map(mapRef.current, { zoomControl: true }).setView([1.2136, -77.2811], 14);

    // Base layer (TILE_DARK en oscuro, TILE_LIGHT en claro)
    tileLayerRef.current = L.tileLayer(theme === 'light' ? TILE_LIGHT : TILE_DARK, {
      attribution: '&copy; CARTO',
      maxZoom: 19,
      className: 'map-base-layer'
    }).addTo(mapInstance.current);

    // Color layer (solo inyecta parques y agua, transparente en el resto)
    colorLayerRef.current = L.tileLayer(TILE_LIGHT, {
      maxZoom: 19,
      className: 'map-color-layer'
    }).addTo(mapInstance.current);

    // Exponer instancia del mapa al padre (App.jsx) para flyTo desde modal
    if (mapInstanceRef) mapInstanceRef.current = mapInstance.current;

    mapInstance.current.on('click', (e) => {
      if (!reportModeRef.current) return;
      const { lat, lng } = e.latlng;
      setSelectedLocationRef.current({ lat, lng });
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        tileLayerRef.current = null;
        colorLayerRef.current = null;
      }
    };
  }, [section]);

  // Cambiar tiles por tema dinámicamente
  useEffect(() => {
    if (tileLayerRef.current) {
      tileLayerRef.current.setUrl(theme === 'light' ? TILE_LIGHT : TILE_DARK);
    }
  }, [theme, section]);

  // Renderizar markers — usa createIncidentIcon con SVG de Lucide por tipo
  const renderMarkers = useCallback((data) => {
    if (!mapInstance.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const now = Date.now();

    data.forEach((r) => {
      if (!r.latitude || !r.longitude) return;
      const color = getIncidentColor(r.incidentType);
      const trustPercent = r.trustScore != null ? r.trustScore.toFixed(0) : '—';
      const trustColor = r.trustScore >= 60 ? '#10b981' : r.trustScore >= 40 ? '#f59e0b' : '#ef4444';

      // Pulse animation for reports created in the last 10 minutes
      const reportAge = r.createdAt ? now - new Date(r.createdAt).getTime() : Infinity;
      const isRecent = reportAge < 10 * 60 * 1000;

      const m = L.marker([r.latitude, r.longitude], {
        icon: createIncidentIcon(r.incidentType, isRecent),
      }).bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:180px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="background:${color}20;color:${color};padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;text-transform:uppercase;">${translateType(r.incidentType)}</span>
            <span style="background:${r.status === 'VERIFIED' ? '#10b98120' : '#f59e0b20'};color:${r.status === 'VERIFIED' ? '#10b981' : '#f59e0b'};padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;">${translateStatus(r.status)}</span>
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
    connectWebSocket(
      (newReport) => {
        // Reporte nuevo: descartar REJECTED siempre; descartar PENDING si el usuario no es admin
        if (newReport.status === 'REJECTED') return;
        if (newReport.status === 'PENDING' && !isAdmin) return;
        setReports((prev) => {
          const filtered = prev.filter((r) => r.id !== newReport.id);
          return [newReport, ...filtered];
        });
        // Notify App.jsx for toast + badge counter
        if (onNewReport) onNewReport(newReport);
      },
      (updatedReport) => {
        // Si el reporte fue RECHAZADO, eliminarlo del array público
        if (updatedReport.status === 'REJECTED') {
          setReports((prev) => prev.filter((r) => r.id !== updatedReport.id));
        } else if (updatedReport.status === 'PENDING' && !isAdmin) {
          // Reporte retrocedió a PENDING (ej: re-clasificación): ocultarlo para usuarios normales
          setReports((prev) => prev.filter((r) => r.id !== updatedReport.id));
        } else {
          setReports((prev) =>
            prev.map((r) => (r.id === updatedReport.id ? updatedReport : r))
          );
        }
      },
      (deletedId) => {
        setReports((prev) => prev.filter((r) => r.id !== deletedId));
      }
    );
    const interval = setInterval(() => setWsConnected(isConnected()), 3000);
    return () => {
      clearInterval(interval);
      disconnectWebSocket();
    };
  }, [section, setReports, setWsConnected, isAdmin]);

  // ═══ Reaccionar a cambios de ubicación del hook ═══
  useEffect(() => {
    if (geoLocation) {
      setSelectedLocation({ lat: geoLocation.lat, lng: geoLocation.lng });
      if (mapInstance.current) mapInstance.current.flyTo([geoLocation.lat, geoLocation.lng], 16);
    }
  }, [geoLocation, setSelectedLocation]);

  // Función wrapper para el botón GPS
  const handleGeolocate = () => {
    clearError();
    requestLocation();
  };

  // Subida de foto
  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setUploadingPhoto(true);
    try {
      const res = await uploadAPI.uploadPhoto(file);
      setPhotoUrl(res.data?.photoUrl || res.data?.fileName || null);
    } catch (err) {
      console.error('Error subiendo foto:', err);
      setPhotoUrl(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ═══════════════ SIDEBAR ═══════════════
  if (section === 'sidebar') {
    return (
      <div className="sidebar-content">
        {isAuthenticated ? (
          reportMode ? (
            <DynamicReportForm
              reportType={reportType}
              setReportType={setReportType}
              selectedLocation={selectedLocation}
              setSelectedLocation={setSelectedLocation}
              submitting={isSubmitting}
              onSubmit={handleSubmitReport}
              onCancel={cancelReportMode}
              geoLocation={geoLocation}
              geoLocating={geoLocating}
              geoError={geoError}
              geoErrorType={geoErrorType}
              onGeolocate={handleGeolocate}
              onClearGeoError={clearError}
            />
          ) : (
            !isMobile && (
              <button className="btn btn-primary btn-full" onClick={() => setReportMode(true)}>
                <Plus size={18} /> Crear Reporte
              </button>
            )
          )
        ) : (
          <button className="btn btn-primary btn-full guest-cta-btn" onClick={onLoginClick}>
            <LogIn size={18} />
            Iniciar sesión o registrarse para reportar
          </button>
        )}

        <div className="section-header" style={{ marginTop: '0.5rem' }}>
          <h2>Incidentes Recientes</h2>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{reports.length}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {reports.length === 0 ? (
            <div className="empty-state"><MapPin size={24} /><p>No hay reportes recientes</p></div>
          ) : (
            reports.slice(0, 30).map((r) => (
              <div
                className="report-card"
                key={r.id}
                onClick={() => {
                  if (r.latitude && r.longitude && mapInstance.current) mapInstance.current.flyTo([r.latitude, r.longitude], 16);
                  if (onReportClick) onReportClick(r);
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="report-card-header">
                  <span className={`badge badge-${r.incidentType?.toLowerCase()}`}>{translateType(r.incidentType)}</span>
                  <span className={`badge badge-status badge-${r.status?.toLowerCase()}`}>{translateStatus(r.status)}</span>
                </div>
                <div className="report-card-desc">{r.description}</div>
                <div className="report-card-meta">
                  <span><MapPin size={11} /> {r.address || (r.latitude ? `${r.latitude?.toFixed(4)}, ${r.longitude?.toFixed(4)}` : 'Sin ubicación')}</span>
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

      {/* Agente 2: Toggle de Mapa de Calor (🔗 Agente 4 consume showHeatmap) */}
      {setShowHeatmap && (
        <button
          className={`heatmap-toggle-btn ${showHeatmap ? 'active' : ''}`}
          onClick={() => setShowHeatmap((prev) => !prev)}
          title={showHeatmap ? 'Desactivar mapa de calor' : 'Activar mapa de calor'}
        >
          <Flame size={16} />
          <span className="heatmap-toggle-label">
            {showHeatmap ? 'Ocultar calor' : 'Mapa de calor'}
          </span>
        </button>
      )}

      <div className="map-wrapper">
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* ═══ Agente 4: Capa de Mapa de Calor ═══ */}
      <HeatmapLayer
        map={mapInstance.current}
        points={heatmapPoints}
        visible={showHeatmap}
      />

      {/* ═══ Agente 4: Banner de Zona Peligrosa de la Semana ═══ */}
      <DangerousZoneBanner
        map={mapInstance.current}
        zone={dangerousZone}
        visible={showHeatmap}
      />
    </div>
  );
}

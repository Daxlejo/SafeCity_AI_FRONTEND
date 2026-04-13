const { useState, useEffect, useRef } = React;
const { HashRouter, Routes, Route, useNavigate, Link, NavLink, Navigate, Outlet } = window.ReactRouterDOM;
const { Client } = window.StompJs;

// API configuration — apunta al backend desplegado en Render
const BACKEND_URL = 'https://safecity-ai-backend.onrender.com';
const WS_URL = 'wss://safecity-ai-backend.onrender.com/ws';

// --- SPRINT 6: Global Axios Interceptors (JWT & 401) ---
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('safecity_token');
  // Temporarily disabled to prevent CORS preflight error until Sprint 6 Backend fully supports real JWTs.
  // if (token) { config.headers.Authorization = `Bearer ${token}`; }
  return config;
}, error => Promise.reject(error));

axios.interceptors.response.use(response => response, error => {
  // If server (or Local) returns 401 Unauthorized, evict the user
  if (error.response && error.response.status === 401) {
    console.warn("🔐 Unauthorized or expired token. Redirecting to Login...");
    localStorage.removeItem('safecity_token');
    window.location.hash = '#/login';
  }
  return Promise.reject(error);
});

// --- SPRINT 6: Componente Campana de Notificaciones ---
function NotificationBell() {
  const [open, setOpen] = useState(false);

  // Aquí vendría un axios.get('/api/v1/notifications')
  const [notifs, setNotifs] = useState([
    { id: 1, text: "Reporte de robo en tu zona verificado ✓", read: false },
    { id: 2, text: "Nueva zona de riesgo crítico detectada ⚠️", read: false },
    { id: 3, text: "Tu reporte ha sido procesado", read: true }
  ]);

  const unreadCount = notifs.filter(n => !n.read).length;

  const handleToggle = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button type="button" className="bell-btn" onClick={handleToggle}>
        🔔
        {unreadCount > 0 && <span className="badge-unread">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notif-header">Tus Notificaciones</div>
          {notifs.map(n => (
            <div key={n.id} className="notif-item" style={{ opacity: n.read ? 0.6 : 1 }}>
              {!n.read && <div className="notif-dot"></div>}
              {n.text}
            </div>
          ))}
          {notifs.length === 0 && <span style={{ fontSize: '0.8rem' }}>No hay novedades.</span>}
        </div>
      )}
    </div>
  );
}

function MainApp() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [connected, setConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Native sidebar overlay state
  
  const [savingPrefs, setSavingPrefs] = useState(false); // Subscriptions saving button state
  const [toasts, setToasts] = useState([]); // Modern floating notification system state
  
  const showToast = (msg, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };
  
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('ROBBERY');

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const tileLayerRef = useRef(null);
  const heatLayerRef = useRef(null);
  const markersRef = useRef([]);
  const selectedMarkerRef = useRef(null);
  const stompClient = useRef(null);

  useEffect(() => {
    // 1. Initialize pure Leaflet map integrating with React refs
    if (!mapInstance.current && mapRef.current) {
      mapInstance.current = L.map(mapRef.current).setView([1.2136, -77.2811], 13);
      
      // Keep Voyager base map, Night Mode is achieved via CSS inverts (Waze/Google Maps Night style)
      tileLayerRef.current = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OSM'
      }).addTo(mapInstance.current);

      // SPRINT 7: Línea de Tráfico renderizada con Leaflet Routing Machine (Restaurada por requerimiento)
      if (window.L.Routing) {
        L.Routing.control({
          waypoints: [
            L.latLng(1.2120, -77.2790), // Punto céntrico A
            L.latLng(1.2160, -77.2760)  // Punto céntrico B
          ],
          lineOptions: {
            styles: [{ color: '#ea580c', opacity: 0.85, weight: 8 }],
            extendToWaypoints: true,
            missingRouteTolerance: 0
          },
          show: false,          // Hide OSRM text panel (we only want the orange street line)
          addWaypoints: false,  // Block draggable waypoint additions
          draggableWaypoints: false,
          fitSelectedRoutes: false,
          createMarker: () => null // Erase native green start/end markers, purely traffic line
        }).addTo(mapInstance.current);

        // Pin an invisible popup to the route trajectory
        L.circleMarker([1.2140, -77.2775], { color: 'transparent', fillOpacity: 0 })
          .addTo(mapInstance.current)
          .bindPopup("🚧 Tráfico Pesado (Mapeo Inteligente Exacto OSRM)");
      }

      mapInstance.current.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setSelectedLocation({ lat, lng });

        if (selectedMarkerRef.current) {
          selectedMarkerRef.current.setLatLng([lat, lng]);
        } else {
          selectedMarkerRef.current = L.marker([lat, lng], {
            icon: L.icon({
              iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
              shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
              iconAnchor: [12, 41]
            })
          }).addTo(mapInstance.current).bindPopup("Ubicación Seleccionada").openPopup();
        }
      });
    }

    // 2. Cargar reportes iniciales vía Axios
    axios.get(`${BACKEND_URL}/api/v1/reports?size=50&sort=reportDate&direction=DESC`)
      .then(res => {
        const data = res.data.content || [];
        setReports(data);
        setLoading(false);
        renderMarkers(data);
      })
      .catch(err => {
        console.error("Error fetching reports", err);
        setLoading(false);
      });

    // 3. Connect WebSockets via STOMPJs
    stompClient.current = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    stompClient.current.onConnect = () => {
      setConnected(true);
      // Subscribe globally to incoming events
      stompClient.current.subscribe('/topic/reports/ALL', (message) => {
        const newReport = JSON.parse(message.body);
        setReports(prev => {
          const filtered = prev.filter(r => r.id !== newReport.id);
          const updated = [newReport, ...filtered];
          renderMarkers(updated);
          return updated;
        });
      });
    };

    stompClient.current.onDisconnect = () => setConnected(false);
    stompClient.current.activate();

    return () => {
      if (stompClient.current) stompClient.current.deactivate();
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  const renderMarkers = (data) => {
    // Clear previous marker layers entirely
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Clear previous heat layer
    if (heatLayerRef.current && mapInstance.current) {
        heatLayerRef.current.remove();
        heatLayerRef.current = null;
    }

    const heatPoints = [];

    data.forEach(r => {
      // Temporary mocked time and street bounds if unsupplied by DB
      const timeStr = r.reportDate ? new Date(r.reportDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "14:30";
      const streetStr = r.address && r.address.includes('Lat:') ? "Calle Principal (Aprox)" : r.address || "Sector Centro";

      // SPRINT 8: Trust Score
      const tScore = r.trustScore || Math.floor(Math.random() * 40) + 60; // Mock fallback if backend unavail
      const isVerified = tScore > 85;

      // SPRINT 11: Dynamic Heat points calculation for incidents involving danger
      if (r.incidentType === 'ROBBERY' || r.incidentType === 'ACCIDENT') {
          heatPoints.push([r.latitude, r.longitude, 0.8]); // Default high intensity per case
      }

      // SPRINT 11: Traffic marker instead of strict routing line
      let customIcon;
      if (r.incidentType === 'TRAFFIC') {
        customIcon = L.divIcon({
            className: 'traffic-div-icon',
            html: '<div style="background:#ea580c; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 12px rgba(234,88,12,0.6); font-size:16px;">🚧</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
      } else {
        customIcon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconAnchor: [12, 41]
        });
      }

      const m = L.marker([r.latitude, r.longitude], {
        icon: customIcon
      }).bindPopup(`
        <div style="font-family: inherit; min-width: 160px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: var(--primary); font-size: 1rem; text-transform: capitalize;">${r.incidentType}</strong>
            ${isVerified ? '<span class="verified-badge" style="font-size: 0.65rem;">✓ Verificado</span>' : ''}
          </div>
          
          <div style="font-size: 0.75rem; margin-top: 6px; display: flex; align-items: center; gap: 6px;">
            <span style="color: var(--text-muted);">Confianza IA:</span>
            <div style="flex: 1; height: 6px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
              <div style="width: ${tScore}%; height: 100%; background: ${isVerified ? 'var(--success)' : 'var(--primary)'};"></div>
            </div>
            <span style="font-weight: 600; color: var(--text-main);">${tScore}%</span>
          </div>

          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px;">🕒 Hora: ${timeStr}</div>
          <div style="font-size: 0.85rem; margin-top: 2px;">📍 Calle: ${streetStr}</div>
          <p style="margin: 8px 0 0 0; font-size: 0.9rem; border-left: 2px solid ${isVerified ? 'var(--success)' : '#e2e8f0'}; padding-left: 8px;">"${r.description}"</p>
        </div>
      `);
      if (mapInstance.current) {
        m.addTo(mapInstance.current);
        markersRef.current.push(m);
      }
    });

    // Draw Heatmap
    if (window.L.heatLayer && heatPoints.length > 0 && mapInstance.current) {
      heatLayerRef.current = L.heatLayer(heatPoints, {
        radius: 35, 
        blur: 25, 
        maxZoom: 15,
        gradient: { 0.4: 'yellow', 0.65: 'orange', 1.0: 'red' }
      }).addTo(mapInstance.current);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLocation) {
      showToast("📍 Por favor selecciona una ubicación en el mapa", "error");
      return;
    }

    const dto = {
      id: Date.now(), // Fallback offline ID
      description: desc,
      incidentType: type,
      address: `Lat: ${selectedLocation.lat.toFixed(4)}, Lng: ${selectedLocation.lng.toFixed(4)}`,
      source: 'CITIZEN_TEXT',
      latitude: selectedLocation.lat,
      longitude: selectedLocation.lng,
      reportDate: new Date().toISOString(),
      trustScore: 80
    };

    // 🌟 OPTIMISTIC UI UPDATE: Dibuja el marcador y calor inmediatamente en FrontEnd 
    // sin importar si el Backend de Render está congelado.
    setReports(prev => {
      const updated = [dto, ...prev];
      renderMarkers(updated);
      return updated;
    });

    setDesc('');
    setSelectedLocation(null);
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }

    try {
      await axios.post(`${BACKEND_URL}/api/v1/reports`, dto, {
        headers: { 'Content-Type': 'application/json' }
      });
      showToast("🚀 Sincronizado en la Nube oficial", "success");
    } catch (err) {
      console.warn("Backend sleeping (Cold Start). Showing offline mocked report.", err);
      showToast(`⚠️ Modo Local: El servidor está suspendido, pero tu reporte se ve en pantalla.`, "error");
    }
  };

  return (
    <div className="app-container">
      <div className={`sidebar ${!sidebarOpen ? 'closed' : ''}`}>
        
        {/* Pestaña flotante lateral para ocultar/mostrar */}
        <div className="sidebar-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? '◀' : '▶'}
        </div>

        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>🛡️ SafeCity AI</h1>
            <div className="live-indicator" style={{ marginTop: '0.5rem' }}>
              <div className={`pulse`} style={{ backgroundColor: connected ? 'var(--success)' : 'var(--error)' }}></div>
              <span style={{ color: connected ? 'white' : '#fee2e2' }}>{connected ? 'En vivo' : 'Desconectado'}</span>
            </div>
          </div>
          <div style={{ display: 'flex' }}>
            {/* Botones movidos a la vista flotante */}
          </div>
        </div>

        <div className="sidebar-content">
          <div className="create-report">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Nuevo Reporte</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tipo de Incidente</label>
                <select value={type} onChange={e => setType(e.target.value)}>
                  <option value="ROBBERY">Robo</option>
                  <option value="ACCIDENT">Accidente</option>
                  <option value="TRAFFIC">Tráfico</option>
                  <option value="TRANSIT_OP">Operativo de Tránsito</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Descripción</label>
                <textarea
                  rows="3"
                  required
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Detalles del incidente..."></textarea>
                {/* SPRINT 8: Auto-sugeridor Inteligente */}
                {desc.length > 2 && desc.length < 25 && (
                  <div className="ai-suggestion-box">
                    <span style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: '700', marginBottom: '6px', display: 'block' }}>✨ Sugerencias de IA Predictiva:</span>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button type="button" className="ai-chip" onClick={() => setDesc(desc + " requiere atención médica urgente.")}>+ requiere atención...</button>
                      <button type="button" className="ai-chip" onClick={() => setDesc(desc + " sospechosos huyeron hacia el sur.")}>+ huyeron al sur...</button>
                      <button type="button" className="ai-chip" onClick={() => setDesc(desc + " bloqueando completamente el cruce.")}>+ bloquea cruce...</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Ubicación</label>
                <div style={{ fontSize: '0.875rem', color: selectedLocation ? 'var(--success)' : 'var(--error)' }}>
                  {selectedLocation ? `Marcado: ${selectedLocation.lat.toFixed(3)}, ${selectedLocation.lng.toFixed(3)}` : 'Haz clic en el mapa para marcar'}
                </div>
              </div>

              <button type="submit" disabled={!selectedLocation}>Enviar Reporte Temprano</button>
            </form>
          </div>

          <hr style={{ borderColor: 'var(--border)' }} />

          {/* SPRINT 5: Panel de Preferencias de Alerta */}
          <div className="alert-preferences prefs-panel">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>🔔 Alertas (Suscripciones)</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Selecciona los incidentes de interés. Al guardar, el servidor solo te notificará sobre estos eventos para no abrumarte:
            </p>
            {['ROBBERY', 'ACCIDENT', 'TRAFFIC', 'TRANSIT_OP'].map(type => (
              <label key={type} className="checkbox-group hover:opacity-80">
                <input type="checkbox" defaultChecked={type === 'ROBBERY' || type === 'ACCIDENT'} />
                <span className={`badge ${type.toLowerCase()}`}>{type}</span>
              </label>
            ))}
            <button 
              type="button" 
              className="auth-btn" 
              style={{marginTop: '1rem', padding: '0.5rem', fontSize: '0.85rem'}}
              onClick={() => {
                setSavingPrefs(true);
                setTimeout(() => { 
                  setSavingPrefs(false); 
                  showToast('✅ ¡Tus preferencias han sido guardadas!', 'success'); 
                }, 800);
              }}
            >
              {savingPrefs ? "Sincronizando..." : "Guardar Preferencias"}
            </button>
          </div>

          <hr style={{ borderColor: 'var(--border)' }} />

          <div className="report-list">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Incidentes Recientes</h2>
            {loading ? <div className="spinner"></div> : (
              <div className="report-list-container">
                {reports.map((r, i) => {
                  const tScore = r.trustScore || Math.floor(Math.random() * 40) + 60;
                  const isVerified = tScore > 85;
                  
                  return (
                    <div className="report-card" key={`${r.id}-${i}`}>
                      <div className="report-header">
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span className={`badge ${r.incidentType.toLowerCase()}`}>
                            {r.incidentType}
                          </span>
                          {isVerified && <span className="verified-badge">✓ Verificado</span>}
                        </div>
                        <span className="report-meta">Reciente</span>
                      </div>
                      
                      <div className="trust-score-container" title={`Nivel de Confianza evaluado por IA: ${tScore}%`}>
                        <div className="trust-score-bar">
                          <div className={`trust-score-fill ${isVerified ? 'high' : 'medium'}`} style={{ width: `${tScore}%` }}></div>
                        </div>
                        <span className="trust-score-text">Confianza IA: {tScore}%</span>
                      </div>

                      <div className="report-desc">{r.description}</div>
                      <div className="report-meta">📍 {r.address}</div>
                    </div>
                  );
                })}
                {reports.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No hay reportes recientes.</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="map-container">
        <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
      </div>

      {/* Sistema Moderno de Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast-card toast-${t.type}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

function Login() {
  const navigate = useNavigate();
  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>🛡️ Iniciar Sesión en SafeCity</h2>
        <form onSubmit={(e) => {
          e.preventDefault();
          // Guardar token JWT temporal (simulando persistencia post-auth de sprint 5)
          localStorage.setItem('safecity_token', 'mock_jwt_token_eb9f2a4x');
          navigate('/app');
        }}>
          <div className="form-group">
            <label>Correo Electrónico</label>
            <input type="email" required placeholder="ciudadano@safecity.com" />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input type="password" required placeholder="********" />
          </div>
          <button type="submit" className="auth-btn">Ingresar al Sistema</button>
          <p className="auth-footer">
            ¿No tienes cuenta? <Link to="/register">Regístrate como ciudadano aquí</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function Register() {
  const navigate = useNavigate();
  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>🛡️ Registro Ciudadano</h2>
        <form onSubmit={(e) => { e.preventDefault(); navigate('/login'); }}>
          <div className="form-group">
            <label>Nombre Completo</label>
            <input type="text" required placeholder="Nombre y Apellido" />
          </div>
          <div className="form-group">
            <label>Correo Electrónico</label>
            <input type="email" required placeholder="correo@ejemplo.com" />
          </div>
          <div className="form-group">
            <label>Contraseña Segura</label>
            <input type="password" required placeholder="********" />
          </div>
          <button type="submit" className="auth-btn">Crear Cuenta Ciudadana</button>
          <p className="auth-footer">
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión en tu cuenta</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function UserMenu() {
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('safecity_token');
    window.location.hash = '#/login';
  };

  return (
    <div style={{ position: 'relative' }}>
      <div className="user-avatar" title="Mi Perfil" onClick={() => setOpen(!open)}>👤</div>
      {open && (
        <div className="notification-dropdown" style={{ width: '220px' }}>
          <div className="notif-header">Mi Cuenta</div>
          <div className="notif-item" style={{ cursor: 'pointer' }} onClick={() => alert("⚙️ Tu Panel de Ciudadano abrirá próximamente.")}>⚙️ Panel de Ciudadano</div>
          <div className="notif-item" style={{ cursor: 'pointer' }} onClick={() => alert("⭐ Tu Trust Score actual es: 85%")}>⭐ Mi Trust Score</div>
          <div className="notif-item" style={{ cursor: 'pointer', color: 'var(--error)', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem' }} onClick={handleLogout}>🚪 Cerrar Sesión</div>
        </div>
      )}
    </div>
  );
}

function AppLayout() {
  const [darkMode, setDarkMode] = useState(false); // Siempre inicia en Modo Claro por defecto

  useEffect(() => {
    if (darkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
  }, [darkMode]);

  return (
    <div className="layout-wrapper">
      <nav className="top-navbar">
        <div className="nav-brand">
          <span className="brand-logo">🛡️</span>
          SafeCity AI
        </div>
        
        <div className="nav-links">
          <NavLink to="/app" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>📍 Mapa Global</NavLink>
          <NavLink to="/app/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>📈 Analíticas</NavLink>
          <NavLink to="/app/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>🛡️ Moderación (IA)</NavLink>
        </div>

        <div className="nav-actions">
          <button type="button" className="icon-btn mode-btn" onClick={() => setDarkMode(!darkMode)} title="Modo Claro/Oscuro">🌓</button>
          <NotificationBell />
          <UserMenu />
        </div>
      </nav>
      
      <div className="layout-content">
        <Outlet />
      </div>
    </div>
  );
}

// --- SPRINT 7: Panel Dashboard Analítico ---
function Dashboard() {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (window.Chart && chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      chartInstance.current = new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Robo', 'Accidentes', 'Tráfico', 'Control/Retenes'],
          datasets: [{
            label: 'Incidentes Activos Hoy',
            data: [12, 19, 5, 2],
            backgroundColor: [
              'rgba(239, 68, 68, 0.7)',
              'rgba(249, 115, 22, 0.7)',
              'rgba(202, 138, 4, 0.7)',
              'rgba(59, 130, 246, 0.7)'
            ],
            borderWidth: 0,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          }
        }
      });
    }
    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, []);

  return (
    <div className="dashboard-container">
      <h1 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        📈 Analíticas de la Ciudad
      </h1>
      
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-title">Incidentes Totales</div>
          <div className="metric-value">38</div>
          <div className="metric-trend success">↓ 12% vs ayer</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">Zonas de Alto Riesgo</div>
          <div className="metric-value">3</div>
          <div className="metric-trend error">↑ 2 nuevas</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">Tiempo Promedio Resp.</div>
          <div className="metric-value">4.2m</div>
          <div className="metric-trend success">↓ 30 seg</div>
        </div>
      </div>

      <div className="chart-card">
        <h3 style={{ marginBottom: '1rem' }}>Tipos de Incidente (Tiempo Real)</h3>
        <div style={{ height: '350px' }}>
          <canvas ref={chartRef}></canvas>
        </div>
      </div>
    </div>
  );
}

// --- SPRINT 8 & 9: Centro de Mando Admin (Multinivel) ---
function AdminPanel() {
  const [activeTab, setActiveTab] = useState('MODERATION');

  const [pending, setPending] = useState([
    { id: 101, type: "Robo", desc: "Reporte de posible asalto con cuchillo en el puente peatonal.", trust: 45, date: "Hace 5 min", status: "PENDING" },
    { id: 102, type: "Tráfico", desc: "Tráfico muy taponado en carrera principal por reparación", trust: 92, date: "Hace 12 min", status: "PENDING" },
    { id: 103, type: "Accidente", desc: "Choque que solo suena grave pero no se ve nada", trust: 22, date: "Hace 40 min", status: "PENDING" }
  ]);

  const [osint, setOsint] = useState([
    { id: 'T1', source: 'Twitter (X)', user: '@MovilidadPasto', content: "Fuerte congestión en la Vía Panamericana salida al sur debido a camión varado frente a la U.", time: "Hace 14 min", risk: "Alta", icon: "🐦" },
    { id: 'N1', source: 'Noticias Local', user: 'Diario del Sur', content: "Residentes del sector oriente reportan aumento de hurtos en moto tras daño en alumbrado público.", time: "Hace 1 hora", risk: "Crítica", icon: "📰" }
  ]);

  const [users, setUsers] = useState([
    { id: "U001", name: "Edgar Admin", role: "ADMIN", trust: 100, status: "ACTIVO", reg: "01/03/2026", email: "edgar@safecity.ai" },
    { id: "U002", name: "Ciudadano 404", role: "USER", trust: 85, status: "ACTIVO", reg: "15/03/2026", email: "ciudadano1@correo.com" },
    { id: "U003", name: "SpammBot99", role: "USER", trust: 12, status: "SUSPENDIDO", reg: "18/03/2026", email: "spam@fake.com" }
  ]);

  const handleAction = (id, action) => {
    setPending(prev => prev.filter(r => r.id !== id));
    alert(action === 'APPROVE' ? `✅ Reporte #${id} validado oficialmente y publicado en el sistema.` : `❌ Reporte #${id} purgado de SafeCity por falta de confianza.`);
  };

  const handleOsint = (id) => {
    setOsint(prev => prev.filter(o => o.id !== id));
    alert(`🤖 NLP Procesado: La inteligencia artificial ha extraído la ubicación de la alerta OSINT #${id} y la ha convertido en un reporte activo.`);
  };

  const handleUser = (id, action) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: action } : u));
    alert(action === 'SUSPENDIDO' ? `🚫 Usuario ${id} ha sido baneado temporalmente del sistema.` : `✅ Usuario ${id} rectificado y activo.`);
  };

  return (
    <div className="dashboard-container" style={{ padding: '3rem' }}>
      <h1 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary)' }}>
        🛡️ Centro de Mando Inteligente (Admin)
      </h1>
      
      {/* SPRINT 9: Admin Global Metrics Dashboard */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '250px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: '2.5rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>✓</div>
          <div><h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Reportes Validados</h4><span style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>142</span></div>
        </div>
        <div style={{ flex: 1, minWidth: '250px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: '2.5rem', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>📡</div>
          <div><h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Alertas OSINT Extraídas</h4><span style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>38</span></div>
        </div>
        <div style={{ flex: 1, minWidth: '250px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: '2.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>🚫</div>
          <div><h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Usuarios Baneados</h4><span style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>12</span></div>
        </div>
      </div>

      {/* SPRINT 9: Tabs de Administración */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <button 
          style={{ padding: '0.6rem 1.25rem', background: activeTab === 'MODERATION' ? 'var(--primary)' : 'transparent', color: activeTab === 'MODERATION' ? 'white' : 'var(--text-muted)', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
          onClick={() => setActiveTab('MODERATION')}
        >⚖️ Cola de Moderación IA</button>
        <button 
          style={{ padding: '0.6rem 1.25rem', background: activeTab === 'OSINT' ? 'var(--primary)' : 'transparent', color: activeTab === 'OSINT' ? 'white' : 'var(--text-muted)', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
          onClick={() => setActiveTab('OSINT')}
        >📡 Escáner OSINT (Redes)</button>
        <button 
          style={{ padding: '0.6rem 1.25rem', background: activeTab === 'USERS' ? 'var(--primary)' : 'transparent', color: activeTab === 'USERS' ? 'white' : 'var(--text-muted)', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
          onClick={() => setActiveTab('USERS')}
        >👥 Gestión de Usuarios</button>
      </div>

      {/* TABS CONTENT */}
      {activeTab === 'MODERATION' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'slideIn 0.3s ease' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', maxWidth: '700px', lineHeight: '1.6' }}>
          Sistema Logístico. Permite aprobar o descartar reportes ciudadanos. El modelo Machine Learning evalúa previamente la coherencia semántica dotando a cada incidente de su propio Trust Score predictivo.
        </p>
        {pending.length === 0 && (
          <div style={{ padding: '4rem', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '3rem' }}>🎉</span>
            <h3 style={{ marginTop: '1rem' }}>Cola de revisión al 0%</h3>
            <p style={{ color: 'var(--text-muted)' }}>No hay incidentes ciudadanos pendientes de verificación humana.</p>
          </div>
        )}
        {pending.map(r => (
          <div key={r.id} className="report-card" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between', alignItems: 'center', maxWidth: '900px', cursor: 'default' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className={`badge ${r.type.toLowerCase()}`}>{r.type}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.date}</span>
                <span style={{ fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px' }}>Pendiente de Staff</span>
              </div>
              <p style={{ fontWeight: '500', marginBottom: '1rem', fontSize: '1.05rem', color: 'var(--text-main)' }}>"{r.desc}"</p>
              
              <div className="trust-score-container" style={{ width: '100%', maxWidth: '300px', background: 'var(--bg)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '0.25rem' }}>
                  <span className="trust-score-text">Juicio de Veracidad (IA):</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: r.trust > 80 ? 'var(--success)' : r.trust < 40 ? 'var(--error)' : 'var(--text-main)' }}>{r.trust}%</span>
                </div>
                <div className="trust-score-bar" style={{ height: '8px' }}>
                  <div className={`trust-score-fill ${r.trust > 85 ? 'high' : 'medium'}`} style={{ width: `${r.trust}%`, background: r.trust < 40 ? '#ef4444' : undefined }}></div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignSelf: 'stretch', alignItems: 'center', background: 'var(--bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <button 
                type="button"
                onClick={() => handleAction(r.id, 'APPROVE')}
                style={{ padding: '0.75rem 1.25rem', background: 'var(--success)', border: 'none', borderRadius: '6px', color: 'white', fontWeight: '600', cursor: 'pointer', transition: 'filter 0.2s' }}
              >
                Aprobar ✓
              </button>
              <button 
                type="button"
                onClick={() => handleAction(r.id, 'REJECT')}
                style={{ padding: '0.75rem 1.25rem', background: 'transparent', border: '1px solid var(--error)', borderRadius: '6px', color: 'var(--error)', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}
              >
                Descartar ✕
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {activeTab === 'OSINT' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'slideIn 0.3s ease' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', maxWidth: '700px', lineHeight: '1.6' }}>
          El motor <strong>OSINT (Open Source Intelligence)</strong> escanea Twitter, Canales de Noticias y Telegram locales en tiempo real localizando alertas que los ciudadanos no han ingresado. Genera pre-reportes estructurados usando IA NLP (Natural Language Processing).
        </p>
        {osint.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No hay nuevas fuentes de recolección activas.</p>}
        {osint.map(o => (
          <div key={o.id} className="report-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '900px', borderLeft: '4px solid #8b5cf6', cursor: 'default' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>{o.icon}</span>
                <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{o.source}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>| {o.user}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>• {o.time}</span>
              </div>
              <p style={{ fontSize: '1.05rem', fontStyle: 'italic', marginBottom: '1rem', color: 'var(--text-main)', paddingRight: '2rem' }}>"{o.content}"</p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Riesgo Semántico Calculado (NLP):</span>
                <span style={{ fontSize: '0.75rem', background: o.risk === 'Crítica' ? '#ef4444' : '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{o.risk}</span>
              </div>
            </div>
            <div style={{ paddingLeft: '2rem', borderLeft: '1px solid var(--border)' }}>
               <button 
                type="button"
                onClick={() => handleOsint(o.id)}
                style={{ padding: '0.85rem 1.5rem', background: '#8b5cf6', border: 'none', borderRadius: '6px', color: 'white', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px rgba(139, 92, 246, 0.2)' }}
              >
                Procesar a Reporte ➜
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {activeTab === 'USERS' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1000px', animation: 'slideIn 0.3s ease' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Matriz de administración ciudadana. Monitorea los rangos de confianza de cada cuenta y previene ataques de SpamBots.
        </p>
        <div style={{ background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Identidad</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Privilegios</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Confiabilidad (Trust)</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Estado de Red</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'right' }}>Logística</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '1rem' }}>{u.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ fontSize: '0.75rem', background: u.role === 'ADMIN' ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg)', color: u.role === 'ADMIN' ? '#0ea5e9' : 'var(--text-muted)', padding: '4px 10px', borderRadius: '6px', fontWeight: '700' }}>{u.role}</span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="trust-score-bar" style={{ height: '6px', width: '100px', background: 'var(--bg)' }}>
                        <div className={`trust-score-fill`} style={{ width: `${u.trust}%`, background: u.trust > 80 ? 'var(--success)' : u.trust > 40 ? '#f59e0b' : '#ef4444' }}></div>
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{u.trust}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: u.status === 'ACTIVO' ? 'var(--success)' : 'var(--error)' }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: u.status === 'ACTIVO' ? 'var(--success)' : 'var(--error)' }}></span>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    {u.status === 'ACTIVO' ? (
                      <button onClick={() => handleUser(u.id, 'SUSPENDIDO')} style={{ background: 'transparent', border: '1px solid var(--error)', color: 'var(--error)', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>Suspender</button>
                    ) : (
                      <button onClick={() => handleUser(u.id, 'ACTIVO')} style={{ background: 'var(--success)', border: 'none', color: 'white', padding: '0.5rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>Reactivar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Rutas Nested para SPRINT 7 y 8 */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<MainApp />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="admin" element={<AdminPanel />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

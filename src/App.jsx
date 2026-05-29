import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { reportsAPI } from './services/api';
import LoginPage from './pages/LoginPage';
import MapView from './pages/MapView';
import DashboardView from './pages/DashboardView';
import NotificationsView from './pages/NotificationsView';
import AdminView from './pages/AdminView';
import ProfileView from './pages/ProfileView';
import OsintView from './pages/OsintView';
import AlertsConfigView from './pages/AlertsConfigView';
import ReportDetailModal from './components/ReportDetailModal';
import OnboardingTutorial from './components/OnboardingTutorial';
import useInactivityTimer from './hooks/useInactivityTimer';
import {
  Shield, Map, BarChart3, Bell, LogOut, User,
  Sun, Moon, ShieldCheck, ChevronLeft, ChevronRight, Plus, X, ArrowLeft, Search
} from 'lucide-react';

// ═══════════════════════════════════════════
// TAB DEFINITIONS
// ═══════════════════════════════════════════

const PUBLIC_TABS = [
  { id: 'map', label: 'Mapa', icon: Map },
];

const AUTH_TABS = [
  { id: 'map', label: 'Mapa', icon: Map },
  { id: 'notifications', label: 'Alertas', icon: Bell },
  { id: 'profile', label: 'Perfil', icon: User },
];

const ADMIN_TABS = [
  { id: 'dashboard', label: 'Stats', icon: BarChart3 },
  { id: 'admin', label: 'Admin', icon: ShieldCheck },
  { id: 'osint', label: 'OSINT', icon: Search }
];

// ═══════════════════════════════════════════
// CUSTOM HOOK: useIsMobile (con resize listener)
// ═══════════════════════════════════════════

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth <= breakpoint
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);

  return isMobile;
}

// ═══════════════════════════════════════════
// MOBILE BOTTOM SHEET (con swipe gestures)
// ═══════════════════════════════════════════
// Patrón Strategy: 3 snap points — peek, half, full
// El usuario puede deslizar entre ellos con gestos táctiles

const SNAP_PEEK = 0;   // ~110px visible
const SNAP_HALF = 1;   // ~50% pantalla
const SNAP_FULL = 2;   // ~90% pantalla

// Drag detection threshold in px — movements under this are treated as clicks
const DRAG_THRESHOLD = 10;

function MobileBottomSheet({ snap, setSnap, children, bounceClass, reportCount, showDiscoveryBadge, onSheetInteract }) {
  const sheetRef = useRef(null);
  const startYRef = useRef(0);
  const startSnapRef = useRef(snap);
  const isDraggingRef = useRef(false);
  // Drag-vs-Click detection: track cumulative vertical movement
  const cumulativeDeltaRef = useRef(0);
  const wasDraggedRef = useRef(false);

  // Calcular translateY según snap
  const getTranslateY = useCallback((s) => {
    switch (s) {
      case SNAP_FULL: return '15%';
      case SNAP_HALF: return '50%';
      default: return 'calc(100% - 110px)';
    }
  }, []);

  const handleTouchStart = useCallback((e) => {
    cumulativeDeltaRef.current = 0;
    wasDraggedRef.current = false;

    const touch = e.touches[0];
    const rect = sheetRef.current?.getBoundingClientRect();
    if (!rect) return;

    isDraggingRef.current = true;
    startYRef.current = touch.clientY;
    startSnapRef.current = snap;

    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }
  }, [snap]);

  const handleTouchMove = useCallback((e) => {
    if (!isDraggingRef.current || !sheetRef.current) return;

    const deltaY = e.touches[0].clientY - startYRef.current;
    cumulativeDeltaRef.current += Math.abs(deltaY);

    // Mark as drag if movement exceeds threshold
    if (cumulativeDeltaRef.current > DRAG_THRESHOLD) {
      wasDraggedRef.current = true;
    }

    const currentTop = sheetRef.current.getBoundingClientRect().top;
    const windowH = window.innerHeight;

    // Limitar el movimiento
    const minTop = windowH * 0.1;
    const maxTop = windowH - 110;
    const newTop = Math.max(minTop, Math.min(maxTop, currentTop));

    // Aplicar como porcentaje
    const pct = ((newTop + deltaY - minTop) / (maxTop - minTop)) * 100;
    const clampedPct = Math.max(0, Math.min(100, pct));
    const translatePct = 10 + (clampedPct * 0.9);
    sheetRef.current.style.transform = `translateY(${translatePct}%)`;

    startYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDraggingRef.current || !sheetRef.current) return;
    isDraggingRef.current = false;

    // Restaurar transición
    sheetRef.current.style.transition = '';

    // Determinar snap más cercano basándose en posición actual
    const rect = sheetRef.current.getBoundingClientRect();
    const windowH = window.innerHeight;
    const relativeTop = rect.top / windowH;

    if (relativeTop < 0.25) {
      setSnap(SNAP_FULL);
    } else if (relativeTop < 0.6) {
      setSnap(SNAP_HALF);
    } else {
      setSnap(SNAP_PEEK);
    }

    // Limpiar el estilo inline
    sheetRef.current.style.transform = '';

    // Reset drag flag after a brief delay so onClick handlers can read it
    setTimeout(() => { wasDraggedRef.current = false; }, 100);
  }, [setSnap]);

  const handleInteraction = useCallback((targetSnap) => {
    if (onSheetInteract) onSheetInteract();
    setSnap(targetSnap);
  }, [onSheetInteract, setSnap]);

  // Intercept clicks on children — prevent if user was dragging
  const handleBodyClick = useCallback((e) => {
    if (wasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return (
    <div
      ref={sheetRef}
      className={`mobile-bottom-sheet snap-${snap === SNAP_FULL ? 'full' : snap === SNAP_HALF ? 'half' : 'peek'}${bounceClass ? ` ${bounceClass}` : ''}`}
      style={{ transform: `translateY(${getTranslateY(snap)})` }}
      onTouchStart={(e) => { if (onSheetInteract) onSheetInteract(); handleTouchStart(e); }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull handle */}
      <div
        className="mobile-sheet-handle"
        onClick={() => handleInteraction(snap === SNAP_PEEK ? SNAP_HALF : snap === SNAP_HALF ? SNAP_FULL : SNAP_PEEK)}
      >
        <div className="mobile-sheet-handle-bar" />
      </div>
      {/* Discovery badge */}
      {!!(showDiscoveryBadge && snap === SNAP_PEEK && reportCount > 0) && (
        <div className="sheet-discovery-badge" onClick={() => handleInteraction(SNAP_HALF)}>
          ↑ Desliza para ver {reportCount} {reportCount === 1 ? 'reporte' : 'reportes'}
        </div>
      )}
      <div className="mobile-sheet-body" onClickCapture={handleBodyClick}>
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// MOBILE BOTTOM NAV BAR
// ═══════════════════════════════════════════

function MobileBottomNav({ tabs, activeTab, setActiveTab, unreadCount }) {
  return (
    <nav className="mobile-bottom-nav">
      {tabs.map((tab) => {
        const IconComp = tab.icon;
        const isActive = activeTab === tab.id;
        const showBadge = tab.id === 'notifications' && unreadCount > 0;
        return (
          <button
            key={tab.id}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="nav-badge-wrapper">
              <IconComp size={22} />
              {showBadge && (
                <span className="badge-pill">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
// ═══════════════════════════════════════════
// MOBILE FULL-PAGE VIEW (replaces Bottom Sheet for non-map tabs)
// ═══════════════════════════════════════════

function MobileFullPageView({ title, icon: Icon, onBack, children }) {
  return (
    <div className="mobile-fullpage-view">
      <div className="mobile-fullpage-header">
        <button className="mobile-fullpage-back" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>Mapa</span>
        </button>
        <h2 className="mobile-fullpage-title">
          <Icon size={18} /> {title}
        </h2>
        <div style={{ width: 60 }} />
      </div>
      <div className="mobile-fullpage-body">
        {children}
      </div>
    </div>
  );
}



// ═══════════════════════════════════════════
// APP PRINCIPAL
// ═══════════════════════════════════════════

function AppContent() {
  const { user, loading: authLoading, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const isMobile = useIsMobile();

  const [activeTab, setActiveTab] = useState('map');
  const [reports, setReports] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [reportMode, setReportMode] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [resetToken, setResetToken] = useState(null);
  const [mobileSheetSnap, setMobileSheetSnap] = useState(SNAP_PEEK);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasInteractedWithSheet, setHasInteractedWithSheet] = useState(false);
  const [showSheetBounce, setShowSheetBounce] = useState(true);
  const mapInstanceRef = useRef(null);

  // ═══ Agente 2: Onboarding Tutorial (primer login) ═══
  const [showOnboarding, setShowOnboarding] = useState(false);
  const prevUserRef = useRef(null);

  // Detectar primer login exitoso para mostrar tutorial
  useEffect(() => {
    if (user && !prevUserRef.current) {
      // El usuario acaba de autenticarse
      const onboardingSeen = localStorage.getItem('safecity_onboarding_seen');
      if (onboardingSeen !== 'true') {
        setShowOnboarding(true);
      }
    }
    prevUserRef.current = user;
  }, [user]);

  // ═══ Agente 2: Heatmap toggle state (🔗 Agente 4 consume) ═══
  const [showHeatmap, setShowHeatmap] = useState(false);

  // ═══ Agente 2: Inactividad — auto-logout tras 20 min ═══
  useInactivityTimer({
    onTimeout: logout,
    onWarning: () => showToast('⏳ Tu sesión cerrará pronto por inactividad', 'warning'),
    timeoutMs: 20 * 60 * 1000,
    warningBeforeMs: 2 * 60 * 1000,
    enabled: !!user,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 250);
    return () => clearTimeout(timer);
  }, [isSidebarCollapsed]);

  // Estado compartido del formulario de reporte (lifted from MapView)
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [reportTitle, setReportTitle] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportType, setReportType] = useState('ROBBERY');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    reportsAPI.getAll()
      .then((res) => {
        const data = res.data?.content || res.data || [];
        const all = Array.isArray(data) ? data : [];
        // Reportes PENDING y EXPIRED solo son visibles para administradores
        setReports(isAdmin ? all : all.filter((r) => r.status !== 'PENDING' && r.status !== 'EXPIRED'));
      })
      .catch((err) => console.error('Error fetching reports:', err));
  }, [user, isAdmin]);

  useEffect(() => { if (user) setShowLogin(false); }, [user]);

  // Detectar token de recuperación en la URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (window.location.pathname === '/reset-password' && token) {
      setResetToken(token);
      setShowLogin(true);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Handle incoming WebSocket report — trigger toast + increment badge
  const handleNewReport = useCallback((report) => {
    setUnreadCount((prev) => prev + 1);
    const summary = report.description
      ? report.description.substring(0, 60) + (report.description.length > 60 ? '...' : '')
      : `Nuevo incidente: ${report.incidentType}`;
    showToast(`¡Nueva alerta! ${summary}`, 'alert');
  }, [showToast]);

  // Sincronizar cambio de status del admin con el estado global
  // Patrón Observer: si el nuevo status es REJECTED, eliminamos el reporte
  // del array público (coherente con el endpoint GET /reports que excluye REJECTED)
  const handleReportUpdated = (id, newStatus) => {
    if (newStatus === 'REJECTED') {
      setReports((prev) => prev.filter((r) => r.id !== id));
    } else {
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    }
  };

  const cancelReportMode = () => {
    setReportMode(false);
    setSelectedLocation(null);
    setReportTitle('');
    setReportDesc('');
  };

  const handleSubmitReport = async (structuredData, photoUrl) => {
    if (isSubmitting) return;
    if (!selectedLocation) return;
    setIsSubmitting(true); // Bloquea el botón para evitar doble clic

    try {
      const reportData = {
        ...structuredData,
        source: 'CITIZEN_TEXT',
      };
      if (photoUrl) reportData.photoUrl = photoUrl;
      
      // Petición directa al backend utilizando el servicio unificado
      const response = await reportsAPI.create(reportData);
      
      if (response.status === 201 || response.status === 200 || response.data) {
        // 1. Apagamos el modo de reporte SÓLO si el backend respondió con éxito
        setReportMode(false); 
        setSelectedLocation(null);
        
        // 2. Refrescar los reportes del mapa de forma inmediata
        const res = await reportsAPI.getAll();
        const data = res.data?.content || res.data || [];
        setReports(isAdmin ? (Array.isArray(data) ? data : []) : (Array.isArray(data) ? data : []).filter((r) => r.status !== 'PENDING' && r.status !== 'EXPIRED'));
        
        alert("Reporte subido con éxito a la base de datos.");
      }
    } catch (error) {
      console.error("Error crítico en el backend/IA:", error);
      // Captura el mensaje real del por qué el backend te lo rechazó
      const backendMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Los campos ingresados no son válidos.";
      alert(`Rechazado por el servidor: ${backendMessage}`);
    } finally {
      // SE EJECUTA SIEMPRE: Si falla, libera el botón para que el usuario corrija
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="auth-page">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Shield size={40} style={{ color: 'var(--accent)' }} />
          <span className="spinner" />
        </div>
      </div>
    );
  }

  // AuthGuard — Block any internal views and redirect to /login if not authenticated
  if (!user) {
    const isResetView = window.location.pathname === '/reset-password';
    if (!isResetView && window.location.pathname !== '/login') {
      window.history.replaceState({}, '', '/login');
    }
    return (
      <LoginPage
        initialView={isResetView && resetToken ? 'reset' : 'login'}
        initialToken={resetToken || undefined}
      />
    );
  }

  const tabs = user ? [...AUTH_TABS, ...(isAdmin ? ADMIN_TABS : [])] : PUBLIC_TABS;

  // Props compartidos para MapView
  const mapProps = {
    reports, setReports,
    wsConnected, setWsConnected,
    isAuthenticated: !!user,
    isAdmin,
    reportMode, setReportMode,
    selectedLocation, setSelectedLocation,
    reportTitle, setReportTitle,
    reportDesc, setReportDesc,
    reportType, setReportType,
    isSubmitting, handleSubmitReport, cancelReportMode,
    onReportClick: setSelectedReport,
    onNewReport: handleNewReport,
    onLoginClick: () => setShowLogin(true),
    mapInstanceRef,
    isMobile,
    // 🔗 Agente 2 → Agente 4: estado del toggle de heatmap
    showHeatmap, setShowHeatmap,
    // TrueScore del usuario para el modal de verificación
    userTrustScore: user?.trustLevel ?? null,
  };

  const renderSidebarContent = () => {
    switch (activeTab) {
      case 'map': return <MapView {...mapProps} section="sidebar" />;
      case 'dashboard': return <DashboardView section="sidebar" />;
      case 'notifications': return <NotificationsView section="sidebar" unreadCount={unreadCount} setUnreadCount={setUnreadCount} />;
      case 'admin': return <AdminView section="sidebar" reports={reports} onReportUpdated={handleReportUpdated} />;
      case 'osint': return <OsintView section="sidebar" />;
      case 'profile': return <ProfileView section="sidebar" />;
      default: return null;
    }
  };

  const renderMainContent = () => {
    switch (activeTab) {
      case 'map': return <MapView {...mapProps} section="main" theme={theme} />;
      case 'dashboard': return <DashboardView section="main" onReportClick={setSelectedReport} />;
      case 'notifications': return <NotificationsView section="main" unreadCount={unreadCount} setUnreadCount={setUnreadCount} />;
      case 'admin': return <AdminView section="main" reports={reports} onReportUpdated={handleReportUpdated} />;
      case 'osint': return <OsintView section="main" />;
      case 'profile': return <ProfileView section="main" onNavigateToAlerts={() => setActiveTab('alerts-config')} />;
      case 'alerts-config': return <AlertsConfigView onBack={() => setActiveTab('profile')} />;
      default: return null;
    }
  };

  // Modales compartidos (login + detail + onboarding)
  const renderModals = () => (
    <>
      {showLogin && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          animation: 'modal-enter 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}>
          <LoginPage
            onBack={() => { setShowLogin(false); setResetToken(null); }}
            initialView={resetToken ? 'reset' : undefined}
            initialToken={resetToken || undefined}
          />
        </div>
      )}

      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onFlyTo={(lat, lng) => {
            setActiveTab('map');
            setTimeout(() => {
              if (mapInstanceRef.current) mapInstanceRef.current.flyTo([lat, lng], 16);
            }, 200);
          }}
        />
      )}

      {/* Agente 2: Tutorial de Onboarding */}
      {showOnboarding && (
        <OnboardingTutorial onComplete={() => setShowOnboarding(false)} />
      )}


    </>
  );

  // ═══════════════════════════════════════════
  // MOBILE LAYOUT — Google Maps / Apple Maps style
  // ═══════════════════════════════════════════

  if (isMobile) {
    const handleFabClick = () => {
      if (!user) {
        setShowLogin(true);
        return;
      }
      setActiveTab('map');
      setReportMode(true);
      setMobileSheetSnap(SNAP_FULL);
    };

    // Cuando activa reporte, sheet = full. Cuando cancela, sheet = peek
    const handleMobileCancelReport = () => {
      cancelReportMode();
      setMobileSheetSnap(SNAP_PEEK);
    };

    // Overrides para mobile
    const mobileMapProps = {
      ...mapProps,
      cancelReportMode: handleMobileCancelReport,
    };

    return (
      <div className="mobile-layout">
        {/* Map always fullscreen behind everything */}
        <div className="mobile-map-container">
          <MapView {...mobileMapProps} section="main" theme={theme} />
        </div>

        {/* Top status bar */}
        <div className="mobile-top-bar">
          <div className="mobile-top-left">
            <Shield size={16} />
            <span className="mobile-brand">SafeCity</span>
            <div className={`live-dot ${wsConnected ? 'connected' : 'disconnected'}`} />
          </div>
          <div className="mobile-top-right">
            {user ? (
              <button onClick={logout} className="mobile-top-btn" title="Cerrar sesión">
                <LogOut size={16} />
              </button>
            ) : (
              <button onClick={() => setShowLogin(true)} className="mobile-top-btn">
                <User size={16} />
              </button>
            )}
            <button onClick={toggleTheme} className="mobile-top-btn" title={`Modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        {/* Bottom Sheet — SOLO para la vista del mapa (incidentes recientes) */}
        {activeTab === 'map' && (
          <MobileBottomSheet
            snap={mobileSheetSnap}
            setSnap={setMobileSheetSnap}
            bounceClass={showSheetBounce && !hasInteractedWithSheet ? 'sheet-bounce' : ''}
            reportCount={reports.length}
            showDiscoveryBadge={!hasInteractedWithSheet}
            onSheetInteract={() => { setHasInteractedWithSheet(true); setShowSheetBounce(false); }}
          >
            <MapView {...mobileMapProps} section="sidebar" />
          </MobileBottomSheet>
        )}

        {/* Full-page views — reemplazan el Bottom Sheet para tabs que no son mapa */}
        {activeTab === 'profile' && (
          <MobileFullPageView title="Mi Perfil" icon={User} onBack={() => setActiveTab('map')}>
            <ProfileView section="main" />
          </MobileFullPageView>
        )}
        {activeTab === 'notifications' && (
          <MobileFullPageView title="Notificaciones" icon={Bell} onBack={() => setActiveTab('map')}>
            <NotificationsView section="main" unreadCount={unreadCount} setUnreadCount={setUnreadCount} />
          </MobileFullPageView>
        )}
        {activeTab === 'dashboard' && (
          <MobileFullPageView title="Dashboard" icon={BarChart3} onBack={() => setActiveTab('map')}>
            <DashboardView section="main" onReportClick={setSelectedReport} />
          </MobileFullPageView>
        )}
        {activeTab === 'admin' && (
          <MobileFullPageView title="Administración" icon={ShieldCheck} onBack={() => setActiveTab('map')}>
            <AdminView section="main" reports={reports} onReportUpdated={handleReportUpdated} />
          </MobileFullPageView>
        )}
        {activeTab === 'osint' && (
          <MobileFullPageView title="OSINT Scanner" icon={Search} onBack={() => setActiveTab('map')}>
            <OsintView section="main" />
          </MobileFullPageView>
        )}
        {activeTab === 'alerts-config' && (
          <MobileFullPageView title="Preferencias" icon={Bell} onBack={() => setActiveTab('profile')}>
            <AlertsConfigView onBack={() => setActiveTab('profile')} />
          </MobileFullPageView>
        )}

        {/* FAB — Crear Reporte: solo visible cuando el usuario está en el mapa */}
        {user && activeTab === 'map' && !reportMode && (
          <button
            className="mobile-fab"
            onClick={handleFabClick}
            title="Crear nuevo reporte"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        )}

        {/* Bottom Navigation Bar */}
        <MobileBottomNav tabs={tabs} unreadCount={unreadCount} activeTab={activeTab} setActiveTab={(id) => {
          setActiveTab(id);
          if (id === 'map') {
            setMobileSheetSnap(reportMode ? SNAP_FULL : SNAP_PEEK);
          }
        }} />

        {renderModals()}
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // DESKTOP LAYOUT — Sidebar + Main (sin cambios)
  // ═══════════════════════════════════════════

  return (
    <div className={`app-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar">
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1><Shield size={20} /> SafeCity AI</h1>
            <button className="theme-toggle" onClick={toggleTheme} title={`Modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
          <div className="status-line">
            <div className={`live-dot ${wsConnected ? 'connected' : 'disconnected'}`} />
            <span>{wsConnected ? 'En vivo' : 'Conectando...'}</span>
            {user ? (
              <>
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <User size={12} /> {user.name || user.email}
                </span>
                <button onClick={logout} className="btn btn-ghost btn-sm" style={{ padding: '0.25rem 0.5rem', marginLeft: '0.25rem' }} title="Cerrar sesión">
                  <LogOut size={14} />
                </button>
              </>
            ) : (
              <button onClick={() => setShowLogin(true)} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>
                <User size={14} /> Ingresar
              </button>
            )}
          </div>
        </div>

        <div className="sidebar-nav">
          {tabs.map((tab) => {
            const IconComp = tab.icon;
            const showBadge = tab.id === 'notifications' && unreadCount > 0;
            return (
              <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
                <span className="nav-badge-wrapper">
                  <IconComp size={18} />
                  {showBadge && (
                    <span className="badge-pill">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {renderSidebarContent()}
      </div>

      <button
        className="sidebar-toggle-btn"
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        title={isSidebarCollapsed ? "Mostrar panel" : "Ocultar panel"}
      >
        {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {renderMainContent()}

      {renderModals()}
    </div>
  );
}

// Default export wraps AppContent with ToastProvider
export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

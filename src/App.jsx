import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { reportsAPI } from './services/api';
import LoginPage from './pages/LoginPage';
import MapView from './pages/MapView';
import DashboardView from './pages/DashboardView';
import NotificationsView from './pages/NotificationsView';
import AdminView from './pages/AdminView';
import {
  Shield, Map, BarChart3, Bell, LogOut, User,
  Sun, Moon, ShieldCheck
} from 'lucide-react';

const PUBLIC_TABS = [
  { id: 'map', label: 'Mapa', icon: Map },
];

const AUTH_TABS = [
  { id: 'map', label: 'Mapa', icon: Map },
  { id: 'dashboard', label: 'Stats', icon: BarChart3 },
  { id: 'notifications', label: 'Alertas', icon: Bell },
];

export default function App() {
  const { user, loading: authLoading, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('map');
  const [reports, setReports] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [reportMode, setReportMode] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Estado compartido del formulario de reporte (lifted from MapView)
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [reportDesc, setReportDesc] = useState('');
  const [reportType, setReportType] = useState('ROBBERY');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    reportsAPI.getAll()
      .then((res) => {
        const data = res.data?.content || res.data || [];
        setReports(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error('Error fetching reports:', err));
  }, []);

  useEffect(() => { if (user) setShowLogin(false); }, [user]);

  const cancelReportMode = () => {
    setReportMode(false);
    setSelectedLocation(null);
    setReportDesc('');
  };

  const handleSubmitReport = async () => {
    if (!selectedLocation) return;
    setSubmitting(true);
    try {
      await reportsAPI.create({
        description: reportDesc,
        incidentType: reportType,
        address: `${selectedLocation.lat.toFixed(5)}, ${selectedLocation.lng.toFixed(5)}`,
        source: 'CITIZEN_TEXT',
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
      });
      setReportDesc('');
      setSelectedLocation(null);
      setReportMode(false);
      // Refrescar lista de reportes
      try {
        const res = await reportsAPI.getAll();
        const data = res.data?.content || res.data || [];
        setReports(Array.isArray(data) ? data : []);
      } catch (_) { /* ignorar error de refresh */ }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Error desconocido';
      alert(`Error al crear reporte: ${msg}`);
      console.error('Error creating report:', err.response?.data || err);
    } finally {
      setSubmitting(false);
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

  const tabs = user ? [...AUTH_TABS, ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: ShieldCheck }] : [])] : PUBLIC_TABS;

  // Props compartidos para MapView
  const mapProps = {
    reports, setReports,
    wsConnected, setWsConnected,
    isAuthenticated: !!user,
    reportMode, setReportMode,
    selectedLocation, setSelectedLocation,
    reportDesc, setReportDesc,
    reportType, setReportType,
    submitting, handleSubmitReport, cancelReportMode,
  };

  const renderSidebarContent = () => {
    switch (activeTab) {
      case 'map': return <MapView {...mapProps} section="sidebar" />;
      case 'dashboard': return <DashboardView section="sidebar" />;
      case 'notifications': return <NotificationsView section="sidebar" />;
      case 'admin': return <AdminView section="sidebar" />;
      default: return null;
    }
  };

  const renderMainContent = () => {
    switch (activeTab) {
      case 'map': return <MapView {...mapProps} section="main" theme={theme} />;
      case 'dashboard': return <DashboardView section="main" />;
      case 'notifications': return <NotificationsView section="main" />;
      case 'admin': return <AdminView section="main" />;
      default: return null;
    }
  };

  return (
    <div className="app-layout">
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
            return (
              <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
                <IconComp size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {renderSidebarContent()}
      </div>

      {renderMainContent()}

      {showLogin && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <LoginPage onBack={() => setShowLogin(false)} />
        </div>
      )}
    </div>
  );
}

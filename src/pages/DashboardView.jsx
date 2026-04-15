import { useState, useEffect } from 'react';
import { statsAPI } from '../services/api';
import { FileText, Clock, CheckCircle, XCircle, Users, MapPin, BarChart3, TrendingUp } from 'lucide-react';

const TYPE_LABELS = { ROBBERY: 'Robo', ACCIDENT: 'Accidente', TRAFFIC: 'Tráfico', TRANSIT_OP: 'Op. Tránsito', OTHER: 'Otro' };
const TYPE_COLORS = { ROBBERY: '#ef4444', ACCIDENT: '#f59e0b', TRAFFIC: '#eab308', TRANSIT_OP: '#3b82f6', OTHER: '#64748b' };

export default function DashboardView({ section }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const res = await statsAPI.getSummary();
      setStats(res.data);
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (section === 'main') {
    return (
      <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <BarChart3 size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Dashboard de Seguridad</p>
          <p style={{ fontSize: '0.82rem', maxWidth: 300, margin: '0.5rem auto 0' }}>
            Las estadísticas se actualizan en tiempo real con cada reporte procesado por el motor de IA.
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════ SIDEBAR ═══════════════
  if (loading) {
    return (<div className="sidebar-content"><div className="empty-state"><span className="spinner" /><p>Cargando estadísticas...</p></div></div>);
  }

  if (!stats) {
    return (<div className="sidebar-content"><div className="empty-state"><BarChart3 size={24} /><p>No se pudieron cargar las estadísticas</p><button className="btn btn-ghost btn-sm" onClick={loadStats}>Reintentar</button></div></div>);
  }

  const maxTypeCount = Math.max(...Object.values(stats.reportsByType || {}).map(Number), 1);

  return (
    <div className="sidebar-content">
      <div className="section-header">
        <h2>Dashboard</h2>
        <button className="btn btn-ghost btn-sm" onClick={loadStats}><TrendingUp size={14} /> Actualizar</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalReports || 0}</div>
          <div className="stat-label"><FileText size={12} style={{ display: 'inline', marginRight: 4 }} />Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{stats.pendingReports || 0}</div>
          <div className="stat-label"><Clock size={12} style={{ display: 'inline', marginRight: 4 }} />Pendientes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{stats.verifiedReports || 0}</div>
          <div className="stat-label"><CheckCircle size={12} style={{ display: 'inline', marginRight: 4 }} />Verificados</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{stats.rejectedReports || 0}</div>
          <div className="stat-label"><XCircle size={12} style={{ display: 'inline', marginRight: 4 }} />Rechazados</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalUsers || 0}</div>
          <div className="stat-label"><Users size={12} style={{ display: 'inline', marginRight: 4 }} />Usuarios</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalZones || 0}</div>
          <div className="stat-label"><MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />Zonas</div>
        </div>
      </div>

      <div className="glass-card">
        <div className="section-header"><h2 style={{ fontSize: '0.85rem' }}>Reportes por Tipo</h2></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
          {Object.entries(stats.reportsByType || {}).map(([type, count]) => (
            <div key={type}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{TYPE_LABELS[type] || type}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: TYPE_COLORS[type] || 'var(--text-muted)' }}>{count}</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(count / maxTypeCount) * 100}%`, background: TYPE_COLORS[type] || '#64748b', borderRadius: '3px', transition: 'width 0.5s ease' }} />
              </div>
            </div>
          ))}
          {Object.keys(stats.reportsByType || {}).length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Sin datos</p>}
        </div>
      </div>
    </div>
  );
}

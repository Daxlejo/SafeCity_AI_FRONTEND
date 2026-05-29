import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersAPI, reportsAPI } from '../services/api';
import { hashPassword } from '../utils/hashPassword';
import { subscribeToUserStats } from '../services/websocket';
import useReportQuota from '../hooks/useReportQuota';
import {
  User, Mail, CreditCard, Shield, Clock, Lock, AlertCircle, CheckCircle2,
  Edit2, ChevronDown, ChevronUp, ChevronRight, TrendingUp, FileText, ThumbsUp,
  ThumbsDown, BarChart3, Bell, Settings, Gauge, History, MapPin
} from 'lucide-react';
import { translateType, translateStatus } from '../services/dictionary';

// ═══════════════════════════════════════════
// COMPONENTE: ProfileView (Rediseñado — Agente 2)
// ═══════════════════════════════════════════
// Layout: columna única (no sidebar), scroll vertical
// Tarjeta 1: Info del usuario (avatar, nombre, TrueScore con barra de progreso)
// Tarjeta 2: Límites de reporte (usa useReportQuota)
// Tarjeta 3: Estadísticas del usuario
// Tarjeta 4: Seguridad (cambio de contraseña)
// ═══════════════════════════════════════════

/**
 * Obtiene el color del TrueScore según el nivel.
 */
function getTrustColor(score) {
  if (score >= 75) return 'var(--success)';
  if (score >= 55) return 'var(--warning)';
  return 'var(--error)';
}

/**
 * Obtiene la etiqueta textual del TrueScore.
 */
function getTrustLabel(score) {
  if (score >= 75) return 'Confiable';
  if (score >= 55) return 'Moderado';
  return 'Bajo';
}

export default function ProfileView({ section, onNavigateToAlerts }) {
  const { user, logout } = useAuth();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({ name: '', email: '' });
  const [editMode, setEditMode] = useState({ name: false, email: false });
  const [savingField, setSavingField] = useState(null);

  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [savingPass, setSavingPass] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);

  // Agente 3: Historial de reportes
  const [historyReports, setHistoryReports] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // 🔗 Agente 1 — Cuota de reportes
  const { quota, loading: quotaLoading } = useReportQuota(!!user);

  useEffect(() => {
    loadProfile();
  }, []);

  // Agente 3: Cargar historial cuando se expande
  useEffect(() => {
    if (isHistoryOpen && historyReports.length === 0) {
      loadHistory();
    }
  }, [isHistoryOpen]);

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await reportsAPI.getHistory(0, 50);
      setHistoryReports(res.data?.content || res.data || []);
    } catch (err) {
      console.error('Error loading report history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await usersAPI.getMe();
      setProfileData(res.data);
      setFormData({
        name: res.data.name || '',
        email: res.data.email || ''
      });
    } catch (err) {
      setError('Error al cargar el perfil.');
    } finally {
      setLoading(false);
    }
  };

  // Agente 1: Efecto para suscribirse a las stats en tiempo real
  useEffect(() => {
    let subscription = null;
    if (user?.id) {
      // Pequeño delay para dar tiempo a que el global websocket se conecte primero en App.jsx
      const timer = setTimeout(() => {
        subscription = subscribeToUserStats(user.id, (newStats) => {
          setProfileData(prev => prev ? {
            ...prev,
            reportCount: newStats.reportCount,
            approvedReports: newStats.approvedReports,
            rejectedReports: newStats.rejectedReports,
            trustLevel: newStats.trustLevel
          } : prev);
        });
      }, 1500);
      
      return () => {
        clearTimeout(timer);
        if (subscription) subscription.unsubscribe();
      };
    }
  }, [user?.id]);

  const handleEdit = (field) => {
    setEditMode(prev => ({ ...prev, [field]: true }));
  };

  const handleSave = async (field) => {
    setError(''); setSuccess('');

    if (!String(formData[field]).trim()) {
      setFormData(prev => ({ ...prev, [field]: profileData[field] || '' }));
      setEditMode(prev => ({ ...prev, [field]: false }));
      return;
    }

    if (formData[field] === profileData[field]) {
      setEditMode(prev => ({ ...prev, [field]: false }));
      return;
    }

    setSavingField(field);
    try {
      await usersAPI.updateMe({ [field]: formData[field] });
      setSuccess('Datos actualizados correctamente.');
      setProfileData((prev) => ({ ...prev, [field]: formData[field] }));
      setEditMode(prev => ({ ...prev, [field]: false }));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar los datos.');
      setFormData(prev => ({ ...prev, [field]: profileData[field] || '' }));
    } finally {
      setSavingField(null);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!passwords.current.trim()) {
      setError('Debes ingresar tu contraseña actual.');
      return;
    }
    if (passwords.new !== passwords.confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (passwords.new.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setSavingPass(true);
    try {
      const hashedCurrent = await hashPassword(passwords.current);
      const hashedNew = await hashPassword(passwords.new);
      await usersAPI.changePassword(hashedCurrent, hashedNew);
      setSuccess('Contraseña actualizada correctamente.');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar la contraseña.');
    } finally {
      setSavingPass(false);
    }
  };

  // ═══════════════ SIDEBAR (compacto) ═══════════════
  if (section === 'sidebar') {
    return (
      <div className="sidebar-content">
        <div className="section-header">
          <h2>Mi Perfil</h2>
        </div>
        <div className="glass-card profile-sidebar-card">
          <div className="profile-sidebar-avatar">
            <User size={40} />
          </div>
          <h3 className="profile-sidebar-name">
            {profileData?.name || user?.name || 'Usuario'}
          </h3>
          <p className="profile-sidebar-role">
            {profileData?.role === 'ADMIN' ? 'Administrador' : 'Ciudadano'}
          </p>
          <button className="btn btn-ghost btn-sm btn-full" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" />
      </div>
    );
  }

  const trustScore = profileData?.trustLevel ?? 50;
  const trustColor = getTrustColor(trustScore);
  const trustLabel = getTrustLabel(trustScore);

  // Estadísticas del usuario (datos que vengan del perfil)
  const userStats = {
    totalReports: profileData?.reportCount ?? 0,
    approvedReports: profileData?.approvedReports ?? 0,
    rejectedReports: profileData?.rejectedReports ?? 0,
  };

  return (
    <div className="main-content profile-redesigned">
      <div className="profile-container">

        {/* Alertas de error/éxito */}
        {error && (
          <div className="profile-alert profile-alert-error">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {success && (
          <div className="profile-alert profile-alert-success">
            <CheckCircle2 size={16} /> {success}
          </div>
        )}

        {/* ═══ TARJETA 1: Avatar + Info Principal + TrueScore ═══ */}
        <div className="glass-card profile-card profile-card-identity">
          <div className="profile-identity-top">
            <div className="profile-avatar-large">
              <User size={48} />
            </div>
            <div className="profile-identity-info">
              <h1 className="profile-name">{profileData?.name || 'Usuario'}</h1>
              <p className="profile-email">{profileData?.email || ''}</p>
              <div className="profile-badges">
                <span className="profile-role-badge">
                  <Shield size={12} />
                  {profileData?.role === 'ADMIN' ? 'Administrador' : 'Ciudadano'}
                </span>
                <span className="profile-date-badge">
                  <Clock size={12} />
                  Miembro desde {profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }) : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* TrueScore con barra de progreso premium */}
          <div className="profile-trust-section">
            <div className="profile-trust-header">
              <div className="profile-trust-label">
                <Gauge size={16} style={{ color: trustColor }} />
                <span>Nivel de Confianza</span>
              </div>
              <span className="profile-trust-badge" style={{ color: trustColor, background: `${trustColor}15` }}>
                {trustLabel} — {trustScore}%
              </span>
            </div>
            <div className="profile-trust-bar">
              <div
                className="profile-trust-bar-fill"
                style={{
                  width: `${trustScore}%`,
                  background: `linear-gradient(90deg, ${trustColor}cc, ${trustColor})`,
                }}
              />
            </div>
            <p className="profile-trust-hint">
              Tu TrueScore determina tu límite de reportes por hora. Sube tu puntuación con reportes verificados.
            </p>
          </div>
        </div>

        {/* ═══ TARJETA 2: Límites de Reporte ═══ */}
        <div className="glass-card profile-card profile-card-quota">
          <div className="profile-card-title">
            <BarChart3 size={18} style={{ color: 'var(--accent)' }} />
            <h2>Límites de Reporte</h2>
          </div>

          {quotaLoading ? (
            <div className="profile-quota-loading">
              <span className="spinner" style={{ width: 20, height: 20 }} />
              <span>Cargando cuota...</span>
            </div>
          ) : quota ? (
            <>
              <div className="profile-quota-visual">
                <div className="profile-quota-circle">
                  <svg viewBox="0 0 100 100" className="profile-quota-svg">
                    <circle cx="50" cy="50" r="42" className="profile-quota-ring-bg" />
                    <circle
                      cx="50" cy="50" r="42"
                      className="profile-quota-ring-fill"
                      style={{
                        strokeDasharray: `${(quota.remaining / quota.limit) * 264} 264`,
                        stroke: quota.remaining > 0 ? 'var(--success)' : 'var(--error)',
                      }}
                    />
                  </svg>
                  <div className="profile-quota-center">
                    <span className="profile-quota-value">{quota.remaining}</span>
                    <span className="profile-quota-label">disponibles</span>
                  </div>
                </div>
                <div className="profile-quota-details">
                  <div className="profile-quota-stat">
                    <span className="profile-quota-stat-value">{quota.limit}</span>
                    <span className="profile-quota-stat-label">Máximo por hora</span>
                  </div>
                  <div className="profile-quota-stat">
                    <span className="profile-quota-stat-value">{quota.used}</span>
                    <span className="profile-quota-stat-label">Usados esta hora</span>
                  </div>
                  {quota.resetsAt && (
                    <div className="profile-quota-stat">
                      <span className="profile-quota-stat-value profile-quota-reset">
                        <Clock size={12} /> {new Date(quota.resetsAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="profile-quota-stat-label">Se reinicia a las</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="profile-quota-hint">
                Tienes <strong>{quota.remaining}</strong> de <strong>{quota.limit}</strong> reportes disponibles esta hora.
              </p>
            </>
          ) : null}
        </div>

        {/* ═══ TARJETA 3: Estadísticas del Usuario ═══ */}
        <div className="glass-card profile-card profile-card-stats">
          <div className="profile-card-title">
            <TrendingUp size={18} style={{ color: 'var(--accent)' }} />
            <h2>Mis Estadísticas</h2>
          </div>
          <div className="profile-stats-grid">
            <div className="profile-stat-item">
              <div className="profile-stat-icon" style={{ background: 'var(--accent-glow)' }}>
                <FileText size={18} style={{ color: 'var(--accent)' }} />
              </div>
              <div className="profile-stat-data">
                <span className="profile-stat-number">{userStats.totalReports}</span>
                <span className="profile-stat-label">Reportes enviados</span>
              </div>
            </div>
            <div className="profile-stat-item">
              <div className="profile-stat-icon" style={{ background: 'var(--success-bg)' }}>
                <ThumbsUp size={18} style={{ color: 'var(--success)' }} />
              </div>
              <div className="profile-stat-data">
                <span className="profile-stat-number">{userStats.approvedReports}</span>
                <span className="profile-stat-label">Aprobados</span>
              </div>
            </div>
            <div className="profile-stat-item">
              <div className="profile-stat-icon" style={{ background: 'var(--error-bg)' }}>
                <ThumbsDown size={18} style={{ color: 'var(--error)' }} />
              </div>
              <div className="profile-stat-data">
                <span className="profile-stat-number">{userStats.rejectedReports}</span>
                <span className="profile-stat-label">Rechazados</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ TARJETA 3.5: Historial de Reportes (Agente 3) ═══ */}
        <div className="glass-card profile-card">
          <div
            className="profile-card-title profile-card-title-toggle"
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={18} style={{ color: 'var(--accent)' }} />
              <h2>Mi Historial de Reportes</h2>
            </div>
            {isHistoryOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>

          {isHistoryOpen && (
            <div style={{ marginTop: '1rem' }}>
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <span className="spinner" style={{ width: 24, height: 24 }} />
                </div>
              ) : historyReports.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                  Aún no has enviado ningún reporte.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
                  {historyReports.map((r) => {
                    const statusColor = { PENDING: '#f59e0b', VERIFIED: '#10b981', REJECTED: '#ef4444', RESOLVED: '#6366f1', EXPIRED: '#9ca3af' }[r.status] || '#64748b';
                    return (
                      <div key={r.id} style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '0.75rem 1rem', background: 'var(--bg-secondary)',
                        borderRadius: '8px', border: '1px solid var(--border-color)',
                        borderLeft: `3px solid ${statusColor}`
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <span style={{
                              fontSize: '0.65rem', padding: '0.15rem 0.5rem',
                              borderRadius: '100px', fontWeight: 600,
                              background: `${statusColor}20`, color: statusColor
                            }}>
                              {translateStatus(r.status)}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {translateType(r.incidentType?.toString())}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.description || 'Sin descripción'}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                            {r.address && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <MapPin size={10} /> {r.address}
                              </span>
                            )}
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <Clock size={10} /> {r.reportDate ? new Date(r.reportDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </span>
                          </div>
                        </div>
                        {r.trustScore != null && (
                          <div style={{ textAlign: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: r.trustScore >= 60 ? 'var(--success)' : 'var(--error)' }}>
                              {Math.round(r.trustScore)}
                            </span>
                            <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', margin: 0 }}>Score</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ TARJETA 4: Información Personal Editable ═══ */}
        <div className="glass-card profile-card profile-card-info">
          <div className="profile-card-title">
            <Settings size={18} style={{ color: 'var(--accent)' }} />
            <h2>Información Personal</h2>
          </div>

          {/* Nombre */}
          <div className="form-group">
            <label className="profile-field-label">
              <User size={14} /> Nombre Completo
            </label>
            <div className="profile-field-row">
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!editMode.name}
                style={{ opacity: editMode.name ? 1 : 0.7 }}
              />
              {editMode.name ? (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => handleSave('name')} disabled={savingField === 'name'}>
                  {savingField === 'name' ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <CheckCircle2 size={16} />}
                </button>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleEdit('name')}>
                  <Edit2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Correo */}
          <div className="form-group">
            <label className="profile-field-label">
              <Mail size={14} /> Correo Electrónico
            </label>
            <div className="profile-field-row">
              <input
                type="email"
                className="form-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!editMode.email}
                style={{ opacity: editMode.email ? 1 : 0.7 }}
              />
              {editMode.email ? (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => handleSave('email')} disabled={savingField === 'email'}>
                  {savingField === 'email' ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <CheckCircle2 size={16} />}
                </button>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleEdit('email')}>
                  <Edit2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Cédula (solo lectura) */}
          <div className="form-group">
            <label className="profile-field-label">
              <CreditCard size={14} /> Cédula
            </label>
            <input
              type="text"
              className="form-input"
              value={profileData?.cedula || '—'}
              disabled
              style={{ opacity: 0.7, cursor: 'not-allowed' }}
            />
          </div>
        </div>

        {/* ═══ TARJETA 4.5: Preferencias de Alertas ═══ */}
        {section === 'main' && onNavigateToAlerts && (
          <div 
            className="glass-card profile-card" 
            style={{ 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              transition: 'all var(--transition-fast)'
            }} 
            onClick={onNavigateToAlerts}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bell size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Preferencias de Alertas</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, marginTop: '0.15rem' }}>Configura los incidentes de los que quieres recibir notificaciones</p>
              </div>
            </div>
            <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
          </div>
        )}

        {/* ═══ TARJETA 5: Seguridad ═══ */}
        <div className="glass-card profile-card profile-card-security">
          <div
            className="profile-card-title profile-card-title-toggle"
            onClick={() => setIsSecurityOpen(!isSecurityOpen)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={18} style={{ color: 'var(--accent)' }} />
              <h2>Seguridad</h2>
            </div>
            {isSecurityOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>

          {isSecurityOpen && (
            <div className="profile-security-body">
              <form onSubmit={handleUpdatePassword} className="profile-security-form">
                <div className="form-group">
                  <label>Contraseña Actual</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwords.current}
                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    placeholder="Obligatorio para cambiar"
                  />
                </div>
                <div className="form-group">
                  <label>Nueva Contraseña</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwords.new}
                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div className="form-group">
                  <label>Confirmar Nueva Contraseña</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    placeholder="Repite la contraseña"
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ marginTop: '0.5rem' }}
                  disabled={savingPass || !passwords.new || !passwords.confirm}
                >
                  {savingPass ? <span className="spinner" /> : 'Actualizar Contraseña'}
                </button>
              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

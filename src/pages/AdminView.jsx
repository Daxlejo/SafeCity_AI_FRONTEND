import { useState, useEffect } from 'react';
import { adminAPI, reportsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck, Users, FileText, CheckCircle, XCircle,
  AlertTriangle, Clock, Eye, Trash2
} from 'lucide-react';

const STATUS_OPTIONS = ['PENDING', 'VERIFIED', 'REJECTED', 'RESOLVED'];

export default function AdminView({ section }) {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [activeAdminTab, setActiveAdminTab] = useState('reports');

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
    loadReports();
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      const res = await adminAPI.getUsers(0, 50);
      setUsers(res.data?.content || res.data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadReports = async () => {
    try {
      const res = await reportsAPI.getAll(0, 100);
      setReports(res.data?.content || res.data || []);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await adminAPI.updateReportStatus(id, newStatus);
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  if (section === 'main') {
    return (
      <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <ShieldCheck size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Panel de Administración</p>
          <p style={{ fontSize: '0.82rem', maxWidth: 300, margin: '0.5rem auto 0' }}>
            Modera reportes, gestiona usuarios y supervisa la plataforma desde aquí.
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="sidebar-content">
        <div className="empty-state">
          <ShieldCheck size={24} />
          <p>No tienes permisos de administrador</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar-content">
      <div className="section-header">
        <h2>Admin</h2>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <button
          className={`btn btn-sm ${activeAdminTab === 'reports' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveAdminTab('reports')}
        >
          <FileText size={14} /> Reportes
        </button>
        <button
          className={`btn btn-sm ${activeAdminTab === 'users' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveAdminTab('users')}
        >
          <Users size={14} /> Usuarios
        </button>
      </div>

      {/* Reports moderation */}
      {activeAdminTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {loadingReports ? (
            <div className="empty-state"><span className="spinner" /><p>Cargando reportes...</p></div>
          ) : reports.length === 0 ? (
            <div className="empty-state"><FileText size={24} /><p>No hay reportes</p></div>
          ) : (
            reports.slice(0, 50).map((r) => (
              <div className="glass-card" key={r.id} style={{ padding: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <span className={`badge badge-${r.incidentType?.toLowerCase()}`}>{r.incidentType}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ID: {r.id}</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', lineHeight: 1.3 }}>
                  {r.description?.substring(0, 100) || 'Sin descripción'}
                </p>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      className={`btn btn-sm ${r.status === s ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => updateStatus(r.id, s)}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}
                    >
                      {s === 'PENDING' && <Clock size={10} />}
                      {s === 'VERIFIED' && <CheckCircle size={10} />}
                      {s === 'REJECTED' && <XCircle size={10} />}
                      {s === 'RESOLVED' && <Eye size={10} />}
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Users list */}
      {activeAdminTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {loadingUsers ? (
            <div className="empty-state"><span className="spinner" /><p>Cargando usuarios...</p></div>
          ) : users.length === 0 ? (
            <div className="empty-state"><Users size={24} /><p>No hay usuarios</p></div>
          ) : (
            users.map((u) => (
              <div className="glass-card" key={u.id} style={{ padding: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.email}</div>
                  </div>
                  <span className={`badge ${u.role === 'ADMIN' ? 'badge-robbery' : 'badge-transit_op'}`}>
                    {u.role}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <span>Cédula: {u.cedula || '—'}</span>
                  <span>Trust: {u.trustLevel != null ? u.trustLevel : '—'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

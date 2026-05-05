import { useState, useEffect } from 'react';
import { notificationsAPI } from '../services/api';
import { Bell, BellOff, Check, AlertTriangle, Info, AlertCircle } from 'lucide-react';

const TYPE_CONFIG = {
  ALERT:   { icon: AlertTriangle, color: 'var(--warning)', bg: 'var(--warning-bg)' },
  WARNING: { icon: AlertCircle,   color: 'var(--error)',   bg: 'var(--error-bg)' },
  INFO:    { icon: Info,          color: 'var(--info)',    bg: 'var(--info-bg)' },
};

export default function NotificationsView({ section, unreadCount = 0, setUnreadCount }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNotifications(); }, []);

  // Reset badge when the user opens the notifications panel
  useEffect(() => {
    if (section === 'sidebar' && unreadCount > 0 && setUnreadCount) {
      setUnreadCount(0);
    }
  }, [section, unreadCount, setUnreadCount]);

  const loadNotifications = async () => {
    try {
      const res = await notificationsAPI.getAll();
      setNotifications(Array.isArray(res.data) ? res.data : res.data?.content || []);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const localUnread = notifications.filter((n) => !n.read).length;

  if (section === 'main') {
    if (loading) {
      return (
        <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <span className="spinner" />
            <p style={{ marginTop: '1rem' }}>Cargando notificaciones...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="main-content" style={{ overflow: 'auto', padding: '1.5rem', background: 'var(--bg-primary)' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={22} style={{ color: 'var(--accent)' }} />
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Notificaciones</h1>
            </div>
            {localUnread > 0 && (
              <span style={{
                background: 'var(--error-bg)', color: 'var(--error)',
                borderRadius: 'var(--radius-full)', padding: '0.2rem 0.65rem',
                fontSize: '0.72rem', fontWeight: 700,
              }}>
                {localUnread} sin leer
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {notifications.length === 0 ? (
              <div className="empty-state" style={{ padding: '3rem' }}>
                <BellOff size={36} />
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>No tienes notificaciones</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Recibirás alertas cuando se detecten incidentes o tus reportes sean moderados.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.INFO;
                const IconComp = config.icon;
                return (
                  <div key={n.id} className={`notification-item ${!n.read ? 'unread' : ''}`}
                    onClick={() => !n.read && markAsRead(n.id)} style={{ cursor: n.read ? 'default' : 'pointer' }}>
                    <div className="notification-icon" style={{ background: config.bg }}>
                      <IconComp size={16} style={{ color: config.color }} />
                    </div>
                    <div className="notification-body">
                      <div className="notif-title">{n.title}</div>
                      <div className="notif-message">{n.message}</div>
                      {n.createdAt && (
                        <div className="notif-time">
                          {new Date(n.createdAt).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                    {!n.read && <div style={{ flexShrink: 0, alignSelf: 'center' }}><Check size={14} style={{ color: 'var(--text-muted)' }} /></div>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════ SIDEBAR ═══════════════
  if (loading) {
    return (<div className="sidebar-content"><div className="empty-state"><span className="spinner" /><p>Cargando notificaciones...</p></div></div>);
  }

  return (
    <div className="sidebar-content">
      <div className="section-header">
        <h2>Notificaciones</h2>
        {localUnread > 0 && (
          <span style={{
            background: 'var(--error-bg)', color: 'var(--error)',
            borderRadius: 'var(--radius-full)', padding: '0.15rem 0.55rem',
            fontSize: '0.7rem', fontWeight: 700,
          }}>
            {localUnread} sin leer
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {notifications.length === 0 ? (
          <div className="empty-state"><BellOff size={24} /><p>No tienes notificaciones</p></div>
        ) : (
          notifications.map((n) => {
            const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.INFO;
            const IconComp = config.icon;
            return (
              <div key={n.id} className={`notification-item ${!n.read ? 'unread' : ''}`}
                onClick={() => !n.read && markAsRead(n.id)} style={{ cursor: n.read ? 'default' : 'pointer' }}>
                <div className="notification-icon" style={{ background: config.bg }}>
                  <IconComp size={16} style={{ color: config.color }} />
                </div>
                <div className="notification-body">
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-message">{n.message}</div>
                  {n.createdAt && (
                    <div className="notif-time">
                      {new Date(n.createdAt).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
                {!n.read && <div style={{ flexShrink: 0, alignSelf: 'center' }}><Check size={14} style={{ color: 'var(--text-muted)' }} /></div>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { osintAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Newspaper, Calendar, ExternalLink, Shield, Clock,
  ChevronLeft, ChevronRight, Eye, EyeOff, Trash2, RefreshCw,
  Radio, AlertTriangle, Car, ShoppingBag, MapPin
} from 'lucide-react';

// ════════════════════════════════════
// CONSTANTES DE PRESENTACIÓN
// ════════════════════════════════════

const TYPE_CONFIG = {
  ROBBERY:    { label: 'Robo / Hurto',       color: '#ef4444', bg: '#ef444415', Icon: ShoppingBag },
  ACCIDENT:   { label: 'Accidente de Tránsito', color: '#f59e0b', bg: '#f59e0b15', Icon: AlertTriangle },
  TRAFFIC:    { label: 'Congestión Vial',       color: '#3b82f6', bg: '#3b82f615', Icon: Car },
  TRANSIT_OP: { label: 'Operativo Tránsito',  color: '#6366f1', bg: '#6366f115', Icon: Radio },
  OTHER:      { label: 'Otro incidente',      color: '#64748b', bg: '#64748b15', Icon: Shield },
};

const SOURCE_LABELS = {
  SOCIAL_MEDIA: { label: 'Redes Sociales', emoji: '📱' },
  INSTITUTIONAL: { label: 'Prensa / Medios', emoji: '📰' },
};

// ════════════════════════════════════
// HELPERS
// ════════════════════════════════════

function formatRelativeTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

function formatFullDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      weekday: 'short', day: 'numeric', month: 'short',
      year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return null;
  }
}

function getTrustColor(score) {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

// ════════════════════════════════════
// TARJETA DE NOTICIA — Línea de tiempo
// ════════════════════════════════════

function NewsCard({ article, isAdmin, onStatusChange, onDelete, isFirst }) {
  const cfg = TYPE_CONFIG[article.incidentType] || TYPE_CONFIG.OTHER;
  const IconComp = cfg.Icon;
  const sourceCfg = SOURCE_LABELS[article.sourceType] || { label: article.sourceType, emoji: '🔎' };
  const isHidden = article.status === 'HIDDEN';

  return (
    <div style={{ display: 'flex', gap: '0.75rem', opacity: isHidden ? 0.55 : 1 }}>

      {/* Línea de tiempo — punto + línea vertical */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 28 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: cfg.bg, border: `2px solid ${cfg.color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <IconComp size={13} style={{ color: cfg.color }} />
        </div>
        {!isFirst && (
          <div style={{ width: 2, flex: 1, minHeight: 16, background: 'var(--border-color)', marginTop: 4 }} />
        )}
      </div>

      {/* Contenido de la tarjeta */}
      <div className="glass-card" style={{
        flex: 1, padding: '0.9rem 1rem', marginBottom: '0.75rem',
        borderLeft: `3px solid ${cfg.color}`,
        transition: 'opacity 0.2s ease',
      }}>

        {/* Header: badge tipo + estado + trust score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <span style={{
            fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem',
            borderRadius: '1rem', background: cfg.bg, color: cfg.color, letterSpacing: '0.3px'
          }}>
            {cfg.label.toUpperCase()}
          </span>

          {isAdmin && isHidden && (
            <span style={{
              fontSize: '0.6rem', padding: '0.15rem 0.4rem', borderRadius: '1rem',
              background: '#f59e0b22', color: '#f59e0b', fontWeight: 600
            }}>
              OCULTO
            </span>
          )}

          {article.trustScore != null && (
            <span style={{
              marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 600,
              color: getTrustColor(article.trustScore)
            }}>
              {article.trustScore.toFixed(0)}% confianza IA
            </span>
          )}
        </div>

        {/* Título / Summary */}
        <p style={{
          fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-primary)',
          lineHeight: 1.5, marginBottom: '0.5rem'
        }}>
          {article.summary || article.title}
        </p>

        {/* Meta: fecha + fuente + enlace */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <Clock size={11} />
            <span title={formatFullDate(article.createdAt)}>
              {formatRelativeTime(article.createdAt)}
            </span>
          </span>

          {article.estimatedDate && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <Calendar size={11} />
              Incidente: {formatFullDate(article.estimatedDate)}
            </span>
          )}

          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {sourceCfg.emoji} {sourceCfg.label}
          </span>

          {article.sourceUrl && (
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.25rem',
                fontSize: '0.72rem', color: 'var(--accent)', textDecoration: 'none',
                marginLeft: 'auto'
              }}
            >
              <ExternalLink size={11} /> Ver fuente
            </a>
          )}
        </div>

        {/* Acciones de moderación — solo visibles para admin */}
        {isAdmin && (
          <div style={{
            display: 'flex', gap: '0.4rem', marginTop: '0.6rem',
            paddingTop: '0.6rem', borderTop: '1px solid var(--border-color)'
          }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onStatusChange(article.id, isHidden ? 'PUBLISHED' : 'HIDDEN')}
              style={{
                fontSize: '0.7rem', color: isHidden ? '#10b981' : '#f59e0b',
                display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem'
              }}
              title={isHidden ? 'Publicar en feed público' : 'Ocultar del feed público'}
            >
              {isHidden ? <><Eye size={12} /> Publicar</> : <><EyeOff size={12} /> Ocultar</>}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onDelete(article.id)}
              style={{ fontSize: '0.7rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem' }}
              title="Eliminar permanentemente"
            >
              <Trash2 size={12} /> Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════

/**
 * Feed de noticias OSINT — línea de tiempo.
 *
 * Modo público: solo artículos PUBLISHED, sin controles de admin.
 * Modo admin  : todos los artículos (PUBLISHED + HIDDEN) con botones de moderación.
 *
 * Props:
 *   adminMode (bool) — si true, usa endpoint admin y muestra controles de moderación.
 */
export default function OsintNewsFeed({ adminMode = false }) {
  const { isAdmin } = useAuth();
  const effectiveAdmin = adminMode && isAdmin;

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const loadNews = useCallback(async (pageNum, silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = effectiveAdmin
        ? await osintAPI.getAllNewsAdmin(pageNum, 30)
        : await osintAPI.getNews(pageNum, 15);
      const data = res.data;
      setArticles(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
      setPage(pageNum);
    } catch (err) {
      console.error('Error cargando noticias OSINT:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [effectiveAdmin]);

  useEffect(() => { loadNews(0); }, [loadNews]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await osintAPI.updateNewsStatus(id, newStatus);
      setArticles(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    } catch (err) {
      alert('Error al cambiar estado: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este artículo permanentemente? Esta acción no se puede deshacer.')) return;
    try {
      await osintAPI.deleteNews(id);
      setArticles(prev => prev.filter(a => a.id !== id));
      setTotalElements(prev => prev - 1);
    } catch (err) {
      alert('Error al eliminar: ' + (err.response?.data?.message || err.message));
    }
  };

  // ════════ LOADING ════════
  if (loading && articles.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem', color: 'var(--text-muted)' }}>
        <span className="spinner" />
        <p style={{ fontSize: '0.85rem' }}>Cargando noticias de Pasto...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: effectiveAdmin ? '100%' : 720, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Newspaper size={20} style={{ color: 'var(--accent)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {effectiveAdmin ? 'Moderación de Noticias OSINT' : 'Noticias de Seguridad — Pasto'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {effectiveAdmin
                ? `${totalElements} artículos (incluye ocultos)`
                : `${totalElements} incidentes detectados por IA en los últimos 3 días`}
            </p>
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => loadNews(page, true)}
          disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}
          title="Actualizar"
        >
          <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {/* Sin artículos */}
      {articles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Shield size={36} style={{ opacity: 0.25, marginBottom: '0.75rem' }} />
          <p style={{ fontSize: '0.85rem' }}>No hay noticias de seguridad detectadas aún</p>
          <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
            El sistema escanea automáticamente cada hora
          </p>
        </div>
      ) : (
        <div>
          {/* Línea de tiempo */}
          {articles.map((article, idx) => (
            <NewsCard
              key={article.id}
              article={article}
              isAdmin={effectiveAdmin}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              isFirst={idx === 0}
            />
          ))}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => loadNews(page - 1)}
            disabled={page === 0 || loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            <ChevronLeft size={14} /> Anterior
          </button>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Página {page + 1} de {totalPages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => loadNews(page + 1)}
            disabled={page >= totalPages - 1 || loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            Siguiente <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

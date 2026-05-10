import { useState, useEffect, useCallback } from 'react';
import { osintAPI } from '../services/api';
import {
  Newspaper, Calendar, ExternalLink, Shield,
  ChevronLeft, ChevronRight, AlertTriangle
} from 'lucide-react';

const TYPE_LABELS = {
  ROBBERY: 'Robo', ACCIDENT: 'Accidente', TRAFFIC: 'Tráfico',
  TRANSIT_OP: 'Op. Tránsito', OTHER: 'Otro'
};

const TYPE_ICONS = {
  ROBBERY: '🔴', ACCIDENT: '🟡', TRAFFIC: '🟠',
  TRANSIT_OP: '🔵', OTHER: '⚪'
};

/**
 * Página completa de noticias de seguridad de la ciudad.
 * Accesible para todos los usuarios (incluso sin autenticación).
 * Muestra artículos OsintNewsArticle paginados por fecha descendente.
 */
export default function CityNewsFeed() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const loadNews = useCallback(async (pageNum) => {
    setLoading(true);
    try {
      const res = await osintAPI.getNews(pageNum, 12);
      const data = res.data;
      setArticles(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
      setPage(pageNum);
    } catch (err) {
      console.error('Error cargando noticias:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNews(0); }, [loadNews]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('es-CO', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 60) return `hace ${mins}min`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `hace ${hours}h`;
      const days = Math.floor(hours / 24);
      return `hace ${days}d`;
    } catch {
      return '';
    }
  };

  const getTrustColor = (score) => {
    if (score >= 70) return 'var(--success)';
    if (score >= 40) return 'var(--warning)';
    return 'var(--error)';
  };

  return (
    <div className="city-news-page">
      {/* Header */}
      <div className="city-news-hero">
        <div className="city-news-hero-content">
          <div className="city-news-hero-icon">
            <Newspaper size={28} />
          </div>
          <div>
            <h1 className="city-news-hero-title">Noticias de Seguridad</h1>
            <p className="city-news-hero-subtitle">
              Incidentes detectados automáticamente por inteligencia artificial
            </p>
          </div>
        </div>
        {totalElements > 0 && (
          <span className="city-news-hero-count">
            {totalElements} {totalElements === 1 ? 'artículo' : 'artículos'}
          </span>
        )}
      </div>

      {/* Contenido */}
      {loading && articles.length === 0 ? (
        <div className="city-news-loading">
          <span className="spinner" />
          <p>Cargando noticias de seguridad...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="city-news-empty">
          <Shield size={48} style={{ opacity: 0.15 }} />
          <h3>Sin noticias por el momento</h3>
          <p>El sistema OSINT aún no ha detectado noticias de seguridad relevantes.</p>
        </div>
      ) : (
        <>
          <div className="city-news-grid">
            {articles.map((article) => (
              <article key={article.id} className="city-news-card">
                {/* Tipo de incidente */}
                <div className="city-news-card-top">
                  <span className={`badge badge-${article.incidentType?.toLowerCase()}`}>
                    {TYPE_ICONS[article.incidentType] || '⚪'}{' '}
                    {TYPE_LABELS[article.incidentType] || article.incidentType}
                  </span>
                  <span className="city-news-card-ago">
                    {getTimeAgo(article.createdAt)}
                  </span>
                </div>

                {/* Título */}
                <h3 className="city-news-card-title">{article.title}</h3>

                {/* Resumen */}
                {article.summary && article.summary !== article.title && (
                  <p className="city-news-card-summary">{article.summary}</p>
                )}

                {/* Trust score */}
                {article.trustScore != null && (
                  <div className="city-news-card-trust">
                    <div className="trust-bar">
                      <div
                        className="trust-bar-fill"
                        style={{
                          width: `${Math.min(100, article.trustScore)}%`,
                          background: getTrustColor(article.trustScore)
                        }}
                      />
                    </div>
                    <span style={{ color: getTrustColor(article.trustScore) }}>
                      {article.trustScore.toFixed(0)}% confianza IA
                    </span>
                  </div>
                )}

                {/* Meta */}
                <div className="city-news-card-meta">
                  <span>
                    <Calendar size={12} />
                    {formatDate(article.createdAt)}
                  </span>
                  {article.sourceType && (
                    <span>
                      {article.sourceType === 'SOCIAL_MEDIA' ? '📱 Redes' : '📰 Prensa'}
                    </span>
                  )}
                  {article.sourceUrl && (
                    <a
                      href={article.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="city-news-card-link"
                    >
                      <ExternalLink size={12} /> Ver fuente
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="city-news-pagination">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => loadNews(page - 1)}
                disabled={page === 0 || loading}
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <div className="city-news-page-dots">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageIdx = Math.max(0, Math.min(totalPages - 5, page - 2)) + i;
                  if (pageIdx >= totalPages) return null;
                  return (
                    <button
                      key={pageIdx}
                      className={`city-news-page-dot ${pageIdx === page ? 'active' : ''}`}
                      onClick={() => loadNews(pageIdx)}
                    >
                      {pageIdx + 1}
                    </button>
                  );
                })}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => loadNews(page + 1)}
                disabled={page >= totalPages - 1 || loading}
              >
                Siguiente <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

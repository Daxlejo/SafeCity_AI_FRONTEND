import { useState, useEffect, useCallback } from 'react';
import { osintAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Search, Newspaper, Calendar, ExternalLink, Activity, ShieldAlert
} from 'lucide-react';

const TYPE_LABELS = {
  ROBBERY: 'Robo', ACCIDENT: 'Accidente', TRAFFIC: 'Tráfico',
  TRANSIT_OP: 'Op. Tránsito', OTHER: 'Otro'
};

export default function OsintView({ section = 'main' }) {
  const { showToast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [articles, setArticles] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const fetchNews = useCallback(async () => {
    try {
      const res = await osintAPI.getNews(0, 20); // Obtener las más recientes
      setArticles(res.data?.content || []);
    } catch (err) {
      console.error('Error al obtener noticias OSINT:', err);
    }
  }, []);

  useEffect(() => {
    fetchNews().finally(() => setLoadingInitial(false));
  }, [fetchNews]);

  const handleScan = async () => {
    setIsScanning(true);
    showToast('Iniciando escaneo OSINT en la web...', 'info');
    try {
      // Llamar al endpoint de escaneo
      await osintAPI.scan();
      showToast('Escaneo completado exitosamente.', 'success');
      // Refrescar las noticias para mostrar las nuevas
      await fetchNews();
    } catch (error) {
      console.error('Error durante el escaneo:', error);
      showToast('Error al ejecutar el escaneo OSINT', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getTrustColor = (score) => {
    if (score >= 70) return 'var(--success)';
    if (score >= 40) return 'var(--warning)';
    return 'var(--error)';
  };

  if (section === 'sidebar') {
    return (
      <div className="view-enter" style={{ padding: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={18} /> OSINT
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Módulo de inteligencia de fuentes abiertas para administradores. Escanea noticias locales en tiempo real.
        </p>
      </div>
    );
  }

  return (
    <div className="view-enter" style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
      <div className="osint-news-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={24} color="var(--accent)" /> Scanner OSINT
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.85rem' }}>
            Busca y analiza noticias recientes sobre incidentes en la ciudad
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleScan} 
          disabled={isScanning}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {isScanning ? (
            <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Escaneando...</>
          ) : (
            <><Search size={16} /> Escanear noticias</>
          )}
        </button>
      </div>

      {loadingInitial ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 120, width: '100%' }} />
          ))}
        </div>
      ) : isScanning ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Loading Skeletons for scanning mode */}
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ padding: '1.25rem', background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
              <div className="skeleton" style={{ height: 20, width: '150px', marginBottom: '1rem' }} />
              <div className="skeleton" style={{ height: 24, width: '80%', marginBottom: '0.5rem' }} />
              <div className="skeleton" style={{ height: 16, width: '100%', marginBottom: '1rem' }} />
              <div className="skeleton" style={{ height: 16, width: '60%' }} />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="empty-state-container">
          <ShieldAlert size={48} />
          <h3>Sin resultados</h3>
          <p>Aún no hay noticias almacenadas. Ejecuta un escaneo para buscar incidentes.</p>
        </div>
      ) : (
        <div className="osint-news-list">
          {articles.map((article) => (
            <div key={article.id} className="osint-news-card">
              <div className="osint-news-card-header">
                <span className={`badge badge-${article.incidentType?.toLowerCase() || 'other'}`}>
                  {TYPE_LABELS[article.incidentType] || article.incidentType || 'Noticia'}
                </span>
                {article.trustScore != null && (
                  <span
                    className="osint-news-trust"
                    style={{ color: getTrustColor(article.trustScore) }}
                  >
                    {article.trustScore.toFixed(0)}% confianza IA
                  </span>
                )}
              </div>

              <h4 className="osint-news-card-title" style={{ fontSize: '1.05rem', margin: '0.5rem 0' }}>
                {article.title}
              </h4>

              {article.summary && article.summary !== article.title && (
                <p className="osint-news-card-summary" style={{ fontSize: '0.85rem' }}>
                  {article.summary}
                </p>
              )}

              <div className="osint-news-card-meta" style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                <span className="osint-news-meta-item">
                  <Calendar size={14} />
                  {formatDate(article.createdAt || article.publishedAt)}
                </span>
                {article.sourceUrl && (
                  <a
                    href={article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="osint-news-meta-link"
                    style={{ marginLeft: 'auto' }}
                  >
                    <ExternalLink size={14} /> Leer fuente
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

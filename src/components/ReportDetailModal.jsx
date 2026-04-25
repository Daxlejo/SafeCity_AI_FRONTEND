import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { X, MapPin, Shield, Clock, CheckCircle, XCircle, Eye, FileText, Camera } from 'lucide-react';
import { uploadAPI } from '../services/api';

const TYPE_LABELS = {
  ROBBERY: 'Robo', ACCIDENT: 'Accidente', TRAFFIC: 'Tráfico',
  TRANSIT_OP: 'Op. Tránsito', OTHER: 'Otro'
};
const TYPE_COLORS = {
  ROBBERY: '#ef4444', ACCIDENT: '#f59e0b', TRAFFIC: '#eab308',
  TRANSIT_OP: '#3b82f6', OTHER: '#64748b'
};
const STATUS_COLORS = {
  PENDING: '#f59e0b', VERIFIED: '#10b981', REJECTED: '#ef4444', RESOLVED: '#6366f1'
};
const STATUS_LABELS = {
  PENDING: 'Pendiente', VERIFIED: 'Verificado', REJECTED: 'Rechazado', RESOLVED: 'Resuelto'
};
const STATUS_ICONS = {
  PENDING: Clock,
  VERIFIED: CheckCircle,
  REJECTED: XCircle,
  RESOLVED: Eye,
};

export default function ReportDetailModal({ report, onClose }) {
  const miniMapRef = useRef(null);
  const miniMapInstance = useRef(null);

  // Mini mapa centrado en el reporte
  useEffect(() => {
    if (!report?.latitude || !report?.longitude || !miniMapRef.current) return;
    if (miniMapInstance.current) return; // ya inicializado

    miniMapInstance.current = L.map(miniMapRef.current, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      attributionControl: false,
    }).setView([report.latitude, report.longitude], 16);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(miniMapInstance.current);

    const color = TYPE_COLORS[report.incidentType] || '#64748b';
    L.divIcon({
      className: 'custom-marker',
      html: `<div style="width:14px;height:14px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 0 12px ${color}80;"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    L.marker([report.latitude, report.longitude], {
      icon: L.divIcon({
        className: 'custom-marker',
        html: `<div style="width:14px;height:14px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 0 12px ${color}80;"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })
    }).addTo(miniMapInstance.current);

    return () => {
      if (miniMapInstance.current) {
        miniMapInstance.current.remove();
        miniMapInstance.current = null;
      }
    };
  }, [report]);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!report) return null;

  const color = TYPE_COLORS[report.incidentType] || '#64748b';
  const statusColor = STATUS_COLORS[report.status] || '#64748b';
  const StatusIcon = STATUS_ICONS[report.status] || Clock;
  const trustColor = report.trustScore >= 70 ? '#10b981' : report.trustScore >= 40 ? '#f59e0b' : '#ef4444';
  const photoUrl = report.photoUrl ? uploadAPI.getPhotoUrl(report.photoUrl) : null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '1rem',
        width: '100%',
        maxWidth: 540,
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.25rem 0',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              padding: '0.3rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700,
              background: `${color}22`, color,
            }}>
              {TYPE_LABELS[report.incidentType] || report.incidentType}
            </div>
            <div style={{
              padding: '0.3rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600,
              background: `${statusColor}22`, color: statusColor,
              display: 'flex', alignItems: 'center', gap: '0.3rem'
            }}>
              <StatusIcon size={12} />
              {STATUS_LABELS[report.status] || report.status}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '0.25rem', borderRadius: '0.35rem',
              display: 'flex', alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1rem 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Descripción */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
              <FileText size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descripción</span>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {report.description || 'Sin descripción'}
            </p>
          </div>

          {/* Ubicación y fecha */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                <MapPin size={12} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ubicación</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                {report.address || (report.latitude ? `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}` : 'Sin ubicación')}
              </p>
            </div>
            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                <Clock size={12} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fecha</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                {report.reportDate ? new Date(report.reportDate).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
              </p>
            </div>
          </div>

          {/* Score IA */}
          {report.trustScore != null && (
            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Shield size={12} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confianza IA</span>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: trustColor }}>
                  {report.trustScore.toFixed(0)}%
                </span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${report.trustScore}%`, background: trustColor, borderRadius: 3, transition: 'width 0.6s ease' }} />
              </div>
              {report.aiAnalysis && (
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem', lineHeight: 1.4 }}>
                  {report.aiAnalysis}
                </p>
              )}
            </div>
          )}

          {/* Foto */}
          {photoUrl && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <Camera size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Evidencia fotográfica</span>
              </div>
              <img
                src={photoUrl}
                alt="Evidencia del incidente"
                style={{
                  width: '100%', borderRadius: '0.5rem', maxHeight: 200,
                  objectFit: 'cover', border: '1px solid var(--border-color)'
                }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}

          {/* Mini mapa */}
          {report.latitude && report.longitude && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mapa</span>
              </div>
              <div
                ref={miniMapRef}
                style={{ height: 180, borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

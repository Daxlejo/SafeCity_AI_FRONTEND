import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { Clock, Save, AlertCircle } from 'lucide-react';

const TYPE_LABELS = {
  ROBBERY: 'Robo / Hurto',
  ACCIDENT: 'Accidente',
  TRAFFIC: 'Tráfico',
  TRANSIT_OP: 'Operativo de Tránsito',
  OTHER: 'Otro'
};

export default function ExpirationConfigPanel() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getExpirationConfigs();
      setConfigs(res.data || []);
    } catch (err) {
      console.error('Error loading expiration configs', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (incidentType, currentHours) => {
    const newHours = prompt(`Ingrese el nuevo tiempo de vida en horas para ${TYPE_LABELS[incidentType] || incidentType}:`, currentHours);
    if (!newHours) return;
    const hoursInt = parseInt(newHours, 10);
    if (isNaN(hoursInt) || hoursInt < 1) {
      alert('Por favor ingrese un número válido mayor a 0.');
      return;
    }

    try {
      setSaving(incidentType);
      const res = await adminAPI.updateExpirationConfig(incidentType, hoursInt);
      setConfigs(prev => prev.map(c => c.incidentType === incidentType ? res.data : c));
    } catch (err) {
      alert('Error al actualizar: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>;
  }

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Clock size={20} className="text-accent" />
        Tiempos de Vida de Reportes
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Configura cuántas horas debe permanecer activo un reporte antes de expirar automáticamente según su tipo.
      </p>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {configs.map((config) => (
          <div key={config.incidentType} style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
            padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px',
            border: '1px solid var(--border-color)'
          }}>
            <div>
              <h3 style={{ fontWeight: 600 }}>{TYPE_LABELS[config.incidentType] || config.incidentType}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Expira en: <strong style={{ color: 'var(--text-primary)' }}>{config.expirationHours} horas</strong>
              </p>
            </div>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => handleUpdate(config.incidentType, config.expirationHours)}
              disabled={saving === config.incidentType}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {saving === config.incidentType ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Save size={14} />}
              Editar
            </button>
          </div>
        ))}
        {configs.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>No hay configuraciones disponibles.</p>
          </div>
        )}
      </div>
    </div>
  );
}

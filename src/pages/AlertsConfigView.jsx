import { useState, useEffect } from 'react';
import { alertsAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { BellRing, Shield, Car, AlertTriangle, TrafficCone, HelpCircle } from 'lucide-react';

const ALERT_TYPES = [
  { id: 'ROBBERY', label: 'Robos y Asaltos', description: 'Alertas sobre hurtos y robos reportados', icon: Shield, color: 'var(--error)' },
  { id: 'ACCIDENT', label: 'Accidentes Viales', description: 'Choques o incidentes vehiculares', icon: Car, color: 'var(--warning)' },
  { id: 'TRAFFIC', label: 'Congestión de Tráfico', description: 'Embotellamientos y problemas de flujo', icon: AlertTriangle, color: 'var(--accent)' },
  { id: 'TRANSIT_OP', label: 'Operativos de Tránsito', description: 'Retenes o cierres viales programados', icon: TrafficCone, color: 'var(--info, #3b82f6)' },
  { id: 'OTHER', label: 'Otros Incidentes', description: 'Eventos misceláneos reportados', icon: HelpCircle, color: 'var(--text-secondary)' },
];

export default function AlertsConfigView({ onBack }) {
  const { showToast } = useToast();
  const [preferences, setPreferences] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const res = await alertsAPI.getPreferences();
        // Asumiendo que res.data es un array de tipos activados o un objeto map
        const prefs = res.data || {};
        // Convert array to object map if needed
        const stateMap = Array.isArray(prefs) 
          ? prefs.reduce((acc, val) => ({ ...acc, [val]: true }), {})
          : prefs;
          
        setPreferences(stateMap);
      } catch (err) {
        console.error('Error fetching preferences:', err);
        // Fallback a un estado inicial si falla (o si no existe aún)
        setPreferences({
          ROBBERY: true,
          ACCIDENT: true,
          TRAFFIC: false,
          TRANSIT_OP: false,
          OTHER: false
        });
      } finally {
        setLoading(false);
      }
    };
    loadPreferences();
  }, []);

  const handleToggle = (typeId) => {
    setPreferences(prev => ({ ...prev, [typeId]: !prev[typeId] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Transform preferences map to the format expected by the backend
      // Assuming it expects an array of active types or an object map
      const activeTypes = Object.keys(preferences).filter(key => preferences[key]);
      await alertsAPI.updatePreferences({ types: activeTypes });
      showToast('Preferencias guardadas correctamente', 'success');
    } catch (err) {
      console.error('Error saving preferences:', err);
      showToast('Error al guardar preferencias', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="view-enter" style={{ padding: '1.5rem', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BellRing size={24} color="var(--accent)" /> Preferencias de Alertas
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.85rem' }}>
            Selecciona qué tipo de incidentes deseas que te notifiquemos.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 72, width: '100%', borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {ALERT_TYPES.map((type) => {
            const IconComp = type.icon;
            const isChecked = !!preferences[type.id];
            
            return (
              <div 
                key={type.id} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  background: 'var(--bg-glass)',
                  border: `1px solid ${isChecked ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  transition: 'all var(--transition-fast)',
                  cursor: 'pointer'
                }}
                onClick={() => handleToggle(type.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: isChecked ? `${type.color}20` : 'var(--bg-glass-hover)',
                    color: isChecked ? type.color : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all var(--transition-fast)'
                  }}>
                    <IconComp size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {type.label}
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {type.description}
                    </p>
                  </div>
                </div>
                
                {/* Custom Toggle Switch */}
                <div style={{
                  position: 'relative',
                  width: 44,
                  height: 24,
                  borderRadius: '12px',
                  background: isChecked ? 'var(--accent)' : 'var(--border)',
                  transition: 'background var(--transition-fast)'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 2,
                    left: isChecked ? 22 : 2,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: 'white',
                    transition: 'left var(--transition-fast)'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && (
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          {onBack && (
            <button className="btn btn-ghost" onClick={onBack} disabled={saving}>
              Cancelar
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" /> : 'Guardar Preferencias'}
          </button>
        </div>
      )}
    </div>
  );
}

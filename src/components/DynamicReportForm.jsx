import { useState, useEffect, useCallback } from 'react';
import { Camera, Navigation, X, Crosshair, Send, AlertTriangle } from 'lucide-react';
import { uploadAPI } from '../services/api';
import { INCIDENT_TYPE_LABELS, INCIDENT_TYPE_COLORS } from '../utils/incidentLabels';

// ═══════════════════════════════════════════
// FORMULARIO DINÁMICO DE REPORTES — SafeCity AI
// ═══════════════════════════════════════════
// Genera campos opcionales según el tipo de incidente.
// Envía un JSON estructurado al backend en lugar de texto libre.

// ── Definición de campos dinámicos por tipo ─────────

const DYNAMIC_FIELDS = {
  ROBBERY: [
    { key: 'weaponInvolved', label: '¿Arma involucrada?', type: 'select', options: ['No', 'Arma blanca', 'Arma de fuego', 'Desconocida'], required: false },
    { key: 'stolenItems', label: 'Objetos robados', type: 'text', placeholder: 'Ej: celular, cartera...', maxLength: 100, required: false },
    { key: 'aggressorCount', label: 'Número de agresores', type: 'number', min: 1, max: 20, required: false },
    { key: 'aggressorDescription', label: 'Descripción del agresor', type: 'text', placeholder: 'Ej: hombre joven, moto negra...', maxLength: 150, required: false },
  ],
  ACCIDENT: [
    { key: 'vehiclesInvolved', label: 'Vehículos implicados', type: 'number', min: 1, max: 20, required: false },
    { key: 'injuredCount', label: 'Número de heridos', type: 'number', min: 0, max: 100, required: false },
    { key: 'collisionType', label: 'Tipo de colisión', type: 'select', options: ['Choque', 'Volcamiento', 'Atropello', 'Caída', 'Otro'], required: false },
    { key: 'roadBlocked', label: '¿Vía bloqueada?', type: 'select', options: ['No', 'Parcialmente', 'Totalmente'], required: false },
  ],
  TRAFFIC: [
    { key: 'obstructionType', label: 'Tipo de obstrucción', type: 'select', options: ['Embotellamiento', 'Obra en vía', 'Vehículo varado', 'Manifestación', 'Otro'], required: false },
    { key: 'affectedLanes', label: 'Carriles afectados', type: 'select', options: ['1', '2', '3+', 'Todos'], required: false },
    { key: 'estimatedDelay', label: 'Demora estimada', type: 'select', options: ['< 10 min', '10–30 min', '30–60 min', '> 1 hora'], required: false },
  ],
  TRANSIT_OP: [
    { key: 'responsibleEntity', label: 'Entidad responsable', type: 'select', options: ['Policía de Tránsito', 'Ejército', 'DIAN', 'Otro'], required: false },
    { key: 'operationReason', label: 'Motivo del operativo', type: 'text', placeholder: 'Ej: control de documentos, alcoholemia...', maxLength: 100, required: false },
    { key: 'roadBlocked', label: '¿Vía cerrada?', type: 'select', options: ['No', 'Parcialmente', 'Totalmente'], required: false },
  ],
  OTHER: [],
};

const INCIDENT_TYPES = [
  { value: 'ROBBERY',    label: 'Robo / Hurto',              color: '#ef4444' },
  { value: 'ACCIDENT',   label: 'Accidente de Tránsito',     color: '#f59e0b' },
  { value: 'TRAFFIC',    label: 'Congestión Vial',            color: '#eab308' },
  { value: 'TRANSIT_OP', label: 'Operativo de Tránsito',      color: '#3b82f6' },
  { value: 'OTHER',      label: 'Otro Incidente',             color: '#64748b' },
];

const TITLE_MAX = 100;
const NOTES_MAX = 200;

export default function DynamicReportForm({
  reportType, setReportType,
  selectedLocation, setSelectedLocation,
  submitting,
  onSubmit,
  onCancel,
  geoLocation,
  geoLocating,
  geoError,
  geoErrorType,
  onGeolocate,
  onClearGeoError,
}) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dynamicData, setDynamicData] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);

  // Resetear campos dinámicos al cambiar el tipo
  useEffect(() => {
    setDynamicData({});
  }, [reportType]);

  const handleDynamicChange = useCallback((key, value) => {
    setDynamicData(prev => ({ ...prev, [key]: value }));
  }, []);

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setUploadingPhoto(true);
    try {
      const res = await uploadAPI.uploadPhoto(file);
      setPhotoUrl(res.data?.photoUrl || res.data?.fileName || null);
    } catch (err) {
      console.error('Error subiendo foto:', err);
      setPhotoUrl(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedLocation || !title.trim()) return;

    // Construir el payload JSON estructurado
    const structuredData = {
      title: title.trim(),
      notes: notes.trim() || null,
      incidentType: reportType,
      dynamicFields: { ...dynamicData },
      location: {
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
      },
      incidentDate: new Date().toISOString().slice(0, 19),
    };

    // Limpiar campos dinámicos vacíos
    Object.keys(structuredData.dynamicFields).forEach(key => {
      if (!structuredData.dynamicFields[key] && structuredData.dynamicFields[key] !== 0) {
        delete structuredData.dynamicFields[key];
      }
    });

    onSubmit(structuredData, photoUrl);

    // Reset
    setTitle('');
    setNotes('');
    setDynamicData({});
    setPhotoFile(null);
    setPhotoUrl(null);
  };

  const dynamicFields = DYNAMIC_FIELDS[reportType] || [];
  const selectedColor = INCIDENT_TYPES.find(t => t.value === reportType)?.color || '#64748b';

  return (
    <div className="glass-card">
      <div className="section-header">
        <h2>Nuevo Reporte</h2>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>
          <X size={14} /> Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Tipo de incidente */}
        <div className="form-group">
          <label>Tipo de incidente</label>
          <div className="dynamic-form-type-grid">
            {INCIDENT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`dynamic-form-type-btn ${reportType === t.value ? 'active' : ''}`}
                style={{
                  '--type-color': t.color,
                  borderColor: reportType === t.value ? t.color : 'var(--border-color)',
                  background: reportType === t.value ? `${t.color}15` : 'transparent',
                }}
                onClick={() => setReportType(t.value)}
              >
                <span className="dynamic-form-type-dot" style={{ background: t.color }} />
                <span className="dynamic-form-type-label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Título del reporte */}
        <div className="form-group">
          <label>
            Título del reporte
            <span className="form-char-count" style={{ color: title.length > TITLE_MAX ? '#ef4444' : 'var(--text-muted)' }}>
              {title.length}/{TITLE_MAX}
            </span>
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="Describe brevemente el incidente..."
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
            required
            minLength={5}
            maxLength={TITLE_MAX}
          />
        </div>

        {/* Campos dinámicos según tipo de incidente */}
        {dynamicFields.length > 0 && (
          <div className="dynamic-form-fields" style={{ borderLeft: `3px solid ${selectedColor}` }}>
            <div className="dynamic-form-fields-header">
              <AlertTriangle size={13} style={{ color: selectedColor }} />
              <span>Información adicional ({INCIDENT_TYPE_LABELS[reportType]})</span>
            </div>
            {dynamicFields.map((field) => (
              <div className="form-group" key={field.key}>
                <label style={{ fontSize: '0.78rem' }}>
                  {field.label}
                  {field.required && <span style={{ color: '#ef4444' }}> *</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    className="form-select"
                    value={dynamicData[field.key] || ''}
                    onChange={(e) => handleDynamicChange(field.key, e.target.value)}
                    required={field.required}
                  >
                    <option value="">— Seleccionar —</option>
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'number' ? (
                  <input
                    type="number"
                    className="form-input"
                    min={field.min}
                    max={field.max}
                    value={dynamicData[field.key] || ''}
                    onChange={(e) => handleDynamicChange(field.key, e.target.value)}
                    required={field.required}
                  />
                ) : (
                  <input
                    type="text"
                    className="form-input"
                    placeholder={field.placeholder || ''}
                    maxLength={field.maxLength || 150}
                    value={dynamicData[field.key] || ''}
                    onChange={(e) => handleDynamicChange(field.key, e.target.value)}
                    required={field.required}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Notas adicionales */}
        <div className="form-group">
          <label>
            Notas adicionales (opcional)
            <span className="form-char-count" style={{ color: notes.length > NOTES_MAX ? '#ef4444' : 'var(--text-muted)' }}>
              {notes.length}/{NOTES_MAX}
            </span>
          </label>
          <textarea
            className="form-textarea"
            rows="2"
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, NOTES_MAX))}
            placeholder="Información adicional relevante..."
            maxLength={NOTES_MAX}
          />
        </div>

        {/* Ubicación */}
        <div className="form-group">
          <label>Ubicación</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
              <Crosshair size={14} style={{ color: selectedLocation ? 'var(--success)' : 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{ color: selectedLocation ? 'var(--success)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedLocation ? `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}` : 'Clic en mapa o usar GPS'}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onGeolocate}
              disabled={geoLocating}
              title="Usar mi ubicación GPS"
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem' }}
            >
              {geoLocating ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Navigation size={12} />}
              GPS
            </button>
          </div>
          {geoError && (
            <div style={{
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '0.4rem', padding: '0.45rem 0.6rem', fontSize: '0.73rem',
              color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.35rem',
              marginTop: '0.25rem'
            }}>
              <span style={{ flex: 1 }}>{geoError}</span>
              <button onClick={onClearGeoError} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                <X size={12} />
              </button>
            </div>
          )}
          {geoErrorType === 'permission_denied' && (
            <p style={{
              fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem',
              lineHeight: 1.4, fontStyle: 'italic'
            }}>
              💡 También puedes hacer clic directamente en el mapa para marcar la ubicación del incidente.
            </p>
          )}
        </div>

        {/* Foto */}
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Camera size={13} /> Foto (opcional)
          </label>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
            padding: '0.5rem 0.75rem', borderRadius: '0.4rem',
            border: '1px dashed var(--border-color)', fontSize: '0.78rem',
            color: photoFile ? 'var(--success)' : 'var(--text-muted)',
            background: 'rgba(255,255,255,0.03)',
          }}>
            <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
            {uploadingPhoto ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Camera size={13} />}
            {uploadingPhoto ? 'Subiendo...' : photoFile ? photoFile.name.substring(0, 20) + '...' : 'Seleccionar imagen'}
          </label>
        </div>

        {/* Submit */}
        <button type="submit" className="btn btn-primary btn-full" disabled={!selectedLocation || submitting || uploadingPhoto || !title.trim()}>
          {submitting ? <span className="spinner" /> : <Send size={16} />}
          {submitting ? 'Enviando...' : 'Enviar Reporte'}
        </button>
      </form>
    </div>
  );
}

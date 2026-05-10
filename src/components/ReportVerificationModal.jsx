import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock, Camera, MapPin, FileText, Send, Edit2 } from 'lucide-react';

// ═══════════════════════════════════════════
// COMPONENTE: ReportVerificationModal
// ═══════════════════════════════════════════
// Modal de verificación para usuarios con TrueScore < 55.
// Muestra un checklist para que el usuario confirme la calidad
// de su reporte antes de enviarlo.
//
// - Checklist con ítems de verificación
// - Botón "Enviar reporte" deshabilitado 5 segundos (countdown visual)
// - Botón "Editar" cierra el modal para corregir
// ═══════════════════════════════════════════

const COUNTDOWN_SECONDS = 5;

/**
 * Ítems del checklist de verificación.
 */
const CHECKLIST_ITEMS = [
  {
    id: 'photo',
    icon: Camera,
    text: '¿Tienes foto del incidente?',
    hint: 'Las fotos aumentan significativamente la credibilidad de tu reporte.',
  },
  {
    id: 'address',
    icon: MapPin,
    text: '¿La dirección es precisa?',
    hint: 'Verifica que la ubicación en el mapa coincida con el lugar exacto del incidente.',
  },
  {
    id: 'description',
    icon: FileText,
    text: '¿La descripción es clara y detallada?',
    hint: 'Incluye qué, cuándo y dónde ocurrió. Evita información vaga o incompleta.',
  },
];

/**
 * Modal de verificación de reporte.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen — Si el modal está visible
 * @param {Function} props.onClose — Callback para cerrar (botón "Editar")
 * @param {Function} props.onConfirm — Callback para confirmar envío
 * @param {number} props.trustScore — TrueScore del usuario actual
 */
export default function ReportVerificationModal({ isOpen, onClose, onConfirm, trustScore }) {
  const [checkedItems, setCheckedItems] = useState({});
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const intervalRef = useRef(null);

  // Reiniciar estado cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setCheckedItems({});
      setCountdown(COUNTDOWN_SECONDS);
      setIsCountingDown(false);
      setIsExiting(false);
    }
  }, [isOpen]);

  // Iniciar countdown automáticamente al abrir
  useEffect(() => {
    if (!isOpen) return;

    // Pequeño delay antes de comenzar countdown
    const startDelay = setTimeout(() => {
      setIsCountingDown(true);
    }, 500);

    return () => clearTimeout(startDelay);
  }, [isOpen]);

  // Manejar el countdown
  useEffect(() => {
    if (!isCountingDown || countdown <= 0) return;

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isCountingDown, countdown]);

  const handleToggleCheck = useCallback((itemId) => {
    setCheckedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }, []);

  const handleEdit = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onClose?.(), 250);
  }, [onClose]);

  const handleConfirm = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onConfirm?.(), 250);
  }, [onConfirm]);

  if (!isOpen) return null;

  const canSubmit = countdown <= 0;
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const allChecked = checkedCount === CHECKLIST_ITEMS.length;

  return (
    <div className={`verification-overlay ${isExiting ? 'verification-exit' : ''}`}>
      <div className={`verification-modal ${isExiting ? 'verification-modal-exit' : 'verification-modal-enter'}`}>
        {/* Header con ícono de advertencia */}
        <div className="verification-header">
          <div className="verification-header-icon">
            <AlertTriangle size={24} />
          </div>
          <h2 className="verification-title">Verificación de Reporte</h2>
          <p className="verification-subtitle">
            Tu nivel de confianza es <strong style={{ color: 'var(--warning)' }}>{trustScore ?? '—'}%</strong>.
            Por favor, verifica la calidad de tu reporte antes de enviarlo.
          </p>
        </div>

        {/* Checklist */}
        <div className="verification-checklist">
          {CHECKLIST_ITEMS.map((item) => {
            const IconComp = item.icon;
            const isChecked = !!checkedItems[item.id];
            return (
              <label
                key={item.id}
                className={`verification-check-item ${isChecked ? 'checked' : ''}`}
                onClick={() => handleToggleCheck(item.id)}
              >
                <div className="verification-checkbox">
                  {isChecked ? (
                    <CheckCircle size={20} style={{ color: 'var(--success)' }} />
                  ) : (
                    <XCircle size={20} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
                <div className="verification-check-content">
                  <div className="verification-check-label">
                    <IconComp size={14} style={{ color: isChecked ? 'var(--success)' : 'var(--text-muted)' }} />
                    {item.text}
                  </div>
                  <div className="verification-check-hint">{item.hint}</div>
                </div>
              </label>
            );
          })}
        </div>

        {/* Barra de progreso del countdown */}
        <div className="verification-countdown-bar">
          <div
            className="verification-countdown-fill"
            style={{
              width: `${((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100}%`,
            }}
          />
        </div>

        {/* Acciones */}
        <div className="verification-actions">
          <button className="btn btn-ghost verification-btn-edit" onClick={handleEdit}>
            <Edit2 size={16} /> Editar
          </button>
          <button
            className="btn btn-primary verification-btn-submit"
            onClick={handleConfirm}
            disabled={!canSubmit}
          >
            {canSubmit ? (
              <>
                <Send size={16} /> Enviar reporte
              </>
            ) : (
              <>
                <Clock size={16} /> Espera {countdown}s...
              </>
            )}
          </button>
        </div>

        {/* Indicador de ítems verificados */}
        {allChecked && canSubmit && (
          <div className="verification-ready-badge">
            <CheckCircle size={14} /> Reporte listo para enviar
          </div>
        )}
      </div>
    </div>
  );
}

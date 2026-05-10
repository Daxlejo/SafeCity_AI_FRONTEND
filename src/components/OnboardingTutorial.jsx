import { useState, useEffect, useCallback } from 'react';
import { Camera, FileText, MapPin, ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';

// ═══════════════════════════════════════════
// COMPONENTE: OnboardingTutorial
// ═══════════════════════════════════════════
// Tutorial interactivo tipo wizard para nuevos usuarios.
// Se muestra UNA SOLA VEZ tras el primer login exitoso.
// Flag guardado en localStorage: `safecity_onboarding_seen`
//
// Diseño Glassmorphism premium con animaciones CSS suaves.
// ═══════════════════════════════════════════

const ONBOARDING_KEY = 'safecity_onboarding_seen';

/**
 * Definición de los pasos del tutorial.
 * Cada paso tiene un ícono, título, descripción y un color de acento.
 */
const TUTORIAL_STEPS = [
  {
    icon: Camera,
    title: 'Agrega una foto',
    description: 'Toma o selecciona una foto del incidente para que tu reporte tenga mayor credibilidad y sea verificado más rápido.',
    accentColor: 'var(--accent)',
    accentBg: 'var(--accent-glow)',
  },
  {
    icon: FileText,
    title: 'Escribe una descripción clara',
    description: 'Describe lo que ocurrió con detalles: qué pasó, cuándo y quiénes estuvieron involucrados. Esto ayuda a las autoridades a actuar.',
    accentColor: 'var(--success)',
    accentBg: 'var(--success-bg)',
  },
  {
    icon: MapPin,
    title: 'Confirma tu ubicación',
    description: 'Usa tu GPS o haz clic en el mapa para marcar exactamente dónde ocurrió el incidente. La precisión es clave.',
    accentColor: 'var(--warning)',
    accentBg: 'var(--warning-bg)',
  },
];

/**
 * Componente de tutorial de bienvenida (onboarding).
 *
 * @param {Object} props
 * @param {Function} props.onComplete — Callback cuando el usuario finaliza/cierra el tutorial
 */
export default function OnboardingTutorial({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [slideDirection, setSlideDirection] = useState('right');

  // Verificar si ya se vio el tutorial
  useEffect(() => {
    const seen = localStorage.getItem(ONBOARDING_KEY);
    if (seen === 'true') {
      onComplete?.();
    }
  }, [onComplete]);

  const handleComplete = useCallback(() => {
    setIsExiting(true);
    localStorage.setItem(ONBOARDING_KEY, 'true');
    // Esperar a que termine la animación de salida
    setTimeout(() => {
      onComplete?.();
    }, 350);
  }, [onComplete]);

  const handleNext = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setSlideDirection('right');
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, handleComplete]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setSlideDirection('left');
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  const step = TUTORIAL_STEPS[currentStep];
  const IconComp = step.icon;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  return (
    <div className={`onboarding-overlay ${isExiting ? 'onboarding-exit' : ''}`}>
      <div className={`onboarding-card ${isExiting ? 'onboarding-card-exit' : 'onboarding-card-enter'}`}>
        {/* Botón cerrar */}
        <button className="onboarding-close" onClick={handleSkip} title="Omitir tutorial">
          <X size={18} />
        </button>

        {/* Header con branding */}
        <div className="onboarding-header">
          <Sparkles size={20} style={{ color: 'var(--accent)' }} />
          <span className="onboarding-badge">Bienvenido a SafeCity</span>
        </div>

        {/* Contenido del paso actual */}
        <div className={`onboarding-step-content onboarding-slide-${slideDirection}`} key={currentStep}>
          <div className="onboarding-icon-circle" style={{ background: step.accentBg }}>
            <IconComp size={32} style={{ color: step.accentColor }} />
          </div>
          <h2 className="onboarding-step-title">{step.title}</h2>
          <p className="onboarding-step-desc">{step.description}</p>
        </div>

        {/* Indicadores de progreso */}
        <div className="onboarding-dots">
          {TUTORIAL_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`onboarding-dot ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}
            />
          ))}
        </div>

        {/* Controles de navegación */}
        <div className="onboarding-actions">
          {currentStep > 0 ? (
            <button className="btn btn-ghost btn-sm onboarding-btn-prev" onClick={handlePrev}>
              <ChevronLeft size={16} /> Anterior
            </button>
          ) : (
            <button className="btn btn-ghost btn-sm onboarding-btn-skip" onClick={handleSkip}>
              Omitir
            </button>
          )}

          <button className="btn btn-primary onboarding-btn-next" onClick={handleNext}>
            {isLastStep ? '¡Comenzar!' : 'Siguiente'}
            {!isLastStep && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

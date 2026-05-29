// ═══════════════════════════════════════════
// MAPEO CENTRALIZADO DE ETIQUETAS — SafeCity AI
// ═══════════════════════════════════════════
// Fuente única de verdad para la traducción de
// códigos internos del backend a nombres amigables
// en español para la UI.

// ── Tipos de Incidente ──────────────────────
export const INCIDENT_TYPE_LABELS = {
  ROBBERY:    'Robo / Hurto',
  ACCIDENT:   'Accidente de Tránsito',
  TRAFFIC:    'Congestión Vial',
  TRANSIT_OP: 'Operativo de Tránsito',
  OTHER:      'Otro Incidente',
};

export const INCIDENT_TYPE_LABELS_SHORT = {
  ROBBERY:    'Robo',
  ACCIDENT:   'Accidente',
  TRAFFIC:    'Tráfico',
  TRANSIT_OP: 'Op. Tránsito',
  OTHER:      'Otro',
};

export const INCIDENT_TYPE_COLORS = {
  ROBBERY:    '#ef4444',
  ACCIDENT:   '#f59e0b',
  TRAFFIC:    '#eab308',
  TRANSIT_OP: '#3b82f6',
  OTHER:      '#64748b',
};

// ── Estados de Reporte ──────────────────────
export const STATUS_LABELS = {
  PENDING:  'En Revisión',
  VERIFIED: 'Verificado',
  REJECTED: 'Rechazado',
  RESOLVED: 'Resuelto',
  EXPIRED:  'Expirado',
};

export const STATUS_COLORS = {
  PENDING:  '#f59e0b',
  VERIFIED: '#10b981',
  REJECTED: '#ef4444',
  RESOLVED: '#6366f1',
  EXPIRED:  '#94a3b8',
};

// ── Helpers ─────────────────────────────────

/**
 * Obtiene la etiqueta de un tipo de incidente.
 * @param {string} type - Código interno (ej: 'TRANSIT_OP')
 * @param {boolean} short - Si true, usa versión corta
 * @returns {string}
 */
export function getTypeLabel(type, short = false) {
  const map = short ? INCIDENT_TYPE_LABELS_SHORT : INCIDENT_TYPE_LABELS;
  return map[type] || type;
}

/**
 * Obtiene la etiqueta de un estado de reporte.
 * @param {string} status - Código interno (ej: 'PENDING')
 * @returns {string}
 */
export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}

/**
 * Obtiene el color de un tipo de incidente.
 * @param {string} type
 * @returns {string}
 */
export function getTypeColor(type) {
  return INCIDENT_TYPE_COLORS[type] || '#64748b';
}

/**
 * Obtiene el color de un estado de reporte.
 * @param {string} status
 * @returns {string}
 */
export function getStatusColor(status) {
  return STATUS_COLORS[status] || '#64748b';
}

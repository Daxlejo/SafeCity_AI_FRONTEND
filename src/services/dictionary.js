// ═══════════════════════════════════════════
// GLOBAL DICTIONARY — SafeCity AI
// ═══════════════════════════════════════════
// Mapea valores técnicos del backend a etiquetas amigables en español.

const TYPE_LABELS = {
  ROBBERY: 'Robo',
  ACCIDENT: 'Accidente de Tránsito',
  TRAFFIC: 'Tráfico Pesado',
  TRANSIT_OP: 'Operación de Tránsito',
  TRANSIT: 'Operación de Tránsito',
  TRANSIT_UP: 'Operación de Tránsito',
  OTHER: 'Otro'
};

const STATUS_LABELS = {
  PENDING: 'Pendiente',
  VERIFIED: 'Verificado',
  REJECTED: 'Rechazado',
  RESOLVED: 'Solucionado / Aprobado',
  APPROVED: 'Solucionado / Aprobado'
};

/**
 * Traduce el tipo de incidente técnico a un formato amigable.
 * @param {string} type - Tipo de incidente en el backend.
 * @returns {string}
 */
export const translateType = (type) => {
  if (!type) return 'Otro';
  const upper = type.toUpperCase().trim();
  return TYPE_LABELS[upper] || type;
};

/**
 * Traduce el estado técnico del reporte a un formato amigable.
 * @param {string} status - Estado del reporte en el backend.
 * @returns {string}
 */
export const translateStatus = (status) => {
  if (!status) return 'Pendiente';
  const upper = status.toUpperCase().trim();
  return STATUS_LABELS[upper] || status;
};

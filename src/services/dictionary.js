// ═══════════════════════════════════════════
// GLOBAL DICTIONARY — SafeCity AI
// ═══════════════════════════════════════════
// Re-exporta desde la fuente centralizada en utils/incidentLabels.js.
// Mantenido por retrocompatibilidad con archivos que ya lo importan.

import { getTypeLabel, getStatusLabel } from '../utils/incidentLabels';

/**
 * Traduce el tipo de incidente técnico a un formato amigable.
 * @param {string} type - Tipo de incidente en el backend.
 * @returns {string}
 */
export const translateType = (type) => {
  if (!type) return 'Otro';
  return getTypeLabel(type.toUpperCase().trim(), true);
};

/**
 * Traduce el estado técnico del reporte a un formato amigable.
 * @param {string} status - Estado del reporte en el backend.
 * @returns {string}
 */
export const translateStatus = (status) => {
  if (!status) return 'En Revisión';
  return getStatusLabel(status.toUpperCase().trim());
};

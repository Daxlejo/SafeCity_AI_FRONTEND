// ═══════════════════════════════════════════
// HASH DE CONTRASEÑA — Web Crypto API (SHA-256)
// ═══════════════════════════════════════════
// Se hashea la contraseña en el cliente ANTES de enviarla
// al backend. Esto asegura que la contraseña en texto plano
// NUNCA viaje por la red, ni siquiera sobre HTTPS.

/**
 * Hashea una contraseña usando SHA-256 (Web Crypto API nativa).
 * Retorna el hash en formato hexadecimal.
 * @param {string} password - Contraseña en texto plano
 * @returns {Promise<string>} Hash SHA-256 en hex
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

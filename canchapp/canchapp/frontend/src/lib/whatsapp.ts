/**
 * Validación y formato de números peruanos.
 *
 * Formato canónico: +51 9XX XXX XXX (11 dígitos contando el código de país,
 * empezando por 9 — todos los celulares peruanos arrancan con 9).
 *
 * Estos helpers son SOLO frontend; no garantizan que el número exista realmente.
 * Para verificación real (SMS), se requiere un servicio como Twilio.
 */

/** Quita todo lo que no es dígito. */
function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

/**
 * Normaliza cualquier entrada a la forma canónica E.164: `+51XXXXXXXXX`.
 * Si la entrada no es válida (no es número peruano), devuelve null.
 *
 * Acepta:
 *  - "999993220"  → +51999993220
 *  - "+51 999 993 220" → +51999993220
 *  - "51999993220" → +51999993220
 *  - "+51999993220" → +51999993220
 */
export function normalizePeruvianWhatsApp(raw: string): string | null {
  const d = digitsOnly(raw);

  // 9 dígitos: asumir que falta el código de país, y debe empezar por 9
  if (d.length === 9 && d.startsWith('9')) return `+51${d}`;

  // 11 dígitos empezando por 51 + 9: con código de país, sin '+'
  if (d.length === 11 && d.startsWith('51') && d[2] === '9') return `+${d}`;

  // Cualquier otra cosa no es número celular peruano válido
  return null;
}

/** Valida si un input puede llegar a ser un WhatsApp peruano válido. */
export function isValidPeruvianWhatsApp(raw: string): boolean {
  return normalizePeruvianWhatsApp(raw) !== null;
}

/**
 * Formatea visualmente: "+51 999 993 220".
 * Si el input no es válido, devuelve el input tal cual.
 */
export function displayPeruvianWhatsApp(raw: string): string {
  const norm = normalizePeruvianWhatsApp(raw);
  if (!norm) return raw;
  // norm = "+51XXXXXXXXX"
  const num = norm.slice(3); // "XXXXXXXXX"
  return `+51 ${num.slice(0, 3)} ${num.slice(3, 6)} ${num.slice(6)}`;
}

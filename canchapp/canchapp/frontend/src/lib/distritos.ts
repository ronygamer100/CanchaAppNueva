/**
 * Distritos de Arequipa Metropolitana donde típicamente hay canchas sintéticas.
 * Si el dueño no encuentra el suyo, puede elegir "Otro".
 */
export const DISTRITOS_AREQUIPA = [
  'Arequipa (Cercado)',
  'Cayma',
  'Yanahuara',
  'Cerro Colorado',
  'JLBR',
  'Hunter',
  'Mariano Melgar',
  'Miraflores',
  'Paucarpata',
  'Sachaca',
  'Socabaya',
  'Yura',
  'Sabandía',
  'Characato',
  'Otro',
] as const;

export type Distrito = (typeof DISTRITOS_AREQUIPA)[number];

// Preferencia de tema: Claro / Auto / Oscuro (ESTANDARES G1).
// Lógica pura, sin DOM: la misma forma en los proyectos (Al toque, Ticketya, Mayorista, AltokeAds,
// Centinela). El que decide es, en orden: la preferencia del usuario (si tiene cuenta y la guardó),
// la copia guardada en el dispositivo (localStorage) y, si no hay ninguna, el modo del sistema.
// Lo que se aplica en el navegador está en temaNavegador.ts y en public/tema-inicial.js.

export type PreferenciaTema = 'claro' | 'auto' | 'oscuro';
export type TemaEfectivo = 'claro' | 'oscuro';

/** Orden en que se muestran las opciones del selector. */
export const PREFERENCIAS_TEMA: readonly PreferenciaTema[] = ['claro', 'auto', 'oscuro'];

/** Rótulos visibles de cada opción. */
export const ROTULOS_TEMA: Record<PreferenciaTema, string> = { claro: 'Claro', auto: 'Auto', oscuro: 'Oscuro' };

/** Valor por defecto para todos. */
export const PREFERENCIA_POR_DEFECTO: PreferenciaTema = 'auto';

/** Clave de la copia local (la lee también public/tema-inicial.js antes de que pinte la app). */
export const CLAVE_TEMA = 'tema';

export function esPreferenciaTema(valor: unknown): valor is PreferenciaTema {
  return valor === 'claro' || valor === 'auto' || valor === 'oscuro';
}

/**
 * Qué preferencia rige: la del usuario → la guardada en el dispositivo → Auto.
 * Un valor que no sea una de las tres opciones (vacío, viejo, roto) se saltea.
 */
export function resolverPreferencia(fuentes: { usuario?: unknown; guardada?: unknown }): PreferenciaTema {
  if (esPreferenciaTema(fuentes.usuario)) return fuentes.usuario;
  if (esPreferenciaTema(fuentes.guardada)) return fuentes.guardada;
  return PREFERENCIA_POR_DEFECTO;
}

/** Tema que se ve: Claro y Oscuro mandan; Auto sigue al sistema. */
export function temaEfectivo(preferencia: PreferenciaTema, sistemaOscuro: boolean): TemaEfectivo {
  if (preferencia === 'claro') return 'claro';
  if (preferencia === 'oscuro') return 'oscuro';
  return sistemaOscuro ? 'oscuro' : 'claro';
}

/** Valor del atributo data-theme de <html>; null = sin atributo (sigue al sistema por CSS). */
export function atributoTema(preferencia: PreferenciaTema): 'light' | 'dark' | null {
  if (preferencia === 'claro') return 'light';
  if (preferencia === 'oscuro') return 'dark';
  return null;
}

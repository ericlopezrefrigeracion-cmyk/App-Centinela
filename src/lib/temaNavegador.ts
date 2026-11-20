// Tema en el navegador: aplica la preferencia (Claro / Auto / Oscuro) en <html>, la guarda en el
// dispositivo y avisa a los componentes. Misma forma en los proyectos (ESTANDARES G1).
//  - Claro / Oscuro: data-theme="light" | "dark" en <html>; el CSS de :root[data-theme] manda sobre
//    @media (prefers-color-scheme).
//  - Auto: sin data-theme; el CSS sigue al sistema en vivo y useTema() también escucha el cambio.
// public/tema-inicial.js hace lo mismo antes de que pinte React (sin parpadeo).
import { useSyncExternalStore } from 'react';
import {
  CLAVE_TEMA, atributoTema, esPreferenciaTema, resolverPreferencia, temaEfectivo,
  type PreferenciaTema, type TemaEfectivo,
} from './preferenciaTema';

const CONSULTA_OSCURO = '(prefers-color-scheme: dark)';

function consultaSistema(): MediaQueryList | null {
  try {
    return typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(CONSULTA_OSCURO) : null;
  } catch {
    return null;
  }
}

function sistemaOscuro(): boolean {
  return consultaSistema()?.matches ?? false;
}

/** Copia guardada en el dispositivo (puede no haber o estar bloqueado el almacenamiento). */
export function leerGuardada(): string | null {
  try {
    return localStorage.getItem(CLAVE_TEMA);
  } catch {
    return null;
  }
}

function guardarLocal(preferencia: PreferenciaTema) {
  try {
    localStorage.setItem(CLAVE_TEMA, preferencia);
  } catch {
    // Sin almacenamiento (modo privado o bloqueado): el tema vale solo para esta visita
  }
}

/**
 * Pone la preferencia en el documento: data-theme, color-scheme y las dos <meta name="theme-color">.
 * Con elección manual, las dos metas toman el color del modo elegido; con Auto vuelven a su valor
 * original (cada una con su media).
 */
export function aplicarEnDocumento(preferencia: PreferenciaTema, doc: Document = document) {
  const raiz = doc.documentElement;
  const atributo = atributoTema(preferencia);
  if (atributo) raiz.setAttribute('data-theme', atributo);
  else raiz.removeAttribute('data-theme');
  // Vacío = vuelve al color-scheme del CSS ("light dark")
  raiz.style.colorScheme = atributo ?? '';
  doc.querySelector('meta[name="color-scheme"]')?.setAttribute('content', atributo ?? 'light dark');

  const metas = Array.from(doc.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));
  // Guarda el color original de cada meta la primera vez (tema-inicial.js usa el mismo atributo)
  for (const meta of metas) {
    if (meta.getAttribute('data-original') === null) meta.setAttribute('data-original', meta.content);
  }
  const delModo = atributo ? metas.find((m) => (m.getAttribute('media') ?? '').includes(atributo)) : undefined;
  for (const meta of metas) {
    meta.content = (delModo ?? meta).getAttribute('data-original') ?? meta.content;
  }
}

// ── Estado compartido (el botón de la barra y el selector del perfil ven lo mismo) ──
let actual: PreferenciaTema = resolverPreferencia({ guardada: leerGuardada() });
const oyentes = new Set<() => void>();
let guardadoRemoto: ((preferencia: PreferenciaTema) => Promise<unknown> | void) | null = null;

function avisar() {
  for (const oyente of oyentes) oyente();
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

function suscribirSistema(oyente: () => void) {
  const consulta = consultaSistema();
  if (!consulta) return () => {};
  consulta.addEventListener('change', oyente);
  return () => consulta.removeEventListener('change', oyente);
}

export function preferenciaActual(): PreferenciaTema {
  return actual;
}

function establecer(preferencia: PreferenciaTema) {
  actual = preferencia;
  guardarLocal(preferencia);
  aplicarEnDocumento(preferencia);
  avisar();
}

/** Elección del usuario: se aplica al instante y, si hay cuenta, se guarda también en el servidor. */
export function elegirTema(preferencia: PreferenciaTema) {
  establecer(preferencia);
  if (guardadoRemoto) {
    Promise.resolve(guardadoRemoto(preferencia)).catch((err) => {
      console.warn('No se pudo guardar el tema en la cuenta:', err);
    });
  }
}

/**
 * Al cargar el usuario con cuenta: su preferencia guardada en el servidor manda (sigue al usuario en
 * todos sus dispositivos) y queda copiada en el dispositivo para el primer cuadro de la próxima vez.
 */
export function adoptarPreferenciaDelUsuario(valor: unknown) {
  if (!esPreferenciaTema(valor)) return;
  const preferencia = resolverPreferencia({ usuario: valor, guardada: leerGuardada() });
  if (preferencia !== actual || leerGuardada() !== preferencia) establecer(preferencia);
}

/** Cómo se guarda en la cuenta (null = sin cuenta: solo en el dispositivo). */
export function registrarGuardadoRemoto(fn: ((preferencia: PreferenciaTema) => Promise<unknown> | void) | null) {
  guardadoRemoto = fn;
}

/** Se llama una vez al arrancar: aplica la preferencia y sigue los cambios hechos en otra pestaña. */
export function iniciarTema() {
  aplicarEnDocumento(actual);
  window.addEventListener('storage', (ev) => {
    if (ev.key !== CLAVE_TEMA) return;
    const nueva = resolverPreferencia({ guardada: ev.newValue });
    if (nueva === actual) return;
    actual = nueva;
    aplicarEnDocumento(nueva);
    avisar();
  });
}

/** Preferencia elegida, tema que se ve (Auto escucha al sistema en vivo) y cómo cambiarla. */
export function useTema(): { preferencia: PreferenciaTema; efectivo: TemaEfectivo; elegir: (p: PreferenciaTema) => void } {
  const preferencia = useSyncExternalStore(suscribir, preferenciaActual, preferenciaActual);
  const oscuro = useSyncExternalStore(suscribirSistema, sistemaOscuro, () => false);
  return { preferencia, efectivo: temaEfectivo(preferencia, oscuro), elegir: elegirTema };
}

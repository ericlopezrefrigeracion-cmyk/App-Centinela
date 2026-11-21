// Ayudas de pantalla (recuadros con el ícono "i"): con la X se ocultan TODAS de una vez y se vuelven a
// mostrar desde el Perfil. Un solo lugar decide si se ven: el componente <Ayuda> lee este estado.
// Centinela no tiene backend propio (la API es de Telemet y no guarda preferencias), así que la
// elección se guarda en este dispositivo, igual que el tema.
import { useSyncExternalStore } from 'react';

/** Clave de la copia local: "1" = ayudas ocultas; cualquier otra cosa (o nada) = se muestran. */
export const CLAVE_AYUDAS = 'centinela_ayudas_ocultas';

/** Por defecto se muestran: solo un "1" guardado las oculta (un valor roto o viejo no). */
export function ayudasVisiblesSegun(guardada: string | null | undefined): boolean {
  return guardada !== '1';
}

function leerGuardada(): string | null {
  try {
    return localStorage.getItem(CLAVE_AYUDAS);
  } catch {
    return null;
  }
}

/** Guarda la elección; false si el almacenamiento falla (modo privado, cuota llena, bloqueado). */
function guardarLocal(visibles: boolean): boolean {
  try {
    if (visibles) localStorage.removeItem(CLAVE_AYUDAS);
    else localStorage.setItem(CLAVE_AYUDAS, '1');
    return true;
  } catch {
    return false;
  }
}

// ── Estado compartido (todas las ayudas y el interruptor del perfil ven lo mismo) ──
let visibles = ayudasVisiblesSegun(leerGuardada());
const oyentes = new Set<() => void>();

function avisar() {
  for (const oyente of oyentes) oyente();
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

export function ayudasVisibles(): boolean {
  return visibles;
}

/**
 * Cambia la elección al instante (optimista) y la guarda. Si no se pudo guardar, vuelve a como
 * estaba y devuelve false para que la pantalla avise.
 */
export function elegirAyudasVisibles(nuevas: boolean): boolean {
  const anterior = visibles;
  if (nuevas === anterior) return true;
  visibles = nuevas;
  avisar();
  if (guardarLocal(nuevas)) return true;
  visibles = anterior;
  avisar();
  return false;
}

/** Vuelve a leer lo guardado (cambio hecho en otra pestaña, o los tests). */
export function releerAyudas() {
  const guardadas = ayudasVisiblesSegun(leerGuardada());
  if (guardadas === visibles) return;
  visibles = guardadas;
  avisar();
}

// Lo que se elige en otra pestaña se refleja en esta
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (ev) => {
    if (ev.key === CLAVE_AYUDAS || ev.key === null) releerAyudas();
  });
}

/** true si las ayudas de pantalla se muestran. */
export function useAyudasVisibles(): boolean {
  return useSyncExternalStore(suscribir, ayudasVisibles, ayudasVisibles);
}

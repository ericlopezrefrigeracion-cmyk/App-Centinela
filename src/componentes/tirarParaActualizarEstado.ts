// "Tirar para actualizar" propio de la app instalada (ESTANDARES D6): la lógica sin pantalla.
// En el celular no va el botón "Actualizar"; se actualiza tirando la pantalla hacia abajo. El navegador ya trae ese
// gesto, pero en la app instalada (display standalone) muchas veces no (iPhone nunca, Android depende): ahí lo hace
// la app, solo en pantallas táctiles. Al soltar, vuelve a cargar los datos de la pantalla (las funciones que
// registraron los indicadores "Act. HH:MM" visibles); si la pantalla no registró ninguna, recarga la página.
// Fuente única: Proyectos/plantillas/tirar-para-actualizar/. Se copia tal cual a cada proyecto.

/** Criterio único de "celular" para todos los proyectos: lo que tiene la clase `tpa-oculto-celular` no se muestra. */
export const CONSULTA_CELULAR = '(max-width: 639px)'

/** Cuánto hay que tirar (ya con la resistencia aplicada) para que al soltar se actualice. */
export const UMBRAL_PX = 64
/** Hasta dónde baja el indicador como máximo. */
export const MAXIMO_PX = 96
/** Movimiento mínimo del dedo antes de decidir si es un tirón hacia abajo o un scroll/deslizamiento. */
export const ZONA_MUERTA_PX = 6

/** Lo que el dedo recorrió hacia abajo se convierte en lo que baja el indicador (con resistencia, como el nativo). */
export function distanciaVisible(dy: number): number {
  if (!(dy > 0)) return 0
  return Math.min(MAXIMO_PX, Math.floor(dy * 0.5))
}

export function superaUmbral(dy: number): boolean {
  return distanciaVisible(dy) >= UMBRAL_PX
}

/**
 * Primer movimiento del dedo: 'esperar' (todavía no se movió lo suficiente), 'tirar' (hacia abajo y más vertical que
 * horizontal) o 'soltar' (hacia arriba o de costado: es un scroll o un deslizamiento, no se toca).
 */
export function decidirGesto(dx: number, dy: number): 'esperar' | 'tirar' | 'soltar' {
  if (Math.abs(dx) < ZONA_MUERTA_PX && Math.abs(dy) < ZONA_MUERTA_PX) return 'esperar'
  if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) return 'soltar'
  return 'tirar'
}

export interface EntornoTirar {
  /** App instalada: display-mode standalone (o navigator.standalone en el iPhone). */
  standalone: boolean
  /** Pantalla táctil como puntero principal (pointer: coarse). */
  tactil: boolean
}

/**
 * Por defecto solo en la app instalada y en pantallas táctiles (en el navegador queda el gesto nativo).
 * `tambienEnNavegador`: para las apps cuyo contenido se desplaza dentro de un contenedor (no el documento), donde el
 * gesto del navegador no funciona: entonces se activa en cualquier pantalla táctil. Regla de fondo: en el celular
 * siempre se puede tirar para actualizar.
 */
export function debeActivarse(entorno: EntornoTirar, tambienEnNavegador = false): boolean {
  return entorno.tactil && (entorno.standalone || tambienEnNavegador)
}

interface VentanaMinima {
  matchMedia?: (consulta: string) => { matches: boolean }
  // unknown: el Navigator real no encaja en un tipo con todo opcional (TS2345); standalone se lee abajo.
  navigator?: unknown
}

export function leerEntorno(ventana: VentanaMinima): EntornoTirar {
  const coincide = (consulta: string) => {
    try { return ventana.matchMedia?.(consulta).matches === true } catch { return false }
  }
  return {
    standalone: coincide('(display-mode: standalone)') || coincide('(display-mode: fullscreen)') || (ventana.navigator as { standalone?: boolean } | undefined)?.standalone === true,
    tactil: coincide('(pointer: coarse)'),
  }
}

/** Nodo mínimo para recorrer hacia arriba (sirve con elementos reales y con objetos de prueba). */
export interface NodoDesplazable {
  scrollTop?: number
  parentElement?: NodoDesplazable | null
  closest?: (selector: string) => unknown
}

/** Zonas donde el gesto no se usa: campos de texto y lo que el proyecto marque con `data-sin-tirar` (mapas, arrastres). */
export const SELECTOR_EXCLUIDO = 'textarea, input, select, [contenteditable="true"], [data-sin-tirar]'

/**
 * El tirón solo empieza si la página está arriba de todo y ningún contenedor con scroll que tenga al dedo está
 * desplazado (si no, el dedo está haciendo scroll de esa lista y no hay que tocarlo).
 */
export function arribaDeTodo(objetivo: NodoDesplazable | null | undefined, scrollPagina: number): boolean {
  if (scrollPagina > 0) return false
  if (objetivo?.closest?.(SELECTOR_EXCLUIDO)) return false
  for (let nodo = objetivo; nodo; nodo = nodo.parentElement) {
    if ((nodo.scrollTop ?? 0) > 0) return false
  }
  return true
}

interface DocumentoMinimo {
  querySelector: (selector: string) => unknown
  body?: { style?: { overflow?: string } } | null
}

/** Modales, ventanas y menús abiertos encima: con uno abierto, el gesto no hace nada. */
export const SELECTOR_MODAL = '[aria-modal="true"], dialog[open], [role="dialog"], [role="alertdialog"]'

export function hayModalAbierto(documento: DocumentoMinimo): boolean {
  if (documento.body?.style?.overflow === 'hidden') return true
  return documento.querySelector(SELECTOR_MODAL) != null
}

// Funciones de recarga de la pantalla visible: las registra cada indicador "Act. HH:MM" mientras está montado.
type Recarga = () => unknown
const recargas = new Set<Recarga>()

/** Registra una recarga de datos; devuelve la función que la quita (para el cleanup del efecto). */
export function registrarRecarga(recarga: Recarga): () => void {
  recargas.add(recarga)
  return () => { recargas.delete(recarga) }
}

export function cantidadRecargas(): number {
  return recargas.size
}

/**
 * Vuelve a cargar los datos de la pantalla: todas las recargas registradas a la vez (si una falla, las otras siguen;
 * el error lo muestra el propio indicador en ámbar). Sin ninguna registrada, recarga la página entera.
 */
export async function recargarPantalla(recargarPagina: () => void): Promise<'datos' | 'pagina'> {
  if (recargas.size === 0) {
    recargarPagina()
    return 'pagina'
  }
  await Promise.allSettled([...recargas].map(r => Promise.resolve().then(r)))
  return 'datos'
}

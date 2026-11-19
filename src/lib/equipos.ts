// Lógica de equipos: mapeo de la respuesta de la API, estado, señal, orden y resumen.
import { C } from './tema';

export type EstadoEquipo = 'normal' | 'atencion' | 'critico' | 'desconectado';
export type NivelSenal = 'buena' | 'normal' | 'baja';

/** Un ítem de GET /app/equipos tal como lo manda la API. */
export interface ItemEquipoApi {
  equipo: Record<string, any> & { id: string | number; ultima_conexion?: string | null };
  rol: string;
  ultimo_dato: { temp?: number | null; rssi?: number | null; fecha?: string } | null;
}

/** Equipo con los campos de la API más los nombres que usa la app. */
export interface EquipoApi {
  [campo: string]: any;
  id: string | number;
  nombre: string;
  rol: string;
  temperatura: number | null;
  rssi: number | null;
  ultimaConexion: string | null;
  minima: number;
  maxima: number;
  setpoint: number;
  retardo: number;
  alertasActivas: boolean;
}

export interface Equipo extends EquipoApi {
  senal: NivelSenal;
  estado: EstadoEquipo;
}

/** Minutos sin datos a partir de los cuales el equipo se considera desconectado. */
export const MINUTOS_DESCONEXION = 15;

export function mapearEquipos(items: ItemEquipoApi[]): EquipoApi[] {
  return items.map((item) => ({
    ...item.equipo,
    rol: item.rol,
    ultimo_dato: item.ultimo_dato,
    // Campos con los nombres de la app
    temperatura: item.ultimo_dato?.temp ?? null,
    rssi: item.ultimo_dato?.rssi ?? null,
    ultimaConexion: item.equipo.ultima_conexion ?? null,
    minima: item.equipo.minima,
    maxima: item.equipo.maxima,
    setpoint: item.equipo.set_point,
    retardo: item.equipo.retardo,
    alertasActivas: item.equipo.alertas_cliente,
  })) as unknown as EquipoApi[];
}

/** Nivel de señal WiFi según el rssi (dBm). Sin dato cuenta como señal baja. */
export function nivelSenal(rssi: number | null | undefined): NivelSenal {
  if (!rssi) return 'baja';
  if (rssi > -60) return 'buena';
  if (rssi > -75) return 'normal';
  return 'baja';
}

/** Estado del equipo: desconectado tiene prioridad sobre el estado de temperatura de la API. */
export function estadoEquipo(e: { ultimaConexion: string | null; estado_temp?: string | null }, ahora: number = Date.now()): EstadoEquipo {
  if (!e.ultimaConexion) return 'desconectado';
  const minutos = (ahora - new Date(e.ultimaConexion).getTime()) / 60000;
  if (minutos > MINUTOS_DESCONEXION) return 'desconectado';
  return (e.estado_temp ?? 'normal') as EstadoEquipo;
}

export function prepararEquipos(equipos: EquipoApi[], ahora: number = Date.now()): Equipo[] {
  return equipos.map((e) => ({ ...e, senal: nivelSenal(e.rssi), estado: estadoEquipo(e as any, ahora) }));
}

/** Colores de cada estado: texto, punto/barra y fondo suave (variables del tema). */
export function colorEstado(estado: EstadoEquipo): { texto: string; punto: string; fondo: string } {
  const mapa: Record<EstadoEquipo, { texto: string; punto: string; fondo: string }> = {
    normal: { texto: C.verde, punto: C.verdePunto, fondo: C.verdeFondo },
    atencion: { texto: C.ambar, punto: C.ambarPunto, fondo: C.ambarFondo },
    critico: { texto: C.rojo, punto: C.rojoPunto, fondo: C.rojoFondo },
    desconectado: { texto: C.gris, punto: C.grisPunto, fondo: C.grisFondo },
  };
  return mapa[estado] ?? mapa.desconectado;
}

export function labelEstado(estado: EstadoEquipo): string {
  const mapa: Record<EstadoEquipo, string> = {
    normal: 'Normal',
    atencion: 'Atención',
    critico: 'Crítico',
    desconectado: 'Desconectado',
  };
  return mapa[estado] ?? 'Sin datos';
}

/** Texto, color y cantidad de arcos encendidos del ícono WiFi. */
export function infoSenal(senal: NivelSenal): { texto: string; color: string; nivel: 1 | 2 | 3 } {
  const mapa = {
    buena: { texto: 'Señal buena', color: C.verde, nivel: 3 as const },
    normal: { texto: 'Señal normal', color: C.ambar, nivel: 2 as const },
    baja: { texto: 'Señal baja', color: C.rojo, nivel: 1 as const },
  };
  return mapa[senal] ?? mapa.baja;
}

/** Orden de urgencia de las tarjetas: crítico, atención, desconectado y por último normal. */
const URGENCIA: Record<EstadoEquipo, number> = { critico: 0, atencion: 1, desconectado: 2, normal: 3 };

/** Equipos ordenados por urgencia; dentro de cada estado se respeta el orden de la API. */
export function ordenarPorUrgencia<T extends { estado: EstadoEquipo }>(equipos: T[]): T[] {
  return equipos
    .map((eq, i) => ({ eq, i }))
    .sort((a, b) => (URGENCIA[a.eq.estado] ?? 9) - (URGENCIA[b.eq.estado] ?? 9) || a.i - b.i)
    .map((x) => x.eq);
}

export type ResumenEstados = Record<EstadoEquipo, number>;

/** Cuántos equipos hay en cada estado (para los contadores de arriba de la lista). */
export function resumenEstados(equipos: { estado: EstadoEquipo }[]): ResumenEstados {
  const r: ResumenEstados = { normal: 0, atencion: 0, critico: 0, desconectado: 0 };
  equipos.forEach((eq) => { if (eq.estado in r) r[eq.estado] += 1; });
  return r;
}

/**
 * Posición de la temperatura dentro del rango, de 0 (en la mínima) a 1 (en la máxima), limitada a
 * ese intervalo. null si falta algún dato o el rango no es válido.
 */
export function posicionEnRango(temp: number | null | undefined, minima: number | null | undefined, maxima: number | null | undefined): number | null {
  if (temp == null || minima == null || maxima == null) return null;
  const t = Number(temp), lo = Number(minima), hi = Number(maxima);
  if (![t, lo, hi].every(Number.isFinite) || hi <= lo) return null;
  return Math.min(1, Math.max(0, (t - lo) / (hi - lo)));
}

/** Compara ids de equipo venga el id como texto (URL) o como número (API). */
export function mismoId(a: string | number | undefined | null, b: string | number | undefined | null): boolean {
  return a != null && b != null && String(a) === String(b);
}

// Aviso para que la lista de equipos (que queda abierta debajo) se actualice al agregar,
// editar o eliminar un equipo.
const EVENTO_CAMBIO = 'centinela:equipos-cambiaron';
export function avisarCambioEquipos() {
  window.dispatchEvent(new Event(EVENTO_CAMBIO));
}
export function alCambiarEquipos(fn: () => void): () => void {
  window.addEventListener(EVENTO_CAMBIO, fn);
  return () => window.removeEventListener(EVENTO_CAMBIO, fn);
}

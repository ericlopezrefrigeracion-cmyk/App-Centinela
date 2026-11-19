// Lógica de equipos: mapeo de la respuesta de la API, estado y señal.
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

export function colorEstado(estado: EstadoEquipo): string {
  const mapa: Record<EstadoEquipo, string> = {
    normal: C.normal,
    atencion: C.alerta,
    critico: C.critico,
    desconectado: C.desconectado,
  };
  return mapa[estado] ?? C.desconectado;
}

export function labelEstado(estado: EstadoEquipo): string {
  const mapa: Record<EstadoEquipo, string> = {
    normal: 'NORMAL',
    atencion: 'ATENCIÓN',
    critico: 'CRÍTICO',
    desconectado: 'DESCONECTADO',
  };
  return mapa[estado] ?? 'SIN DATOS';
}

export function infoSenal(senal: NivelSenal) {
  const mapa = {
    buena: { texto: 'Señal buena', color: C.senalBuena, icono: '▋▋▋' },
    normal: { texto: 'Señal normal', color: C.senalNormal, icono: '▋▋░' },
    baja: { texto: 'Señal baja', color: C.senalBaja, icono: '▋░░' },
  };
  return mapa[senal] ?? { texto: 'Sin señal', color: C.desconectado, icono: '░░░' };
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

// Lógica de la pantalla de alertas.
import type { NombreIcono } from '../componentes/iconos';
import { formatFechaHoraCompleta, formatTemp } from './formato';
import { C } from './tema';

export type TipoAlerta = 'temperatura' | 'desconexion' | 'reconexion';

export interface AlertaApi {
  id: number;
  equipo_id: string;
  fecha: string;
  tipo: string;
  valor?: number | null;
  leida?: boolean;
  [campo: string]: any;
}

export interface Alerta extends AlertaApi {
  equipo: string;
  descripcion: string;
  vista: boolean;
}

export interface InfoTipo {
  icono: NombreIcono;
  color: string;
  fondo: string;
  label: string;
}

/** Ícono, colores y nombre (con tilde) de cada tipo de alerta. La reconexión es buena noticia: va en verde. */
export function infoTipo(tipo: string | null | undefined): InfoTipo {
  const mapa: Record<string, InfoTipo> = {
    temperatura: { icono: 'termometro', color: C.rojo, fondo: C.rojoFondo, label: 'Temperatura' },
    desconexion: { icono: 'wifiApagado', color: C.gris, fondo: C.grisFondo, label: 'Desconexión' },
    reconexion: { icono: 'wifi', color: C.verde, fondo: C.verdeFondo, label: 'Reconexión' },
  };
  return mapa[normalizarTipo(tipo)] ?? { icono: 'alerta', color: C.ambar, fondo: C.ambarFondo, label: 'Alerta' };
}

/** "Reconexión", "RECONEXION" o "reconexion" → "reconexion". */
export function normalizarTipo(tipo: string | null | undefined): string {
  return String(tipo ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
}

/**
 * Detalle útil de la alerta: el mensaje si la API lo manda, si no la temperatura registrada.
 * Sin ninguno de los dos, nada (no se repite el tipo).
 */
export function detalleAlerta(a: { valor?: number | null; mensaje?: unknown }): string {
  if (typeof a.mensaje === 'string' && a.mensaje.trim()) return a.mensaje.trim();
  if (a.valor != null && Number.isFinite(Number(a.valor))) return `${formatTemp(a.valor)} °C`;
  return '';
}

/** La API puede mandar la lista sola o paginada ({ items }). */
export function listaDeAlertas(data: unknown): AlertaApi[] {
  if (Array.isArray(data)) return data;
  return (data as { items?: AlertaApi[] } | null)?.items ?? [];
}

export function mapearAlertas(lista: AlertaApi[], equipos: { id: string | number; nombre: string }[]): Alerta[] {
  const nombres: Record<string, string> = {};
  equipos.forEach((e) => { nombres[String(e.id)] = e.nombre; });
  return lista.map((a) => ({
    ...a,
    equipo: nombres[String(a.equipo_id)] ?? 'Equipo desconocido',
    descripcion: detalleAlerta(a),
    vista: !!a.leida,
  }));
}

/** Equipos (sin repetir) que tienen alertas sin ver: uno por pedido de "marcar todas". */
export function equiposConAlertasSinVer(alertas: Alerta[]): string[] {
  return [...new Set(alertas.filter((a) => !a.vista).map((a) => a.equipo_id))];
}

/** Fecha y hora de la alerta: "19/11/2026 15:00" (Buenos Aires, 24 h). */
export function formatFecha(fechaStr: string): string {
  return formatFechaHoraCompleta(fechaStr);
}

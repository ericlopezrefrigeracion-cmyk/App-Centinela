// Lógica de la pantalla de alertas.
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

export function infoTipo(tipo: string) {
  const mapa: Record<string, { icono: string; color: string; label: string }> = {
    temperatura: { icono: '🌡️', color: C.critico, label: 'Temperatura' },
    desconexion: { icono: '📵', color: C.desconectado, label: 'Desconexión' },
    reconexion: { icono: '✅', color: C.normal, label: 'Reconexión' },
  };
  return mapa[tipo] ?? { icono: '⚠️', color: C.alerta, label: 'Alerta' };
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
    descripcion: a.tipo + (a.valor != null ? ` — ${a.valor}°C` : ''),
    vista: !!a.leida,
  }));
}

/** Equipos (sin repetir) que tienen alertas sin ver: uno por pedido de "marcar todas". */
export function equiposConAlertasSinVer(alertas: Alerta[]): string[] {
  return [...new Set(alertas.filter((a) => !a.vista).map((a) => a.equipo_id))];
}

export function formatFecha(fechaStr: string): string {
  return new Date(fechaStr).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

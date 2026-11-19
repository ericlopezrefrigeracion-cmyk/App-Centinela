// Formato de números, temperaturas, fechas y horas. Siempre en hora de Buenos Aires, 24 h y con
// coma decimal, igual en la pantalla y en los reportes PDF (no depende del idioma del navegador).

export const ZONA = 'America/Argentina/Buenos_Aires';
const MENOS = '−'; // signo menos tipográfico (−), más legible que el guion

/** Número con coma decimal y signo menos: 2,5 · −25 · −9,3. Hasta `decimales` decimales (sin ceros de más). */
export function formatNumero(n: number | string | null | undefined, decimales = 1): string {
  if (n == null || n === '' || !Number.isFinite(Number(n))) return '—';
  const redondeado = Number(Number(n).toFixed(decimales));
  const texto = Math.abs(redondeado).toLocaleString('en-US', { maximumFractionDigits: decimales, useGrouping: false }).replace('.', ',');
  return redondeado < 0 ? MENOS + texto : texto;
}

/** Temperatura con un decimal fijo: 2,4 · −9,3 · 7,0 (sin la unidad). */
export function formatTemp(n: number | string | null | undefined): string {
  if (n == null || n === '' || !Number.isFinite(Number(n))) return '—';
  const redondeado = Number(Number(n).toFixed(1));
  const texto = Math.abs(redondeado).toFixed(1).replace('.', ',');
  return redondeado < 0 ? MENOS + texto : texto;
}

function partes(fecha: Date | string | number): Record<string, string> | null {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (isNaN(d.getTime())) return null;
  const r: Record<string, string> = {};
  new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d).forEach((p) => { r[p.type] = p.value; });
  return r;
}

/** Hora 24 h: "15:00". */
export function formatHora24(fecha: Date | string | number): string {
  const p = partes(fecha);
  return p ? `${p.hour}:${p.minute}` : '—';
}

/** Día y hora: "19/11 15:00". */
export function formatDiaHora(fecha: Date | string | number): string {
  const p = partes(fecha);
  return p ? `${p.day}/${p.month} ${p.hour}:${p.minute}` : '—';
}

/** Fecha completa y hora: "19/11/2026 15:00". */
export function formatFechaHoraCompleta(fecha: Date | string | number): string {
  const p = partes(fecha);
  return p ? `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}` : '—';
}

/** Solo la fecha: "19/11/2026". */
export function formatFecha(fecha: Date | string | number): string {
  const p = partes(fecha);
  return p ? `${p.day}/${p.month}/${p.year}` : '—';
}

/**
 * Período del histórico tal como lo manda la API ("2026-03-30 14:00:00", ya en hora local):
 * se reordenan los números sin convertir de zona. Devuelve "30/03 14:00".
 */
export function formatPeriodo(periodo: string): string {
  const m = String(periodo ?? '').match(/(\d{4})-(\d{2})-(\d{2})(?:[\sT](\d{2}):(\d{2}))?/);
  if (!m) return '—';
  return m[4] ? `${m[3]}/${m[2]} ${m[4]}:${m[5]}` : `${m[3]}/${m[2]}`;
}

/** "hace 1 min", "hace 3 h", "hace 2 días"; menos de un minuto es "recién". */
export function haceCuanto(fecha: string | null | undefined, ahora: number = Date.now()): string {
  if (!fecha) return 'sin datos';
  const t = new Date(fecha).getTime();
  if (isNaN(t)) return 'sin datos';
  const minutos = Math.floor((ahora - t) / 60000);
  if (minutos < 1) return 'recién';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'hace 1 día' : `hace ${dias} días`;
}

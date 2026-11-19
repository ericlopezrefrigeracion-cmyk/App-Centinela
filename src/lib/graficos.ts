// Cálculos de los gráficos de temperatura (pantalla de detalle y reportes PDF).
import { formatDiaHora, formatHora24, formatNumero } from './formato';

export interface Dato {
  fecha: string;
  temp: number;
  rssi?: number;
  [campo: string]: any;
}

/** Más de 15 minutos sin datos entre dos lecturas = período desconectado (línea punteada gris). */
export const GAP_MS = 15 * 60 * 1000;

/** Hora del eje del gráfico: "15:00" (24 h, Buenos Aires). */
export function formatHora(fechaStr: string): string {
  return formatHora24(fechaStr);
}

/** "19/11 15:00" (24 h, Buenos Aires). */
export function formatFechaHora(fechaStr: string): string {
  return formatDiaHora(fechaStr);
}

/**
 * Escala "redonda" para el eje Y: un paso de 0,5 · 1 · 2 · 2,5 · 5 · 10… y los límites múltiplos de
 * ese paso que cubren de `min` a `max` con unas `marcas` divisiones.
 */
export function escalaRedonda(min: number, max: number, marcas = 4): { desde: number; hasta: number; paso: number } {
  const crudo = (max - min) / marcas || 1;
  const potencia = 10 ** Math.floor(Math.log10(crudo));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= crudo - 1e-9) ?? 10 * potencia;
  return { desde: Math.floor(min / paso + 1e-9) * paso, hasta: Math.ceil(max / paso - 1e-9) * paso, paso };
}

/**
 * Posiciones (índices de `datos`) de las marcas del eje X: tantas como entren dejando `separacion`
 * píxeles entre etiquetas, entre 2 y `maximo`, repartidas de punta a punta y sin repetir.
 */
export function marcasEjeX(cantidad: number, anchoUtil: number, separacion = 64, maximo = 6): number[] {
  if (cantidad <= 0) return [];
  if (cantidad === 1) return [0];
  const entran = Math.max(2, Math.min(maximo, Math.floor(anchoUtil / separacion) + 1));
  const marcas = Math.min(entran, cantidad);
  return [...new Set(Array.from({ length: marcas }, (_, i) => Math.round((i / (marcas - 1)) * (cantidad - 1))))];
}

/** Lecturas de las últimas 24 h reducidas a un punto (promedio) cada 5 minutos, en orden. */
export function procesarRecientes(datosRaw: Dato[], ahora: number = Date.now()): Dato[] {
  const hace24hs = ahora - 24 * 60 * 60 * 1000;
  const filtrados = datosRaw.filter((d) => new Date(d.fecha).getTime() >= hace24hs);
  const porIntervalo: Record<string, Dato[]> = {};
  filtrados.forEach((d) => {
    const intervalo = Math.floor(new Date(d.fecha).getTime() / (5 * 60 * 1000));
    (porIntervalo[intervalo] ??= []).push(d);
  });
  return Object.values(porIntervalo)
    .sort((a, b) => new Date(a[0]!.fecha).getTime() - new Date(b[0]!.fecha).getTime())
    .map((grupo) => ({
      ...grupo[0]!,
      temp: grupo.reduce((s, d) => s + Number(d.temp), 0) / grupo.length,
    }));
}

export type Segmento = { kind: 'line'; indices: number[] } | { kind: 'gap'; from: number; to: number };

/** Parte la serie en tramos conectados y cortes (más de GAP_MS entre lecturas). */
export function segmentos(datos: Dato[]): Segmento[] {
  if (datos.length === 0) return [];
  const segs: Segmento[] = [];
  let actual: number[] = [0];
  for (let i = 1; i < datos.length; i++) {
    const diff = new Date(datos[i]!.fecha).getTime() - new Date(datos[i - 1]!.fecha).getTime();
    if (diff > GAP_MS) {
      segs.push({ kind: 'line', indices: [...actual] });
      segs.push({ kind: 'gap', from: i - 1, to: i });
      actual = [i];
    } else {
      actual.push(i);
    }
  }
  segs.push({ kind: 'line', indices: actual });
  return segs;
}

export function hayCorte(datos: Dato[]): boolean {
  return datos.some((d, i) => i > 0 && new Date(d.fecha).getTime() - new Date(datos[i - 1]!.fecha).getTime() > GAP_MS);
}

/**
 * Fecha de un período del histórico. Puede venir como "2026-03-30 14:00:00",
 * "2026-03-30T14:00:00Z" o "2026-03-30": se toman las partes numéricas como hora local.
 */
export function parseFecha(str: string): Date {
  if (!str) return new Date(NaN);
  const match = str.match(/(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2})/);
  if (match) {
    const [, anio, mes, dia, hora, min] = match;
    return new Date(Number(anio), Number(mes) - 1, Number(dia), Number(hora), Number(min));
  }
  const soloFecha = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (soloFecha) {
    const [, anio, mes, dia] = soloFecha;
    return new Date(Number(anio), Number(mes) - 1, Number(dia));
  }
  return new Date(NaN);
}

// ── Gráficos SVG de los reportes PDF (siempre en colores claros, para imprimir) ──
const IMPRESION = {
  linea: '#4e9a12',
  area: 'rgba(78, 154, 18, 0.10)',
  minima: '#d98a00',
  maxima: '#c62828',
  corte: '#8a96a3',
  grilla: '#e2e7ed',
  texto: '#5a6776',
  fondo: '#f7f9fb',
};

interface OpcionesGraficoPdf {
  /** Momento de cada lectura (ms), en el mismo orden que `temps`. */
  tiempos: number[];
  temps: number[];
  minima?: number | null;
  maxima?: number | null;
  /** Más de este tiempo entre dos lecturas se dibuja como corte (línea gris punteada). */
  corteMs: number;
  /** Texto de cada marca del eje X. */
  etiqueta: (t: number) => string;
  alto: number;
  marcasX: number;
}

/** Escapa texto para meterlo en el HTML del reporte. */
export function escaparHtml(texto: unknown): string {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function graficoPdf({ tiempos, temps, minima, maxima, corteMs, etiqueta, alto, marcasX }: OpcionesGraficoPdf): string {
  const validos = temps.map((t, i) => ({ t, x: tiempos[i]! })).filter((p) => Number.isFinite(p.t) && Number.isFinite(p.x));
  if (validos.length === 0) return '<div class="sin-grafico">Sin datos para graficar en este período.</div>';

  const W = 720, H = alto;
  const padL = 46, padR = 40, padT = 16, padB = 30;
  const ancho = W - padL - padR;
  const altoUtil = H - padT - padB;

  const limites = [minima, maxima].filter((v): v is number => v != null && Number.isFinite(Number(v))).map(Number);
  // Eje Y con valores redondos que cubren las lecturas y el rango permitido
  const escala = escalaRedonda(Math.min(...validos.map((p) => p.t), ...limites) - 0.5, Math.max(...validos.map((p) => p.t), ...limites) + 0.5);
  const tMin = escala.desde;
  const rango = escala.hasta - escala.desde || 1;
  const x0 = validos[0]!.x;
  const x1 = validos[validos.length - 1]!.x;
  const dur = x1 - x0;

  const x = (ms: number) => (dur > 0 ? padL + ((ms - x0) / dur) * ancho : padL + ancho / 2);
  const y = (t: number) => padT + altoUtil - ((t - tMin) / rango) * altoUtil;
  const f = (n: number) => n.toFixed(1);

  // Tramos continuos y cortes
  const tramos: { x: number; t: number }[][] = [[validos[0]!]];
  const cortes: string[] = [];
  for (let i = 1; i < validos.length; i++) {
    const a = validos[i - 1]!, b = validos[i]!;
    if (b.x - a.x > corteMs) {
      cortes.push(`<line x1="${f(x(a.x))}" y1="${f(y(a.t))}" x2="${f(x(b.x))}" y2="${f(y(b.t))}" stroke="${IMPRESION.corte}" stroke-width="1.5" stroke-dasharray="5,4"/>`);
      tramos.push([b]);
    } else {
      tramos[tramos.length - 1]!.push(b);
    }
  }
  const base = padT + altoUtil;
  const lineas = tramos.map((tr) => {
    if (tr.length === 1) return `<circle cx="${f(x(tr[0]!.x))}" cy="${f(y(tr[0]!.t))}" r="2.5" fill="${IMPRESION.linea}"/>`;
    const pts = tr.map((p) => `${f(x(p.x))},${f(y(p.t))}`).join(' ');
    return `<polygon points="${f(x(tr[0]!.x))},${base} ${pts} ${f(x(tr[tr.length - 1]!.x))},${base}" fill="${IMPRESION.area}"/>`
      + `<polyline points="${pts}" fill="none" stroke="${IMPRESION.linea}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  }).join('');

  const grilla = Array.from({ length: Math.round(rango / escala.paso) + 1 }, (_, i) => {
    const t = tMin + escala.paso * i;
    return `<line x1="${padL}" y1="${f(y(t))}" x2="${W - padR}" y2="${f(y(t))}" stroke="${IMPRESION.grilla}" stroke-width="1"/>`
      + `<text x="${padL - 6}" y="${f(y(t) + 3.5)}" text-anchor="end" font-size="10" fill="${IMPRESION.texto}">${formatNumero(t)}°</text>`;
  }).join('');

  const limite = (v: number | null | undefined, color: string, texto: string) => (v == null || !Number.isFinite(Number(v)) ? '' :
    `<line x1="${padL}" y1="${f(y(Number(v)))}" x2="${W - padR}" y2="${f(y(Number(v)))}" stroke="${color}" stroke-width="1.5" stroke-dasharray="6,3"/>`
    + `<text x="${W - padR + 4}" y="${f(y(Number(v)) + 3.5)}" font-size="9" fill="${color}">${texto}</text>`);

  // Marcas del eje X repartidas en el tiempo (con una sola lectura, una sola marca)
  const n = dur > 0 ? marcasX : 1;
  const etiquetasX = Array.from({ length: n }, (_, i) => {
    const ms = n === 1 ? x0 : x0 + (dur * i) / (n - 1);
    return `<text x="${f(x(ms))}" y="${H - 9}" text-anchor="middle" font-size="9.5" fill="${IMPRESION.texto}">${escaparHtml(etiqueta(ms))}</text>`;
  }).join('');

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="background:${IMPRESION.fondo};border-radius:8px;max-width:100%;height:auto">
${grilla}
${limite(minima, IMPRESION.minima, 'mín')}
${limite(maxima, IMPRESION.maxima, 'máx')}
${lineas}
${cortes.join('')}
${etiquetasX}
</svg>`;
}

/** Gráfico del PDF de las últimas 24 h: horas en 24 h de Buenos Aires; los cortes de más de 15 min, punteados. */
export function graficoPdf24h(datos: Dato[], minima?: number | null, maxima?: number | null): string {
  return graficoPdf({
    tiempos: datos.map((d) => new Date(d.fecha).getTime()),
    temps: datos.map((d) => Number(d.temp)),
    minima, maxima,
    corteMs: GAP_MS,
    etiqueta: (ms) => formatHora24(ms),
    alto: 230,
    marcasX: 7,
  });
}

/** Gráfico del PDF semanal (promedio por hora): días y horas; los cortes de más de 2 h, punteados. */
export function graficoPdfSemanal(datos: Dato[], minima?: number | null, maxima?: number | null): string {
  // Los períodos vienen en hora local sin zona: se leen y se muestran tal cual
  const tiempos = (datos ?? []).map((d) => parseFecha(d.fecha).getTime());
  const p = (v: number) => String(v).padStart(2, '0');
  return graficoPdf({
    tiempos,
    temps: (datos ?? []).map((d) => Number(d.temp)),
    minima, maxima,
    corteMs: 2 * 60 * 60 * 1000,
    etiqueta: (ms) => { const d = new Date(ms); return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`; },
    alto: 260,
    marcasX: 7,
  });
}

// ── Semanas del selector de Históricos ───────────────
export interface Semana {
  label: string;
  fechaInicio: string;
}

/** "02/11" con la fecha local (las semanas se calculan en hora local, que para los clientes es la de Buenos Aires). */
function diaMes(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Las últimas 8 semanas (lunes a domingo), empezando por la actual. */
export function generarSemanas(hoy: Date = new Date()): Semana[] {
  const semanas: Semana[] = [];
  for (let i = 0; i < 8; i++) {
    const inicio = new Date(hoy);
    // Retroceder al lunes de la semana correspondiente
    const diaSemana = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1;
    inicio.setDate(hoy.getDate() - diaSemana - i * 7);
    inicio.setHours(0, 0, 0, 0);

    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 6);

    const label = i === 0
      ? 'Semana actual'
      : i === 1
        ? 'Semana pasada'
        : `${diaMes(inicio)} — ${diaMes(fin)}`;

    // Igual que antes: la fecha del lunes sale de toISOString (UTC)
    semanas.push({ label, fechaInicio: inicio.toISOString().split('T')[0]! });
  }
  return semanas;
}

/** Desde el lunes 00:00 local; hasta ahora (semana actual) o el domingo 23:59:59.999. */
export function rangoSemana(fechaInicio: string, esSemanaActual: boolean, ahora: Date = new Date()): { desde: string; hasta: string } {
  const desde = new Date(fechaInicio + 'T00:00:00').toISOString();
  if (esSemanaActual) return { desde, hasta: ahora.toISOString() };
  const hasta = new Date(fechaInicio + 'T00:00:00');
  hasta.setDate(hasta.getDate() + 7);
  hasta.setMilliseconds(-1);
  return { desde, hasta: hasta.toISOString() };
}

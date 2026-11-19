// Cálculos de los gráficos de temperatura (pantalla de detalle y reportes PDF).

export interface Dato {
  fecha: string;
  temp: number;
  rssi?: number;
  [campo: string]: any;
}

/** Más de 15 minutos sin datos entre dos lecturas = período desconectado (línea punteada gris). */
export const GAP_MS = 15 * 60 * 1000;

export function formatHora(fechaStr: string): string {
  return new Date(fechaStr).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export function formatFechaHora(fechaStr: string): string {
  return new Date(fechaStr).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
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

// ── Gráfico SVG del PDF de las últimas 24 h ──────────
export function graficoPdf24h(datos: Dato[], minima?: number, maxima?: number): string {
  if (datos.length === 0) return '<p style="color:#999">Sin datos para graficar</p>';

  const W = 720, H = 220;
  const padL = 48, padR = 20, padT = 20, padB = 36;
  const ancho = W - padL - padR;
  const alto = H - padT - padB;

  const temps = datos.map((d) => d.temp);
  const tMin = Math.min(...temps, minima ?? 0) - 2;
  const tMax = Math.max(...temps, maxima ?? 0) + 2;
  const rango = tMax - tMin || 1;

  const x = (i: number) => padL + (i / (datos.length - 1)) * ancho;
  const y = (t: number) => padT + alto - ((t - tMin) / rango) * alto;

  const polyline = datos.map((d, i) => `${x(i).toFixed(1)},${y(d.temp).toFixed(1)}`).join(' ');

  const yMinima = y(minima ?? tMin).toFixed(1);
  const yMaxima = y(maxima ?? tMax).toFixed(1);

  const etiquetas = Array.from({ length: 6 }, (_, i) => {
    const idx = Math.round(i * (datos.length - 1) / 5);
    return { idx, label: formatHora(datos[idx]!.fecha) };
  });

  const etiquetasY = Array.from({ length: 5 }, (_, i) => {
    const t = tMin + (rango * i) / 4;
    return { t, yPos: y(t) };
  });

  return `
      <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" style="background:#f8f8f8;border-radius:8px">

        <!-- Grilla horizontal -->
        ${etiquetasY.map(e => `
          <line x1="${padL}" y1="${e.yPos.toFixed(1)}" x2="${W - padR}" y2="${e.yPos.toFixed(1)}"
            stroke="#ddd" stroke-width="1" stroke-dasharray="4"/>
          <text x="${padL - 4}" y="${(e.yPos + 4).toFixed(1)}"
            text-anchor="end" font-size="10" fill="#999">${e.t.toFixed(1)}°</text>
        `).join('')}

        <!-- Línea temperatura mínima permitida -->
        <line x1="${padL}" y1="${yMinima}" x2="${W - padR}" y2="${yMinima}"
          stroke="#f5a623" stroke-width="1.5" stroke-dasharray="6,3"/>
        <text x="${W - padR + 2}" y="${yMinima}" font-size="9" fill="#f5a623" dominant-baseline="middle">mín</text>

        <!-- Línea temperatura máxima permitida -->
        <line x1="${padL}" y1="${yMaxima}" x2="${W - padR}" y2="${yMaxima}"
          stroke="#ff4444" stroke-width="1.5" stroke-dasharray="6,3"/>
        <text x="${W - padR + 2}" y="${yMaxima}" font-size="9" fill="#ff4444" dominant-baseline="middle">máx</text>

        <!-- Área bajo la curva -->
        <polygon
          points="${padL},${padT + alto} ${polyline} ${x(datos.length - 1).toFixed(1)},${padT + alto}"
          fill="rgba(126,211,33,0.1)"/>

        <!-- Línea de temperatura -->
        <polyline points="${polyline}"
          fill="none" stroke="#7ed321" stroke-width="2" stroke-linejoin="round"/>

        <!-- Etiquetas eje X -->
        ${etiquetas.map(e => `
          <text x="${x(e.idx).toFixed(1)}" y="${H - 6}"
            text-anchor="middle" font-size="10" fill="#999">${e.label}</text>
        `).join('')}

      </svg>
    `;
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

// ── Gráfico SVG del PDF semanal ──────────────────────
export function graficoPdfSemanal(datos: Dato[], minima?: number, maxima?: number): string {
  if (!datos || datos.length === 0) return '<p style="color:#999">Sin datos para graficar</p>';

  const W = 720, H = 260;
  const padL = 48, padR = 20, padT = 20, padB = 36;
  const ancho = W - padL - padR;
  const alto = H - padT - padB;

  const temps = datos.map((d) => Number(d.temp));
  const tMin = Math.min(...temps, minima ?? 0) - 2;
  const tMax = Math.max(...temps, maxima ?? 0) + 2;
  const rango = tMax - tMin || 1;

  const x = (i: number) => datos.length === 1 ? padL + ancho / 2 : padL + (i / (datos.length - 1)) * ancho;
  const y = (t: number) => padT + alto - ((t - tMin) / rango) * alto;

  const fechas = datos.map((d) => parseFecha(d.fecha));

  const polyline = datos.map((d, i) => `${x(i).toFixed(1)},${y(Number(d.temp)).toFixed(1)}`).join(' ');

  // Cortes de más de 2 horas entre puntos consecutivos: línea gris punteada
  const DOS_HORAS = 2 * 60 * 60 * 1000;
  const segmentosGap: string[] = [];
  for (let i = 0; i < datos.length - 1; i++) {
    const diff = fechas[i + 1]!.getTime() - fechas[i]!.getTime();
    if (diff > DOS_HORAS) {
      const x1 = x(i).toFixed(1);
      const y1 = y(Number(datos[i]!.temp)).toFixed(1);
      const x2 = x(i + 1).toFixed(1);
      const y2 = y(Number(datos[i + 1]!.temp)).toFixed(1);
      segmentosGap.push(
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#bbb" stroke-width="1.5" stroke-dasharray="5,4"/>`
      );
    }
  }

  const yMinima = minima != null ? y(minima).toFixed(1) : null;
  const yMaxima = maxima != null ? y(maxima).toFixed(1) : null;

  const numEtiq = Math.min(6, datos.length);
  const etiquetas = Array.from({ length: numEtiq }, (_, i) => {
    const idx = numEtiq === 1 ? 0 : Math.round(i * (datos.length - 1) / (numEtiq - 1));
    const fecha = fechas[idx]!;
    const valida = !isNaN(fecha.getTime());
    const label = valida
      ? fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
        + ' ' + fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      : '—';
    return { idx, label };
  });

  const etiquetasY = Array.from({ length: 5 }, (_, i) => {
    const t = tMin + (rango * i) / 4;
    return { t, yPos: y(t) };
  });

  return `
      <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" style="background:#f8f8f8;border-radius:8px">
        ${etiquetasY.map(e => `
          <line x1="${padL}" y1="${e.yPos.toFixed(1)}" x2="${W - padR}" y2="${e.yPos.toFixed(1)}"
            stroke="#ddd" stroke-width="1" stroke-dasharray="4"/>
          <text x="${padL - 4}" y="${(e.yPos + 4).toFixed(1)}"
            text-anchor="end" font-size="10" fill="#999">${e.t.toFixed(1)}°</text>
        `).join('')}

        ${yMinima ? `
          <line x1="${padL}" y1="${yMinima}" x2="${W - padR}" y2="${yMinima}"
            stroke="#f5a623" stroke-width="1.5" stroke-dasharray="6,3"/>
          <text x="${W - padR + 2}" y="${yMinima}" font-size="9" fill="#f5a623" dominant-baseline="middle">mín</text>
        ` : ''}

        ${yMaxima ? `
          <line x1="${padL}" y1="${yMaxima}" x2="${W - padR}" y2="${yMaxima}"
            stroke="#ff4444" stroke-width="1.5" stroke-dasharray="6,3"/>
          <text x="${W - padR + 2}" y="${yMaxima}" font-size="9" fill="#ff4444" dominant-baseline="middle">máx</text>
        ` : ''}

        <polygon
          points="${padL},${padT + alto} ${polyline} ${x(datos.length - 1).toFixed(1)},${padT + alto}"
          fill="rgba(126,211,33,0.1)"/>

        <polyline points="${polyline}"
          fill="none" stroke="#7ed321" stroke-width="2" stroke-linejoin="round"/>

        <!-- Líneas grises en gaps de datos -->
        ${segmentosGap.join('')}

        ${etiquetas.map(e => `
          <text x="${x(e.idx).toFixed(1)}" y="${H - 6}"
            text-anchor="middle" font-size="9" fill="#999">${e.label}</text>
        `).join('')}
      </svg>
    `;
}

// ── Semanas del selector de Históricos ───────────────
export interface Semana {
  label: string;
  fechaInicio: string;
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
        : `${inicio.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} — ${fin.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}`;

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

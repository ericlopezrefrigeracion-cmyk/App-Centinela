// Reportes PDF: se arma el HTML y el navegador lo imprime ("Guardar como PDF").
// El reporte es siempre claro (para imprimir), en A4, con hora de Buenos Aires en 24 h, coma decimal
// y signo menos en las temperaturas. Todo texto que viene de la API se escapa antes de meterlo.
import { detalleAlerta, infoTipo, normalizarTipo } from './alertas';
import { formatFecha, formatFechaHoraCompleta, formatNumero, formatTemp } from './formato';
import { escaparHtml, graficoPdf24h, graficoPdfSemanal, parseFecha, type Dato } from './graficos';

/** El navegador no dejó abrir la pestaña del reporte (bloqueo de ventanas emergentes). */
export class VentanaBloqueadaError extends Error {
  constructor() {
    super('Tu navegador bloqueó la pestaña del reporte. Permití las ventanas emergentes para este sitio y volvé a tocar el botón.');
    this.name = 'VentanaBloqueadaError';
  }
}

/**
 * Abre la pestaña del reporte. Hay que llamarla apenas se toca el botón (antes de cualquier espera):
 * Safari y Chrome bloquean las ventanas que se abren después de una consulta a la API.
 */
export function abrirVentanaReporte(): Window {
  const ventana = window.open('', '_blank');
  if (!ventana) throw new VentanaBloqueadaError();
  try {
    ventana.document.write('<!doctype html><meta charset="utf-8"><title>Generando reporte…</title><p style="font:16px Arial,sans-serif;padding:24px;color:#333">Generando el reporte…</p>');
  } catch {
    // Si no se puede escribir todavía, se escribe el reporte completo después
  }
  return ventana;
}

/**
 * Escribe el reporte en la pestaña y abre el diálogo de impresión, donde se elige "Guardar como PDF".
 * El título de la pestaña es el nombre sugerido del archivo.
 */
export function exportarReportePDF(html: string, nombreArchivo: string, ventana: Window = abrirVentanaReporte()) {
  const htmlConTitulo = html.replace('<head>', `<head><title>${escaparHtml(nombreArchivo)}</title>`);
  ventana.document.open();
  ventana.document.write(htmlConTitulo);
  ventana.document.close();
  ventana.focus();
  // La pestaña hereda la política de seguridad (CSP) del sitio, que no deja correr scripts sueltos:
  // el botón y el diálogo de impresión se manejan desde acá.
  const imprimir = () => ventana.print();
  ventana.document.getElementById('imprimir')?.addEventListener('click', imprimir);
  // Esperar a que la pestaña termine de dibujar: si se imprime enseguida a veces sale en blanco
  if (ventana.document.readyState === 'complete') setTimeout(imprimir, 300);
  else ventana.addEventListener('load', () => setTimeout(imprimir, 300));
}

// Colores de impresión de cada tipo de alerta (los mismos de la app en modo claro)
const COLOR_TIPO_IMPRESION: Record<string, string> = {
  temperatura: '#c62828',
  desconexion: '#5a6776',
  reconexion: '#2f7a0a',
};

function filasAlertas(alertas: any[]): string {
  return alertas.map((a) => {
    const tipo = normalizarTipo(a.tipo);
    const color = COLOR_TIPO_IMPRESION[tipo] ?? '#8a5200';
    return `<tr>
      <td class="nowrap">${escaparHtml(formatFechaHoraCompleta(a.fecha))}</td>
      <td style="color:${color};font-weight:bold">${escaparHtml(infoTipo(a.tipo).label)}</td>
      <td>${escaparHtml(detalleAlerta(a)) || '—'}</td>
      <td class="centro">${a.leida ? 'Sí' : 'No'}</td>
    </tr>`;
  }).join('');
}

function tablaAlertas(alertas: any[], sinAlertas: string): string {
  if (alertas.length === 0) return `<p class="vacio">${sinAlertas}</p>`;
  return `<table>
    <thead><tr><th>Fecha y hora</th><th>Tipo</th><th>Detalle</th><th class="centro">Vista</th></tr></thead>
    <tbody>${filasAlertas(alertas)}</tbody>
  </table>`;
}

function leyenda(minima?: number | null, maxima?: number | null, hayCortes = false): string {
  const item = (color: string, texto: string, punteada = false) =>
    `<span class="ley-item"><span class="ley-line" style="border-top:${punteada ? '2px dashed' : '3px solid'} ${color}"></span>${texto}</span>`;
  return `<div class="leyenda">
    ${item('#4e9a12', 'Temperatura registrada')}
    ${minima != null ? item('#d98a00', `Mínima permitida (${formatNumero(minima)} °C)`, true) : ''}
    ${maxima != null ? item('#c62828', `Máxima permitida (${formatNumero(maxima)} °C)`, true) : ''}
    ${hayCortes ? item('#8a96a3', 'Sin datos (desconectado)', true) : ''}
  </div>`;
}

const ESTILOS = `
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html { color-scheme: light; }
  body { font-family: Arial, Helvetica, sans-serif; color: #101820; background: #fff; margin: 0; padding: 24px; font-size: 13px; }
  @media print { body { padding: 0; } .no-imprimir { display: none !important; } }
  .barra { display: flex; justify-content: flex-end; margin-bottom: 16px; }
  .barra button { font: bold 14px Arial, sans-serif; background: #7ed321; color: #101820; border: 0; border-radius: 10px; padding: 12px 18px; cursor: pointer; }
  .encabezado { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #7ed321; padding-bottom: 10px; margin-bottom: 16px; }
  .logo { font-size: 26px; font-weight: bold; letter-spacing: -0.5px; }
  .logo span { color: #4e9a12; }
  .producto { color: #5a6776; font-size: 13px; }
  .titulo { text-align: right; }
  .titulo h1 { font-size: 18px; margin: 0 0 2px; }
  .titulo div { color: #5a6776; font-size: 12px; }
  .info { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 24px; background: #f4f6f8; border-radius: 8px; padding: 12px 14px; margin-bottom: 18px; break-inside: avoid; }
  .info b { color: #5a6776; font-weight: normal; display: block; font-size: 11px; }
  h2 { font-size: 15px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e2e7ed; break-after: avoid; }
  .bloque { break-inside: avoid; page-break-inside: avoid; }
  .stats { display: flex; gap: 12px; margin-bottom: 8px; }
  .stat { flex: 1; background: #f4f6f8; border-radius: 8px; padding: 10px; text-align: center; }
  .stat-v { font-size: 20px; font-weight: bold; }
  .stat-l { font-size: 11px; color: #5a6776; margin-top: 2px; }
  .leyenda { display: flex; flex-wrap: wrap; gap: 6px 20px; margin-top: 8px; font-size: 11px; color: #5a6776; }
  .ley-item { display: inline-flex; align-items: center; gap: 6px; }
  .ley-line { display: inline-block; width: 22px; height: 0; }
  .sin-grafico { background: #f7f9fb; border-radius: 8px; padding: 40px 12px; text-align: center; color: #5a6776; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead { display: table-header-group; }
  th { background: #f4f6f8; color: #101820; padding: 7px 10px; text-align: left; border-bottom: 2px solid #7ed321; }
  td { padding: 6px 10px; border-bottom: 1px solid #e2e7ed; vertical-align: top; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  .centro { text-align: center; }
  .nowrap { white-space: nowrap; }
  .vacio { color: #5a6776; font-style: italic; padding: 8px 0; }
  .pie { margin-top: 24px; color: #5a6776; font-size: 10px; text-align: center; }
`;

function documento(titulo: string, subtitulo: string, cuerpo: string): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>${ESTILOS}</style>
</head>
<body>
  <div class="barra no-imprimir"><button type="button" id="imprimir">Imprimir o guardar como PDF</button></div>
  <div class="encabezado">
    <div><div class="logo">tele<span>met</span></div><div class="producto">Centinela · Monitoreo de temperatura</div></div>
    <div class="titulo"><h1>${escaparHtml(titulo)}</h1><div>${escaparHtml(subtitulo)}</div></div>
  </div>
  ${cuerpo}
  <div class="pie">Generado el ${escaparHtml(formatFechaHoraCompleta(new Date()))} (hora de Buenos Aires) · Centinela · Telemet</div>
</body>
</html>`;
}

interface EquipoReporte {
  nombre?: string;
  ubicacion?: string;
  minima?: number;
  maxima?: number;
  setpoint?: number;
}

function rangoTexto(equipo: EquipoReporte | null | undefined): string {
  if (equipo?.minima == null && equipo?.maxima == null) return '—';
  return `${formatNumero(equipo?.minima)} a ${formatNumero(equipo?.maxima)} °C`;
}

function hayCortes(datos: Dato[], corteMs: number, tiempo: (d: Dato) => number): boolean {
  return datos.some((d, i) => i > 0 && tiempo(d) - tiempo(datos[i - 1]!) > corteMs);
}

// ── Reporte de las últimas 24 h (pantalla de detalle) ──
export function htmlReporte24h(equipo: EquipoReporte | null, datos: Dato[], alertas: any[], ahora: number = Date.now()): string {
  const desde = ahora - 24 * 60 * 60 * 1000;
  const cortes = hayCortes(datos, 15 * 60 * 1000, (d) => new Date(d.fecha).getTime());
  const cuerpo = `
  <div class="info">
    <div><b>Equipo</b>${escaparHtml(equipo?.nombre ?? '—')}</div>
    <div><b>Período</b>Últimas 24 horas: ${escaparHtml(formatFechaHoraCompleta(desde))} a ${escaparHtml(formatFechaHoraCompleta(ahora))}</div>
    <div><b>Rango permitido</b>${escaparHtml(rangoTexto(equipo))}</div>
    <div><b>Setpoint</b>${equipo?.setpoint != null ? `${escaparHtml(formatNumero(equipo.setpoint))} °C` : '—'}</div>
    ${equipo?.ubicacion ? `<div><b>Ubicación</b>${escaparHtml(equipo.ubicacion)}</div>` : ''}
  </div>
  ${resumen(datos)}
  <div class="bloque">
    <h2>Gráfico de temperatura</h2>
    ${graficoPdf24h(datos, equipo?.minima, equipo?.maxima)}
    ${datos.length ? leyenda(equipo?.minima, equipo?.maxima, cortes) : ''}
  </div>
  <h2>Alertas del período (${alertas.length})</h2>
  ${tablaAlertas(alertas, 'Sin alertas en las últimas 24 horas.')}`;
  return documento('Reporte de temperatura — últimas 24 h', equipo?.nombre ?? 'Equipo', cuerpo);
}

/** Mínima, promedio y máxima registradas (o "—" si no hay lecturas). */
function resumen(datos: Dato[]): string {
  const temps = datos.map((d) => Number(d.temp)).filter(Number.isFinite);
  const stat = (v: number | null, l: string) => `<div class="stat"><div class="stat-v">${v == null ? '—' : `${escaparHtml(formatTemp(v))} °C`}</div><div class="stat-l">${l}</div></div>`;
  const prom = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
  return `<div class="bloque">
    <h2>Resumen de temperatura</h2>
    <div class="stats">
      ${stat(temps.length ? Math.min(...temps) : null, 'Mínima registrada')}
      ${stat(prom, 'Promedio')}
      ${stat(temps.length ? Math.max(...temps) : null, 'Máxima registrada')}
    </div>
  </div>`;
}

/** Nombre sugerido del archivo: sin caracteres que los sistemas de archivos no aceptan. */
function nombreSeguro(nombreEquipo: string | undefined): string {
  return (nombreEquipo ?? 'Equipo').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚüÜñÑ ._-]/g, '').replace(/\s+/g, ' ').trim() || 'Equipo';
}

export function nombreReporte24h(nombreEquipo: string | undefined, ahora: number = Date.now()): string {
  return `Reporte de temperaturas - ${nombreSeguro(nombreEquipo)} - ${formatFecha(ahora).replace(/\//g, '-')}`;
}

// ── Reporte semanal (Históricos) ──
export function htmlReporteSemanal(opciones: {
  equipo: EquipoReporte | undefined;
  datos: Dato[];
  alertas: any[];
  etiquetaSemana: string;
  fechaInicio: string;
  desde?: string;
  hasta?: string;
}): string {
  const { equipo, datos, alertas, etiquetaSemana, fechaInicio, desde, hasta } = opciones;
  const periodo = desde && hasta
    ? `${formatFechaHoraCompleta(desde)} a ${formatFechaHoraCompleta(hasta)}`
    : `Desde ${fechaInicio.split('-').reverse().join('/')}`;
  const cuerpo = `
  <div class="info">
    <div><b>Equipo</b>${escaparHtml(equipo?.nombre ?? '—')}</div>
    <div><b>Semana</b>${escaparHtml(etiquetaSemana)}</div>
    <div><b>Período</b>${escaparHtml(periodo)}</div>
    <div><b>Rango permitido</b>${escaparHtml(rangoTexto(equipo))}</div>
    ${equipo?.ubicacion ? `<div><b>Ubicación</b>${escaparHtml(equipo.ubicacion)}</div>` : ''}
  </div>
  ${resumen(datos)}
  <div class="bloque">
    <h2>Gráfico de temperatura (promedio por hora)</h2>
    ${graficoPdfSemanal(datos, equipo?.minima, equipo?.maxima)}
    ${datos.length ? leyenda(equipo?.minima, equipo?.maxima, hayCortes(datos, 2 * 60 * 60 * 1000, (d) => parseFecha(d.fecha).getTime())) : ''}
  </div>
  <h2>Alertas del período (${alertas.length})</h2>
  ${tablaAlertas(alertas, 'Sin alertas durante este período.')}`;
  return documento('Reporte semanal de temperatura', equipo?.nombre ?? 'Equipo', cuerpo);
}

export function nombreReporteSemanal(nombreEquipo: string | undefined, fechaInicio: string): string {
  return `Reporte de temperaturas - ${nombreSeguro(nombreEquipo)} - ${fechaInicio}`;
}

// Reportes PDF: se arma el HTML y el navegador lo imprime ("Guardar como PDF").
import { formatFechaHora, graficoPdf24h, graficoPdfSemanal, type Dato } from './graficos';

/**
 * Abre el HTML del reporte en una pestaña nueva y dispara el diálogo de impresión del navegador,
 * donde se elige "Guardar como PDF". Sin librerías ni servidor.
 */
export function exportarReportePDF(html: string, nombreArchivo: string) {
  const ventana = window.open('', '_blank');
  if (!ventana) {
    throw new Error('El navegador bloqueó la ventana emergente. Habilitá pop-ups para este sitio e intentá de nuevo.');
  }
  const htmlConTitulo = html.replace('<head>', `<head><title>${nombreArchivo}</title>`);
  ventana.document.open();
  ventana.document.write(htmlConTitulo);
  ventana.document.close();
  ventana.focus();
  // Esperar a que la pestaña termine de pintar: si se imprime enseguida a veces sale en blanco.
  ventana.onload = () => {
    ventana.print();
  };
}

interface EquipoReporte {
  nombre?: string;
  minima?: number;
  maxima?: number;
  setpoint?: number;
}

// ── Reporte de las últimas 24 h (pantalla de detalle) ──
export function htmlReporte24h(equipo: EquipoReporte | null, datos: Dato[], alertas: any[]): string {
  const graficoSVG = graficoPdf24h(datos, equipo?.minima, equipo?.maxima);

  const filasAlertas = alertas.map(a => `
        <tr>
          <td>${formatFechaHora(a.fecha)}</td>
          <td style="text-transform:capitalize">${a.tipo}</td>
          <td>${a.descripcion}</td>
          <td style="text-align:center">${a.leida ? '✓ Sí' : '✗ No'}</td>
        </tr>
      `).join('');

  return `
        <html>
        <head>
          <meta charset="utf-8"/>
          <style>
            body    { font-family: Arial, sans-serif; padding: 24px; color: #333; margin: 0; }
            h1      { color: #7ed321; font-size: 22px; margin-bottom: 2px; }
            h2      { color: #444; font-size: 15px; margin-top: 24px; margin-bottom: 8px; border-bottom: 2px solid #7ed321; padding-bottom: 4px; }
            .sub    { color: #888; font-size: 13px; margin-bottom: 20px; }
            .info   { background: #f5f5f5; border-radius: 6px; padding: 10px 14px; font-size: 13px; color: #555; margin-bottom: 20px; line-height: 1.8; }
            .leyenda { display: flex; gap: 24px; margin-top: 8px; font-size: 11px; }
            .ley-item { display: flex; align-items: center; gap: 6px; }
            .ley-line { width: 24px; height: 2px; }
            table   { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
            th      { background: #7ed321; color: white; padding: 8px 10px; text-align: left; font-weight: bold; }
            td      { padding: 7px 10px; border-bottom: 1px solid #eee; }
            tr:nth-child(even) td { background: #fafafa; }
            .sin-alertas { color: #999; font-style: italic; padding: 12px 0; }
          </style>
        </head>
        <body>

          <!-- Encabezado -->
          <h1>Centinela · Telemet</h1>
          <div class="sub">Reporte de temperatura — ${equipo?.nombre ?? 'Equipo'}</div>

          <div class="info">
            <b>Equipo:</b> ${equipo?.nombre ?? '—'}<br/>
            <b>Período:</b> Últimas 24 horas<br/>
            <b>Rango permitido:</b> ${equipo?.minima ?? '—'}°C a ${equipo?.maxima ?? '—'}°C<br/>
            <b>Setpoint:</b> ${equipo?.setpoint ?? '—'}°C<br/>
            <b>Generado:</b> ${new Date().toLocaleString('es-AR')}
          </div>

          <!-- Gráfico -->
          <h2>Gráfico de temperatura</h2>
          ${graficoSVG}
          <div class="leyenda">
            <div class="ley-item">
              <div class="ley-line" style="background:#7ed321"></div>
              <span>Temperatura registrada</span>
            </div>
            <div class="ley-item">
              <div class="ley-line" style="background:#f5a623"></div>
              <span>Mínima permitida (${equipo?.minima ?? '—'}°C)</span>
            </div>
            <div class="ley-item">
              <div class="ley-line" style="background:#ff4444"></div>
              <span>Máxima permitida (${equipo?.maxima ?? '—'}°C)</span>
            </div>
          </div>

          <!-- Alertas -->
          <h2>Alertas del período</h2>
          ${alertas.length === 0
            ? '<p class="sin-alertas">Sin alertas en las últimas 24 horas.</p>'
            : `<table>
                <tr><th>Fecha y hora</th><th>Tipo</th><th>Descripción</th><th>Vista</th></tr>
                ${filasAlertas}
               </table>`
          }

        </body>
        </html>
      `;
}

export function nombreReporte24h(nombreEquipo: string | undefined): string {
  const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  const nombre = (nombreEquipo ?? 'Equipo').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, '').trim();
  return `Reporte de temperaturas - ${nombre} - ${fecha}`;
}

// ── Reporte semanal (Históricos) ──
export function htmlReporteSemanal(opciones: {
  equipo: EquipoReporte | undefined;
  datos: Dato[];
  alertas: any[];
  etiquetaSemana: string;
  fechaInicio: string;
}): string {
  const { equipo, datos, alertas, etiquetaSemana, fechaInicio } = opciones;
  const graficoSVG = graficoPdfSemanal(datos, equipo?.minima, equipo?.maxima);

  // Estadísticas de temperatura
  const temps = datos.map((d) => Number(d.temp));
  const tempMin = temps.length ? Math.min(...temps).toFixed(1) : '—';
  const tempMax = temps.length ? Math.max(...temps).toFixed(1) : '—';
  const tempProm = temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : '—';

  // Filas de alertas
  const filasAlertas = alertas.map((a: any) => {
    const colorTipo = a.tipo?.includes('alta') || a.tipo?.includes('temp') ? '#ff4444'
      : a.tipo?.includes('descon') ? '#4a5a6a'
      : a.tipo?.includes('reconex') ? '#7ed321' : '#f5a623';
    return `
          <tr>
            <td>${new Date(a.fecha).toLocaleString('es-AR')}</td>
            <td style="color:${colorTipo};font-weight:bold">${a.tipo ?? '—'}</td>
            <td>${a.descripcion ?? (a.valor != null ? a.valor + '°C' : '—')}</td>
            <td style="text-align:center">${a.leida ? '✓ Sí' : '✗ No'}</td>
          </tr>
        `;
  }).join('');

  return `
        <html>
        <head>
          <meta charset="utf-8"/>
          <style>
            body    { font-family: Arial, sans-serif; padding: 24px; color: #333; margin: 0; }
            h1      { color: #7ed321; font-size: 22px; margin-bottom: 2px; }
            h2      { color: #444; font-size: 15px; margin-top: 24px; margin-bottom: 8px; border-bottom: 2px solid #7ed321; padding-bottom: 4px; }
            .sub    { color: #888; font-size: 13px; margin-bottom: 20px; }
            .info   { background: #f5f5f5; border-radius: 6px; padding: 10px 14px; font-size: 13px; color: #555; margin-bottom: 20px; line-height: 1.8; }
            .stats  { display: flex; gap: 16px; margin-bottom: 20px; }
            .stat   { flex: 1; background: #f5f5f5; border-radius: 6px; padding: 10px; text-align: center; }
            .stat-v { font-size: 20px; font-weight: bold; color: #7ed321; }
            .stat-l { font-size: 11px; color: #888; margin-top: 2px; }
            .leyenda { display: flex; gap: 24px; margin-top: 8px; font-size: 11px; }
            .ley-item { display: flex; align-items: center; gap: 6px; }
            .ley-line { width: 24px; height: 2px; }
            table   { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
            th      { background: #7ed321; color: white; padding: 7px 10px; text-align: left; font-weight: bold; }
            td      { padding: 6px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
            tr:nth-child(even) td { background: #fafafa; }
            .sin-datos { color: #999; font-style: italic; padding: 12px 0; text-align: center; }
          </style>
        </head>
        <body>

          <h1>Centinela · Telemet</h1>
          <div class="sub">Reporte semanal — ${equipo?.nombre ?? 'Equipo'}</div>

          <div class="info">
            <b>Equipo:</b> ${equipo?.nombre ?? '—'}<br/>
            <b>Semana:</b> ${etiquetaSemana}<br/>
            <b>Desde:</b> ${fechaInicio}<br/>
            <b>Rango permitido:</b> ${equipo?.minima ?? '—'}°C a ${equipo?.maxima ?? '—'}°C<br/>
            <b>Generado:</b> ${new Date().toLocaleString('es-AR')}
          </div>

          <!-- Estadísticas -->
          <h2>Resumen de temperatura</h2>
          <div class="stats">
            <div class="stat">
              <div class="stat-v">${tempMin}°C</div>
              <div class="stat-l">Mínima registrada</div>
            </div>
            <div class="stat">
              <div class="stat-v">${tempProm}°C</div>
              <div class="stat-l">Promedio</div>
            </div>
            <div class="stat">
              <div class="stat-v">${tempMax}°C</div>
              <div class="stat-l">Máxima registrada</div>
            </div>
          </div>

          <!-- Gráfico -->
          <h2>Gráfico de temperatura</h2>
          ${graficoSVG}
          <div class="leyenda">
            <div class="ley-item">
              <div class="ley-line" style="background:#7ed321"></div>
              <span>Temperatura registrada</span>
            </div>
            ${equipo?.minima != null ? `
            <div class="ley-item">
              <div class="ley-line" style="background:#f5a623"></div>
              <span>Mínima permitida (${equipo.minima}°C)</span>
            </div>` : ''}
            ${equipo?.maxima != null ? `
            <div class="ley-item">
              <div class="ley-line" style="background:#ff4444"></div>
              <span>Máxima permitida (${equipo.maxima}°C)</span>
            </div>` : ''}
          </div>

          <!-- Tabla de alertas -->
          <h2>Alertas del período</h2>
          ${alertas.length === 0
            ? '<p class="sin-datos">Sin alertas durante este período.</p>'
            : `<table>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Vista</th>
                </tr>
                ${filasAlertas}
               </table>`
          }

        </body>
        </html>
      `;
}

export function nombreReporteSemanal(nombreEquipo: string | undefined, fechaInicio: string): string {
  const nombre = (nombreEquipo ?? 'Equipo').replace(/[^a-zA-Z0-9 áéíóúÁÉÍÓÚñÑ]/g, '').trim();
  return `Reporte de temperaturas - ${nombre} - ${fechaInicio}`;
}

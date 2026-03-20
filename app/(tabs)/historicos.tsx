import { Colors, FontSizes, FontWeights, Radius, Spacing } from '@/constants/theme';
import { alertaService, datosService, equipoService } from '@/services/services';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View
} from 'react-native';

const C = Colors?.centinela ?? {
  background:   '#0d1117',
  card:         '#111823',
  cardAlt:      '#0f1620',
  border:       '#1e2d3a',
  primary:      '#7ed321',
  primaryBg:    'rgba(126, 211, 33, 0.1)',
  text:         '#ffffff',
  textSub:      '#8a9ab0',
  textMuted:    '#4a5a6a',
  critico:      '#ff4444',
  white:        '#ffffff',
  black:        '#000000',
};

interface Equipo {
  id:     number;
  nombre: string;
}

// Genera las últimas 8 semanas para el selector
function generarSemanas(): { label: string; fechaInicio: string }[] {
  const semanas = [];
  const hoy = new Date();

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

    semanas.push({
      label,
      fechaInicio: inicio.toISOString().split('T')[0],
    });
  }
  return semanas;
}

export default function HistoricosScreen() {
  // Puede recibir equipoId por parámetro desde la vista principal
  const params = useLocalSearchParams<{ equipoId?: string; equipoNombre?: string }>();

  const [equipos, setEquipos]             = useState<Equipo[]>([]);
  const [equipoSeleccionado, setEquipo]   = useState<string>(params.equipoId ?? '');
  const [semanaSeleccionada, setSemana]   = useState<string>('');
  const [cargandoEquipos, setCargandoEq]  = useState(true);
  const [descargando, setDescargando]     = useState(false);

  const semanas = generarSemanas();

  useEffect(() => {
    cargarEquipos();
    // Seleccionar semana actual por defecto
    if (semanas.length > 0) setSemana(semanas[0].fechaInicio);
  }, []);

  async function cargarEquipos() {
    try {
      const data = await equipoService.getMisEquipos();
      setEquipos(data);
      // Si no viene equipoId por parámetro, seleccionar el primero
      if (!params.equipoId && data.length > 0) {
        setEquipo(String(data[0].id));
      }
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los equipos.');
    } finally {
      setCargandoEq(false);
    }
  }

  function generarGraficoSVG(datos: any[], minima?: number, maxima?: number): string {
    if (!datos || datos.length === 0) return '<p style="color:#999">Sin datos para graficar</p>';

    const W = 720, H = 260;
    const padL = 48, padR = 20, padT = 20, padB = 36;
    const ancho = W - padL - padR;
    const alto  = H - padT - padB;

    const temps = datos.map((d: any) => Number(d.temp));
    const tMin  = Math.min(...temps, minima ?? 0) - 2;
    const tMax  = Math.max(...temps, maxima ?? 0) + 2;
    const rango = tMax - tMin || 1;

    const x = (i: number) => datos.length === 1 ? padL + ancho / 2 : padL + (i / (datos.length - 1)) * ancho;
    const y = (t: number) => padT + alto - ((t - tMin) / rango) * alto;

    const polyline = datos.map((d: any, i: number) =>
      `${x(i).toFixed(1)},${y(Number(d.temp)).toFixed(1)}`
    ).join(' ');

    const yMinima = minima != null ? y(minima).toFixed(1) : null;
    const yMaxima = maxima != null ? y(maxima).toFixed(1) : null;

    const numEtiq = Math.min(6, datos.length);
    const etiquetas = Array.from({ length: numEtiq }, (_, i) => {
      const idx = numEtiq === 1 ? 0 : Math.round(i * (datos.length - 1) / (numEtiq - 1));
      const fechaStr = datos[idx].fecha;
      const fecha = new Date(fechaStr.includes('T') ? fechaStr : fechaStr + 'T00:00:00');
      const label = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
        + ' ' + fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
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

        <!-- Puntos con valor de temperatura -->
        ${datos.map((d, i) => {
          const px = x(i).toFixed(1);
          const py = y(Number(d.temp));
          const labelY = py < padT + 20 ? (py + 18).toFixed(1) : (py - 6).toFixed(1);
          return `
            <circle cx="${px}" cy="${py.toFixed(1)}" r="3" fill="#7ed321"/>
            <text x="${px}" y="${labelY}" text-anchor="middle" font-size="9" font-weight="bold" fill="#5a8a20">${Number(d.temp).toFixed(1)}°</text>
          `;
        }).join('')}

        ${etiquetas.map(e => `
          <text x="${x(e.idx).toFixed(1)}" y="${H - 6}"
            text-anchor="middle" font-size="9" fill="#999">${e.label}</text>
        `).join('')}
      </svg>
    `;
  }

  async function handleDescargar() {
    if (!equipoSeleccionado) {
      Alert.alert('Seleccioná un equipo', 'Elegí el equipo del que querés descargar los datos.');
      return;
    }
    if (!semanaSeleccionada) {
      Alert.alert('Seleccioná una semana', 'Elegí la semana que querés descargar.');
      return;
    }

    try {
      setDescargando(true);

      const semanaObj = semanas.find(s => s.fechaInicio === semanaSeleccionada);
      // Lunes 00:00:00 hora local
      const desdeLocal = new Date(semanaSeleccionada + 'T00:00:00');
      const desde = desdeLocal.toISOString();

      // Para semana actual: hasta = ahora. Para semanas pasadas: domingo 23:59:59
      const esSemanaActual = semanaSeleccionada === semanas[0]?.fechaInicio;
      let hastaFinal: string;
      if (esSemanaActual) {
        hastaFinal = new Date().toISOString();
      } else {
        const hastaLocal = new Date(semanaSeleccionada + 'T00:00:00');
        hastaLocal.setDate(hastaLocal.getDate() + 7);
        hastaLocal.setMilliseconds(-1);
        hastaFinal = hastaLocal.toISOString();
      }

      // Obtener datos históricos por día Y datos recientes para agrupar por hora
      // Cuando Carlos agregue agrupacion=hora, cambiar 'dia' por 'hora'
      const [historicoData, alertasData] = await Promise.all([
        datosService.getHistorico(equipoSeleccionado, desde, hastaFinal, 'dia'),
        alertaService.getAlertas({ soloNoLeidas: false, limit: 200 }),
      ]);

      const agrupados = historicoData?.agrupados ?? [];

      if (agrupados.length === 0) {
        Alert.alert('Sin datos', 'No hay datos registrados para este período.');
        setDescargando(false);
        return;
      }

      const datos = agrupados.map((d: any) => ({
        fecha:    d.periodo,
        temp:     Number(d.temp_promedio),
        temp_min: Number(d.temp_min),
        temp_max: Number(d.temp_max),
        rssi:     0,
      }));
      // Filtrar alertas del equipo Y del rango de fechas de la semana
      const desdeDate = new Date(desde);
      const hastaDate2 = new Date(hastaFinal);
      const alertas = alertasData.items.filter((a: any) => {
        if (a.equipo_id !== equipoSeleccionado) return false;
        const fechaAlerta = new Date(a.fecha);
        return fechaAlerta >= desdeDate && fechaAlerta <= hastaDate2;
      });
      const equipo = equipos.find(e => String(e.id) === equipoSeleccionado) as any;
      const semana = semanas.find(s => s.fechaInicio === semanaSeleccionada);

      const Print      = await import('expo-print');
      const Sharing    = await import('expo-sharing');
      const FileSystemModule = await import('expo-file-system/legacy');
      const FileSystem = FileSystemModule.default ?? FileSystemModule;

      const graficoSVG = generarGraficoSVG(datos, equipo?.minima, equipo?.maxima);

      // Estadísticas de temperatura
      const temps    = datos.map((d: any) => Number(d.temp));
      const tempMin  = temps.length ? Math.min(...temps).toFixed(1) : '—';
      const tempMax  = temps.length ? Math.max(...temps).toFixed(1) : '—';
      const tempProm = temps.length
        ? (temps.reduce((a: number, b: number) => a + b, 0) / temps.length).toFixed(1)
        : '—';

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

      const html = `
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
            <b>Semana:</b> ${semana?.label ?? ''}<br/>
            <b>Desde:</b> ${semanaSeleccionada}<br/>
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

      const { uri } = await Print.printToFileAsync({ html });

      // Renombrar el archivo con nombre descriptivo
      const nombreEquipo = (equipo?.nombre ?? 'Equipo').replace(/[^a-zA-Z0-9 áéíóúÁÉÍÓÚñÑ]/g, '').trim();
      const nombreFinal = `Reporte de temperaturas - ${nombreEquipo} - ${semanaSeleccionada}.pdf`;
      const uriNombrado = FileSystem.documentDirectory + nombreFinal;
      await FileSystem.copyAsync({ from: uri, to: uriNombrado });

      await Sharing.shareAsync(uriNombrado, {
        mimeType:    'application/pdf',
        dialogTitle: nombreFinal,
      });
    } catch {
      Alert.alert('Error', 'No se pudo generar el reporte.');
    } finally {
      setDescargando(false);
    }
  }

  if (cargandoEquipos) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.cargandoText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
    >
      <Text style={styles.descripcion}>
        Seleccioná el equipo y la semana que querés descargar como PDF.
      </Text>

      {/* Selector de equipo */}
      <Text style={styles.grupTitulo}>Equipo</Text>
      <View style={styles.opciones}>
        {equipos.map(eq => (
          <TouchableOpacity
            key={eq.id}
            style={[
              styles.opcionBtn,
              String(eq.id) === equipoSeleccionado && styles.opcionBtnActivo,
            ]}
            onPress={() => setEquipo(String(eq.id))}
            activeOpacity={0.75}
          >
            <Text style={[
              styles.opcionText,
              String(eq.id) === equipoSeleccionado && styles.opcionTextActivo,
            ]}>
              {eq.nombre}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Selector de semana */}
      <Text style={styles.grupTitulo}>Semana</Text>
      <View style={styles.opciones}>
        {semanas.map(sem => (
          <TouchableOpacity
            key={sem.fechaInicio}
            style={[
              styles.opcionBtn,
              sem.fechaInicio === semanaSeleccionada && styles.opcionBtnActivo,
            ]}
            onPress={() => setSemana(sem.fechaInicio)}
            activeOpacity={0.75}
          >
            <Text style={[
              styles.opcionText,
              sem.fechaInicio === semanaSeleccionada && styles.opcionTextActivo,
            ]}>
              {sem.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoIcono}>📄</Text>
        <Text style={styles.infoText}>
          El reporte incluye todas las lecturas de temperatura y alertas
          de la semana seleccionada en formato PDF.
        </Text>
      </View>

      {/* Botón descargar */}
      <TouchableOpacity
        style={[styles.btnDescargar, descargando && styles.btnDisabled]}
        onPress={handleDescargar}
        disabled={descargando}
        activeOpacity={0.85}
      >
        {descargando
          ? <ActivityIndicator color={C.black} />
          : <Text style={styles.btnDescargarText}>📥  Descargar PDF</Text>
        }
      </TouchableOpacity>

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  scroll: {
    padding: Spacing.lg,
  },
  centrado: {
    flex: 1,
    backgroundColor: C.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cargandoText: {
    color: C.textSub,
    fontSize: FontSizes.sm,
  },
  descripcion: {
    color: C.textSub,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  grupTitulo: {
    color: C.textSub,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  opciones: {
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  opcionBtn: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  opcionBtnActivo: {
    backgroundColor: C.primaryBg,
    borderColor: C.primary,
  },
  opcionText: {
    color: C.textSub,
    fontSize: FontSizes.md,
  },
  opcionTextActivo: {
    color: C.primary,
    fontWeight: FontWeights.bold,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: C.primaryBg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(126,211,33,0.25)',
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    alignItems: 'flex-start',
  },
  infoIcono: {
    fontSize: 16,
  },
  infoText: {
    color: C.textSub,
    fontSize: FontSizes.sm,
    flex: 1,
    lineHeight: 20,
  },
  btnDescargar: {
    backgroundColor: C.primary,
    borderRadius: Radius.full,
    padding: Spacing.md,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnDescargarText: {
    color: C.black,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
});

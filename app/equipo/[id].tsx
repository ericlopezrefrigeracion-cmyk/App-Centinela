import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Dimensions
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { Colors, FontSizes, FontWeights, Spacing, Radius } from '@/constants/theme';
import { datosService, alertaService, equipoService } from '@/services/services';

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
  normal:       '#7ed321',
  alerta:       '#f5a623',
  critico:      '#ff4444',
  desconectado: '#4a5a6a',
  white:        '#ffffff',
  black:        '#000000',
};

const ANCHO = Dimensions.get('window').width;

// ─────────────────────────────────────────────────────
//  Tipos
// ─────────────────────────────────────────────────────
interface Dato {
  fecha: string;
  temp:  number;
  rssi:  number;
}

interface Alerta {
  id:          number;
  fecha:       string;
  tipo:        string;
  descripcion: string;
}

interface Equipo {
  id:      number;
  nombre:  string;
  minima:  number;
  maxima:  number;
  estado:  string;
}

// ─────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────
function formatHora(fechaStr: string): string {
  return new Date(fechaStr).toLocaleTimeString('es-AR', {
    hour:   '2-digit',
    minute: '2-digit',
  });
}

function formatFechaHora(fechaStr: string): string {
  return new Date(fechaStr).toLocaleString('es-AR', {
    day:    '2-digit',
    month:  '2-digit',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

// ─────────────────────────────────────────────────────
//  Pantalla Datos del Equipo
// ─────────────────────────────────────────────────────
export default function DatosEquipoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [equipo, setEquipo]     = useState<Equipo | null>(null);
  const [datos, setDatos]       = useState<Dato[]>([]);
  const [alertas, setAlertas]   = useState<Alerta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    if (id) cargarTodo();
  }, [id]);

  async function cargarTodo() {
    try {
      setCargando(true);
      // Cargar equipos para encontrar el actual
      const equipos = await equipoService.getMisEquipos();
      const equipoEncontrado = equipos.find((e: any) => e.id === id);
      if (equipoEncontrado) setEquipo(equipoEncontrado);

      // Cargar datos recientes y reducir a 1 punto cada 5 minutos
      const datosRaw = await datosService.getRecientes(id);
      const hace24hs = Date.now() - 24 * 60 * 60 * 1000;
      const datosFiltrados = datosRaw.filter((d: any) => new Date(d.fecha).getTime() >= hace24hs);
      // Agrupar por intervalos de 5 minutos
      const porIntervalo: Record<string, any[]> = {};
      datosFiltrados.forEach((d: any) => {
        const t = new Date(d.fecha).getTime();
        const intervalo = Math.floor(t / (5 * 60 * 1000));
        if (!porIntervalo[intervalo]) porIntervalo[intervalo] = [];
        porIntervalo[intervalo].push(d);
      });
      const datosAgrupados = Object.values(porIntervalo)
        .sort((a, b) => new Date(a[0].fecha).getTime() - new Date(b[0].fecha).getTime())
        .map(grupo => ({
          ...grupo[0],
          temp: grupo.reduce((s: number, d: any) => s + Number(d.temp), 0) / grupo.length,
        }));
      setDatos(datosAgrupados);

      // Cargar alertas de las últimas 24hs del equipo
      const alertasData = await alertaService.getAlertas({ soloNoLeidas: false, limit: 100 });
      const ahora: number = Date.now();
      const hace24hsAlertas: number = ahora - 24 * 60 * 60 * 1000;
      const alertasEquipo = alertasData.items.filter((a: any) =>
        a.equipo_id === id && new Date(a.fecha).getTime() >= hace24hsAlertas
      );
      setAlertas(alertasEquipo);
    } catch (e) {
      Alert.alert('Error', 'No se pudieron cargar los datos del equipo.');
    } finally {
      setCargando(false);
    }
  }

  // ── Generar gráfico SVG para el PDF ───────────────
  function generarGraficoSVG(): string {
    if (datos.length === 0) return '<p style="color:#999">Sin datos para graficar</p>';

    const W = 720, H = 220;
    const padL = 48, padR = 20, padT = 20, padB = 36;
    const ancho = W - padL - padR;
    const alto  = H - padT - padB;

    const temps = datos.map(d => d.temp);
    const tMin  = Math.min(...temps, equipo?.minima ?? 0) - 2;
    const tMax  = Math.max(...temps, equipo?.maxima ?? 0) + 2;
    const rango = tMax - tMin || 1;

    // Función para convertir temp/índice a coordenadas SVG
    const x = (i: number) => padL + (i / (datos.length - 1)) * ancho;
    const y = (t: number) => padT + alto - ((t - tMin) / rango) * alto;

    // Línea de temperatura
    const polyline = datos.map((d, i) => `${x(i).toFixed(1)},${y(d.temp).toFixed(1)}`).join(' ');

    // Líneas de referencia mínima y máxima
    const yMinima = y(equipo?.minima ?? tMin).toFixed(1);
    const yMaxima = y(equipo?.maxima ?? tMax).toFixed(1);

    // Etiquetas del eje X — mostrar 6 etiquetas distribuidas
    const etiquetas = Array.from({ length: 6 }, (_, i) => {
      const idx = Math.round(i * (datos.length - 1) / 5);
      return { idx, label: formatHora(datos[idx].fecha) };
    });

    // Etiquetas del eje Y — 5 valores
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

  // ── Descargar PDF ──────────────────────────────────
  async function handleDescargarPDF() {
    try {
      setDescargando(true);

      const Print      = await import('expo-print');
      const Sharing    = await import('expo-sharing');
      const FileSystemModule = await import('expo-file-system/legacy');
      const FileSystem = FileSystemModule.default ?? FileSystemModule;

      const graficoSVG = generarGraficoSVG();

      const filasAlertas = alertas.map(a => `
        <tr>
          <td>${formatFechaHora(a.fecha)}</td>
          <td style="text-transform:capitalize">${a.tipo}</td>
          <td>${a.descripcion}</td>
          <td style="text-align:center">${a.leida ? '✓ Sí' : '✗ No'}</td>
        </tr>
      `).join('');

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

      const { uri } = await Print.printToFileAsync({ html });

      // Renombrar el archivo con nombre descriptivo
      const fecha = new Date().toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      }).replace(/\//g, '-');
      const nombreEquipo = (equipo?.nombre ?? 'Equipo').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, '').trim();
      const nombreFinal = `Reporte de temperaturas-${nombreEquipo}-${fecha}.pdf`;
      const uriNombrado = FileSystem.documentDirectory + nombreFinal;
      await FileSystem.copyAsync({ from: uri, to: uriNombrado });

      await Sharing.shareAsync(uriNombrado, {
        mimeType:    'application/pdf',
        dialogTitle: nombreFinal,
      });
    } catch (e: any) {
      Alert.alert('Error PDF', e?.message ?? String(e));
    } finally {
      setDescargando(false);
    }
  }

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.cargandoText}>Cargando datos...</Text>
      </View>
    );
  }

  // ── Preparar datos para el gráfico ────────────────
  // Usar todos los datos disponibles
  const puntos = datos;

  const temperaturas = puntos.map(d => d.temp);

  // Mostrar solo 6 etiquetas distribuidas en el eje X
  const etiquetasCompletas = puntos.map((d, i) => {
    const step = Math.max(1, Math.ceil(puntos.length / 6));
    return i % step === 0 ? formatHora(d.fecha) : '';
  });

  const hayDatos = temperaturas.length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >

      {/* Info del equipo */}
      <View style={styles.equipoInfo}>
        <Text style={styles.equipoNombre}>{equipo?.nombre}</Text>
        <Text style={styles.equipoRango}>
          Rango: {equipo?.minima}°C — {equipo?.maxima}°C
        </Text>
      </View>

      {/* ── Gráfico 24hs ── */}
      <View style={styles.seccion}>
        <View style={styles.seccionHeader}>
          <Text style={styles.seccionTitulo}>Temperatura — Últimas 24hs</Text>
        </View>

        {hayDatos ? (
          <View style={styles.graficoContainer}>
            <LineChart
              data={{
                labels: etiquetasCompletas,
                datasets: [
                  // Línea principal de temperatura — sin puntos
                  {
                    data: temperaturas,
                    color: () => C.primary,
                    strokeWidth: 2,
                    withDots: false,
                  },
                  // Línea de temperatura mínima
                  {
                    data: temperaturas.map(() => equipo?.minima ?? 0),
                    color: () => 'rgba(245, 166, 35, 0.5)',
                    strokeWidth: 1,
                    withDots: false,
                  },
                  // Línea de temperatura máxima
                  {
                    data: temperaturas.map(() => equipo?.maxima ?? 0),
                    color: () => 'rgba(255, 68, 68, 0.5)',
                    strokeWidth: 1,
                    withDots: false,
                  },
                ],
              }}
              width={ANCHO - Spacing.lg * 2 - 2}
              height={200}
              chartConfig={{
                backgroundColor:        C.card,
                backgroundGradientFrom: C.card,
                backgroundGradientTo:   C.cardAlt,
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(126, 211, 33, ${opacity})`,
                labelColor: () => C.textMuted,
                paddingRight: 0,
                style: { borderRadius: Radius.md },
                propsForDots: {
                  r: '3',
                  strokeWidth: '1',
                  stroke: C.primary,
                },
                propsForBackgroundLines: {
                  stroke: C.border,
                  strokeDasharray: '4',
                },
              }}
              bezier
              style={styles.grafico}
              withInnerLines
              withOuterLines={false}
              withVerticalLabels
              withHorizontalLabels
            />

            {/* Leyenda manual */}
            <View style={styles.leyenda}>
              <View style={styles.leyendaItem}>
                <View style={[styles.leyendaLinea, { backgroundColor: C.primary }]} />
                <Text style={styles.leyendaText}>Temperatura</Text>
              </View>
              <View style={styles.leyendaItem}>
                <View style={[styles.leyendaLinea, { backgroundColor: 'rgba(245,166,35,0.7)' }]} />
                <Text style={styles.leyendaText}>Mín: {equipo?.minima}°C</Text>
              </View>
              <View style={styles.leyendaItem}>
                <View style={[styles.leyendaLinea, { backgroundColor: 'rgba(255,68,68,0.7)' }]} />
                <Text style={styles.leyendaText}>Máx: {equipo?.maxima}°C</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.sinDatos}>
            <Text style={styles.sinDatosText}>Sin datos disponibles para las últimas 24hs</Text>
          </View>
        )}
      </View>

      {/* ── Alertas últimas 24hs ── */}
      <View style={styles.seccion}>
        <View style={styles.seccionHeader}>
          <Text style={styles.seccionTitulo}>
            Alertas — Últimas 24hs
          </Text>
          {alertas.length > 0 && (
            <View style={styles.alertaBadge}>
              <Text style={styles.alertaBadgeText}>{alertas.length}</Text>
            </View>
          )}
        </View>

        {alertas.length === 0 ? (
          <View style={styles.sinAlertas}>
            <Text style={styles.sinAlertasIcono}>✅</Text>
            <Text style={styles.sinAlertasText}>Sin alertas en las últimas 24hs</Text>
          </View>
        ) : (
          alertas.map(alerta => (
            <View key={alerta.id} style={styles.alertaItem}>
              <View style={[styles.alertaBorde, {
                backgroundColor: alerta.tipo === 'temperatura' ? C.critico : C.desconectado
              }]} />
              <View style={styles.alertaContenido}>
                <Text style={styles.alertaTipo}>{alerta.tipo?.toUpperCase()}</Text>
                <Text style={styles.alertaDesc}>{alerta.tipo} {alerta.valor ? `— ${alerta.valor}°C` : ''}</Text>
                <Text style={styles.alertaFecha}>{formatFechaHora(alerta.fecha)}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* ── Botón descargar PDF ── */}
      <TouchableOpacity
        style={[styles.btnPDF, descargando && styles.btnDisabled]}
        onPress={handleDescargarPDF}
        disabled={descargando}
        activeOpacity={0.85}
      >
        {descargando
          ? <ActivityIndicator color={C.black} />
          : <Text style={styles.btnPDFText}>📄  Descargar reporte PDF</Text>
        }
      </TouchableOpacity>

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────
//  Estilos
// ─────────────────────────────────────────────────────
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

  // Info equipo
  equipoInfo: {
    backgroundColor: C.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: Spacing.lg,
  },
  equipoNombre: {
    color: C.text,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    marginBottom: 4,
  },
  equipoRango: {
    color: C.textSub,
    fontSize: FontSizes.sm,
  },

  // Sección
  seccion: {
    backgroundColor: C.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  seccionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  seccionTitulo: {
    color: C.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },

  // Gráfico
  graficoContainer: {
    paddingTop: Spacing.sm,
    paddingBottom: 0,
  },
  grafico: {
    borderRadius: Radius.md,
  },
  leyenda: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  leyendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  leyendaLinea: {
    width: 20,
    height: 2,
  },
  leyendaText: {
    color: C.textMuted,
    fontSize: FontSizes.xs,
  },
  sinDatos: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  sinDatosText: {
    color: C.textMuted,
    fontSize: FontSizes.sm,
  },

  // Badge alertas
  alertaBadge: {
    backgroundColor: C.critico,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  alertaBadgeText: {
    color: C.white,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },

  // Sin alertas
  sinAlertas: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sinAlertasIcono: {
    fontSize: 32,
  },
  sinAlertasText: {
    color: C.textSub,
    fontSize: FontSizes.sm,
  },

  // Item alerta
  alertaItem: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  alertaBorde: {
    width: 4,
  },
  alertaContenido: {
    flex: 1,
    padding: Spacing.md,
  },
  alertaTipo: {
    color: C.critico,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  alertaDesc: {
    color: C.text,
    fontSize: FontSizes.sm,
    marginBottom: 4,
  },
  alertaFecha: {
    color: C.textMuted,
    fontSize: FontSizes.xs,
  },

  // Botón PDF
  btnPDF: {
    backgroundColor: C.primary,
    borderRadius: Radius.full,
    padding: Spacing.md,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPDFText: {
    color: C.black,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
});

import { useEffect, useState } from 'react';
import { showAlert } from '../componentes/AlertProvider';
import { Desplazable, Spinner, Tocable, useAnchoVentana } from '../componentes/ui';
import { mismoId, type EquipoApi } from '../lib/equipos';
import { e, type Estilo } from '../lib/estilo';
import { formatFechaHora, formatHora, hayCorte, procesarRecientes, segmentos, type Dato } from '../lib/graficos';
import { exportarReportePDF, htmlReporte24h, nombreReporte24h } from '../lib/reportes';
import { alertaService, datosService, equipoService } from '../lib/servicios';
import { C, FontSizes, FontWeights, Radius, Spacing } from '../lib/tema';

// ─── Gráfico de temperatura de la pantalla (no el del PDF) ───
// Los períodos desconectados se dibujan con una línea punteada gris.
const G_H = 200;
const G_PAD_L = 38; // espacio para las etiquetas del eje Y
const G_PAD_R = 14; // margen derecho para que no se corte
const G_PAD_T = 10;
const G_PAD_B = 28; // espacio para las etiquetas del eje X

function GraficoSVG({ datos, minima, maxima, width }: { datos: Dato[]; minima: number; maxima: number; width: number }) {
  if (datos.length === 0) return null;

  const W = width;
  const H = G_H;
  const cW = W - G_PAD_L - G_PAD_R;
  const cH = H - G_PAD_T - G_PAD_B;

  const temps = datos.map((d) => Number(d.temp));
  const rawMin = Math.min(...temps, minima) - 1;
  const rawMax = Math.max(...temps, maxima) + 1;
  const rng = rawMax - rawMin || 1;

  const px = (i: number) => (datos.length > 1 ? G_PAD_L + (i / (datos.length - 1)) * cW : G_PAD_L + cW / 2);
  const py = (t: number) => G_PAD_T + cH - ((t - rawMin) / rng) * cH;

  const segs = segmentos(datos);

  // Grilla Y (5 marcas)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const t = rawMin + (rng * i) / 4;
    return { t, y: py(t) };
  });

  // Etiquetas X (6 repartidas)
  const xLabels = Array.from({ length: 6 }, (_, i) => {
    const idx = Math.round((i / 5) * (datos.length - 1));
    return { idx, label: formatHora(datos[idx]!.fecha) };
  });

  return (
    // Sin fuente propia: las etiquetas usan la del navegador, como antes
    <svg width={W} height={H} style={{ fontFamily: '"Times New Roman"', display: 'block' }}>
      {yTicks.map((tick, i) => (
        <g key={`g${i}`}>
          <line x1={G_PAD_L} y1={tick.y} x2={W - G_PAD_R} y2={tick.y} stroke={C.border} strokeWidth={1} strokeDasharray="3,3" />
          <text x={G_PAD_L - 4} y={tick.y + 4} textAnchor="end" fill={C.textMuted} style={{ fontSize: 9 }}>
            {tick.t.toFixed(1)}°
          </text>
        </g>
      ))}

      {/* Mínima permitida */}
      <line x1={G_PAD_L} y1={py(minima)} x2={W - G_PAD_R} y2={py(minima)} stroke="rgba(245,166,35,0.8)" strokeWidth={1.5} strokeDasharray="5,3" />
      {/* Máxima permitida */}
      <line x1={G_PAD_L} y1={py(maxima)} x2={W - G_PAD_R} y2={py(maxima)} stroke="rgba(255,68,68,0.8)" strokeWidth={1.5} strokeDasharray="5,3" />

      {segs.map((seg, si) => {
        if (seg.kind === 'line') {
          if (seg.indices.length < 2) return null;
          const pts = seg.indices.map((i) => `${px(i).toFixed(1)},${py(temps[i]!).toFixed(1)}`).join(' ');
          return <polyline key={`l${si}`} points={pts} fill="none" stroke={C.primary} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />;
        }
        // Corte: línea punteada gris entre el último dato y el primero después de reconectar
        return (
          <line
            key={`gap${si}`}
            x1={px(seg.from)} y1={py(temps[seg.from]!)}
            x2={px(seg.to)} y2={py(temps[seg.to]!)}
            stroke="#6b7280" strokeWidth={1.5} strokeDasharray="4,4"
          />
        );
      })}

      {xLabels.map((xl, i) => (
        <text key={`x${i}`} x={px(xl.idx)} y={H - 4} textAnchor="middle" fill={C.textMuted} style={{ fontSize: 9 }}>
          {xl.label}
        </text>
      ))}
    </svg>
  );
}

// ─── Pantalla Datos del Equipo ───────────────────────
export default function EquipoDetalle({ id }: { id: string }) {
  // El contenido está acotado a 600 px, así que el gráfico nunca pasa de ese ancho
  const anchoVentana = useAnchoVentana();
  const graficoAncho = Math.min(anchoVentana, 600) - Spacing.lg * 2 - 2;

  const [equipo, setEquipo] = useState<EquipoApi | null>(null);
  const [datos, setDatos] = useState<Dato[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setCargando(true);
        const equipos = await equipoService.getMisEquipos();
        const encontrado = equipos.find((eq) => mismoId(eq.id, id));
        if (encontrado) setEquipo(encontrado);

        // Lecturas de las últimas 24 h, un punto cada 5 minutos
        const datosRaw = await datosService.getRecientes(id);
        setDatos(procesarRecientes(datosRaw));

        // Alertas del equipo de las últimas 24 h
        const alertasData = await alertaService.getAlertas({ soloNoLeidas: false, limit: 100 });
        const hace24hs = Date.now() - 24 * 60 * 60 * 1000;
        setAlertas(alertasData.items.filter((a: any) => mismoId(a.equipo_id, id) && new Date(a.fecha).getTime() >= hace24hs));
      } catch {
        showAlert('Error', 'No se pudieron cargar los datos del equipo.');
      } finally {
        setCargando(false);
      }
    })();
  }, [id]);

  function handleDescargarPDF() {
    try {
      setDescargando(true);
      exportarReportePDF(htmlReporte24h(equipo, datos, alertas), nombreReporte24h(equipo?.nombre));
    } catch (err: any) {
      showAlert('Error PDF', err?.message ?? String(err));
    } finally {
      setDescargando(false);
    }
  }

  if (cargando) {
    return (
      <div style={e(s.centrado)}>
        <Spinner tamano="large" color={C.primary} />
        <span style={e(s.cargandoText)}>Cargando datos...</span>
      </div>
    );
  }

  const hayDatos = datos.length > 0;
  const hayGap = hayCorte(datos);

  return (
    <Desplazable estilo={s.container} estiloContenido={s.scroll}>
      <div style={e(s.equipoInfo)}>
        <span style={e(s.equipoNombre)}>{equipo?.nombre}</span>
        <span style={e(s.equipoRango)}>Rango: {equipo?.minima}°C — {equipo?.maxima}°C</span>
      </div>

      {/* Gráfico 24 h */}
      <div style={e(s.seccion)}>
        <div style={e(s.seccionHeader)}>
          <span style={e(s.seccionTitulo)}>Temperatura — Últimas 24hs</span>
        </div>

        {hayDatos ? (
          <div style={e(s.graficoContainer)}>
            <GraficoSVG datos={datos} minima={equipo?.minima ?? 0} maxima={equipo?.maxima ?? 0} width={graficoAncho} />

            <div style={e(s.leyenda)}>
              <div style={e(s.leyendaItem)}>
                <div style={e(s.leyendaLinea, { backgroundColor: C.primary })} />
                <span style={e(s.leyendaText)}>Temperatura</span>
              </div>
              <div style={e(s.leyendaItem)}>
                <div style={e(s.leyendaLinea, { backgroundColor: 'rgba(245,166,35,0.7)' })} />
                <span style={e(s.leyendaText)}>Mín: {equipo?.minima}°C</span>
              </div>
              <div style={e(s.leyendaItem)}>
                <div style={e(s.leyendaLinea, { backgroundColor: 'rgba(255,68,68,0.7)' })} />
                <span style={e(s.leyendaText)}>Máx: {equipo?.maxima}°C</span>
              </div>
              {hayGap && (
                <div style={e(s.leyendaItem)}>
                  <svg width={20} height={4} style={{ display: 'block' }}>
                    <line x1={0} y1={2} x2={20} y2={2} stroke="#6b7280" strokeWidth={2} strokeDasharray="4,3" />
                  </svg>
                  <span style={e(s.leyendaText)}>Desconectado</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={e(s.sinDatos)}>
            <span style={e(s.sinDatosText)}>Sin datos disponibles para las últimas 24hs</span>
          </div>
        )}
      </div>

      {/* Alertas de las últimas 24 h */}
      <div style={e(s.seccion)}>
        <div style={e(s.seccionHeader)}>
          <span style={e(s.seccionTitulo)}>Alertas — Últimas 24hs</span>
          {alertas.length > 0 && (
            <div style={e(s.alertaBadge)}>
              <span style={e(s.alertaBadgeText)}>{alertas.length}</span>
            </div>
          )}
        </div>

        {alertas.length === 0 ? (
          <div style={e(s.sinAlertas)}>
            <span style={e(s.sinAlertasIcono)}>✅</span>
            <span style={e(s.sinAlertasText)}>Sin alertas en las últimas 24hs</span>
          </div>
        ) : (
          alertas.map((alerta) => (
            <div key={alerta.id} style={e(s.alertaItem)}>
              <div style={e(s.alertaBorde, { backgroundColor: alerta.tipo === 'temperatura' ? C.critico : C.desconectado })} />
              <div style={e(s.alertaContenido)}>
                <span style={e(s.alertaTipo)}>{alerta.tipo?.toUpperCase()}</span>
                <span style={e(s.alertaDesc)}>{alerta.tipo} {alerta.valor ? `— ${alerta.valor}°C` : ''}</span>
                <span style={e(s.alertaFecha)}>{formatFechaHora(alerta.fecha)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <Tocable estilo={[s.btnPDF, descargando && s.btnDisabled]} onPress={handleDescargarPDF} disabled={descargando} opacidadActiva={0.85}>
        {descargando ? <Spinner color={C.black} /> : <span style={e(s.btnPDFText)}>📄  Descargar reporte PDF</span>}
      </Tocable>

      <div style={{ height: Spacing.xxl }} />
    </Desplazable>
  );
}

const s: Record<string, Estilo> = {
  container: { flex: 1, backgroundColor: C.background },
  scroll: { padding: Spacing.lg, maxWidth: 600, width: '100%', alignSelf: 'center' },
  centrado: { flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  cargandoText: { color: C.textSub, fontSize: FontSizes.sm },

  equipoInfo: { backgroundColor: C.card, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: C.border, marginBottom: Spacing.lg },
  equipoNombre: { color: C.text, fontSize: FontSizes.xl, fontWeight: FontWeights.bold, marginBottom: 4 },
  equipoRango: { color: C.textSub, fontSize: FontSizes.sm },

  seccion: { backgroundColor: C.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border, marginBottom: Spacing.lg, overflow: 'hidden' },
  seccionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: C.border },
  seccionTitulo: { color: C.text, fontSize: FontSizes.md, fontWeight: FontWeights.bold },

  graficoContainer: { paddingTop: Spacing.sm, paddingBottom: 0 },
  leyenda: { flexDirection: 'row', gap: Spacing.lg, paddingHorizontal: Spacing.sm, paddingTop: Spacing.xs },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  leyendaLinea: { width: 20, height: 2 },
  leyendaText: { color: C.textMuted, fontSize: FontSizes.xs },
  sinDatos: { padding: Spacing.xl, alignItems: 'center' },
  sinDatosText: { color: C.textMuted, fontSize: FontSizes.sm },

  alertaBadge: { backgroundColor: C.critico, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  alertaBadgeText: { color: C.white, fontSize: FontSizes.xs, fontWeight: FontWeights.bold },

  sinAlertas: { padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  sinAlertasIcono: { fontSize: 32 },
  sinAlertasText: { color: C.textSub, fontSize: FontSizes.sm },

  alertaItem: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border },
  alertaBorde: { width: 4 },
  alertaContenido: { flex: 1, padding: Spacing.md },
  alertaTipo: { color: C.critico, fontSize: FontSizes.xs, fontWeight: FontWeights.bold, letterSpacing: 0.5, marginBottom: 2 },
  alertaDesc: { color: C.text, fontSize: FontSizes.sm, marginBottom: 4 },
  alertaFecha: { color: C.textMuted, fontSize: FontSizes.xs },

  btnPDF: { backgroundColor: C.primary, borderRadius: Radius.full, padding: Spacing.md, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnPDFText: { color: C.black, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
};

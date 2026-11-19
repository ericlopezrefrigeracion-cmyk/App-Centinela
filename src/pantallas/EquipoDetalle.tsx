import { useEffect, useState } from 'react';
import { showAlert } from '../componentes/AlertProvider';
import { Icono } from '../componentes/iconos';
import { Boton, Desplazable, Spinner, tarjeta, useAnchoVentana } from '../componentes/ui';
import { detalleAlerta, infoTipo } from '../lib/alertas';
import { mismoId, type EquipoApi } from '../lib/equipos';
import { e, type Estilo } from '../lib/estilo';
import { formatNumero } from '../lib/formato';
import { escalaRedonda, formatFechaHora, formatHora, hayCorte, marcasEjeX, procesarRecientes, segmentos, type Dato } from '../lib/graficos';
import { exportarReportePDF, htmlReporte24h, nombreReporte24h } from '../lib/reportes';
import { alertaService, datosService, equipoService } from '../lib/servicios';
import { C, FontSizes, FontWeights, FUENTE, Radius, Spacing } from '../lib/tema';

// ─── Gráfico de temperatura de la pantalla (no el del PDF) ───
// Los períodos desconectados se dibujan con una línea punteada gris.
const G_H = 200;
const G_PAD_L = 40; // espacio para las etiquetas del eje Y
const G_PAD_R = 22; // margen derecho: la última hora queda centrada en su marca sin cortarse
const G_PAD_T = 10;
const G_PAD_B = 26; // espacio para las etiquetas del eje X

function GraficoSVG({ datos, minima, maxima, width }: { datos: Dato[]; minima: number; maxima: number; width: number }) {
  if (datos.length === 0) return null;

  const W = width;
  const H = G_H;
  const cW = W - G_PAD_L - G_PAD_R;
  const cH = H - G_PAD_T - G_PAD_B;

  const temps = datos.map((d) => Number(d.temp));
  // Eje Y con valores redondos (0°, 2°, 4°…) que cubren las lecturas y el rango permitido
  const escala = escalaRedonda(Math.min(...temps, minima) - 0.5, Math.max(...temps, maxima) + 0.5);
  const rawMin = escala.desde;
  const rawMax = escala.hasta;
  const rng = rawMax - rawMin || 1;

  const px = (i: number) => (datos.length > 1 ? G_PAD_L + (i / (datos.length - 1)) * cW : G_PAD_L + cW / 2);
  const py = (t: number) => G_PAD_T + cH - ((t - rawMin) / rng) * cH;

  const segs = segmentos(datos);

  // Grilla Y: una línea por paso de la escala
  const yTicks = Array.from({ length: Math.round(rng / escala.paso) + 1 }, (_, i) => {
    const t = rawMin + escala.paso * i;
    return { t, y: py(t) };
  });

  // Etiquetas X en 24 h ("15:00"): tantas como entren sin amontonarse
  const xLabels = marcasEjeX(datos.length, cW, 64).map((idx) => ({ idx, label: formatHora(datos[idx]!.fecha) }));

  return (
    <svg width={W} height={H} style={{ fontFamily: FUENTE, display: 'block' }} role="img" aria-label="Gráfico de temperatura de las últimas 24 horas">
      {yTicks.map((tick, i) => (
        <g key={`g${i}`}>
          <line x1={G_PAD_L} y1={tick.y} x2={W - G_PAD_R} y2={tick.y} stroke={C.graficoGrilla} strokeWidth={1} />
          <text x={G_PAD_L - 6} y={tick.y + 4} textAnchor="end" fill={C.textSub} style={{ fontSize: 11 }}>
            {formatNumero(tick.t)}°
          </text>
        </g>
      ))}

      {/* Mínima permitida */}
      <line x1={G_PAD_L} y1={py(minima)} x2={W - G_PAD_R} y2={py(minima)} stroke={C.ambarPunto} strokeWidth={1.5} strokeDasharray="5,3" />
      {/* Máxima permitida */}
      <line x1={G_PAD_L} y1={py(maxima)} x2={W - G_PAD_R} y2={py(maxima)} stroke={C.rojoPunto} strokeWidth={1.5} strokeDasharray="5,3" />

      {segs.map((seg, si) => {
        if (seg.kind === 'line') {
          if (seg.indices.length < 2) return null;
          const pts = seg.indices.map((i) => `${px(i).toFixed(1)},${py(temps[i]!).toFixed(1)}`).join(' ');
          return <polyline key={`l${si}`} points={pts} fill="none" stroke={C.graficoLinea} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />;
        }
        // Corte: línea punteada gris entre el último dato y el primero después de reconectar
        return (
          <line
            key={`gap${si}`}
            x1={px(seg.from)} y1={py(temps[seg.from]!)}
            x2={px(seg.to)} y2={py(temps[seg.to]!)}
            stroke={C.graficoCorte} strokeWidth={1.5} strokeDasharray="4,4"
          />
        );
      })}

      {xLabels.map((xl, i) => (
        <text key={`x${i}`} x={px(xl.idx)} y={H - 6} textAnchor="middle" fill={C.textSub} style={{ fontSize: 11 }}>
          {xl.label}
        </text>
      ))}
    </svg>
  );
}

function ItemLeyenda({ color, punteada, children }: { color: string; punteada?: boolean; children: string }) {
  return (
    <div style={e(s.leyendaItem)}>
      <svg width={18} height={4} style={{ display: 'block' }} aria-hidden="true">
        <line x1={0} y1={2} x2={18} y2={2} stroke={color} strokeWidth={punteada ? 2 : 3} strokeDasharray={punteada ? '4,3' : undefined} />
      </svg>
      <span style={e(s.leyendaText)}>{children}</span>
    </div>
  );
}

// ─── Pantalla Datos del equipo ───────────────────────
export default function EquipoDetalle({ id }: { id: string }) {
  // El contenido está acotado a 600 px (con 16 px de margen a cada lado y el borde de la tarjeta)
  const anchoVentana = useAnchoVentana();
  const graficoAncho = Math.min(anchoVentana, 600) - Spacing.md * 2 - 2;

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
      showAlert('No se pudo abrir el reporte', err?.message ?? String(err));
    } finally {
      setDescargando(false);
    }
  }

  if (cargando) {
    return (
      <div style={e(s.centrado)}>
        <Spinner tamano="large" />
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
        <span style={e(s.equipoRango)}>Rango {formatNumero(equipo?.minima)} a {formatNumero(equipo?.maxima)} °C</span>
      </div>

      {/* Gráfico 24 h */}
      <div style={e(s.seccion)}>
        <div style={e(s.seccionHeader)}>
          <span style={e(s.seccionTitulo)}>Temperatura — Últimas 24hs</span>
        </div>

        {hayDatos ? (
          <div style={e(s.graficoContainer)}>
            <GraficoSVG datos={datos} minima={equipo?.minima ?? 0} maxima={equipo?.maxima ?? 0} width={graficoAncho} />

            {/* La leyenda pasa a dos líneas si no entra */}
            <div style={e(s.leyenda)}>
              <ItemLeyenda color={C.graficoLinea}>Temperatura</ItemLeyenda>
              <ItemLeyenda color={C.ambarPunto} punteada>{`Mín: ${formatNumero(equipo?.minima)} °C`}</ItemLeyenda>
              <ItemLeyenda color={C.rojoPunto} punteada>{`Máx: ${formatNumero(equipo?.maxima)} °C`}</ItemLeyenda>
              {hayGap && <ItemLeyenda color={C.graficoCorte} punteada>Desconectado</ItemLeyenda>}
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
            <Icono nombre="checkCirculo" tamano={28} color={C.verde} />
            <span style={e(s.sinAlertasText)}>Sin alertas en las últimas 24hs</span>
          </div>
        ) : (
          alertas.map((alerta, i) => {
            const info = infoTipo(alerta.tipo);
            const detalle = detalleAlerta(alerta);
            return (
              <div key={alerta.id} style={e(s.alertaItem, i === alertas.length - 1 && { borderBottomWidth: 0 })}>
                <div style={e(s.alertaIcono, { backgroundColor: info.fondo, color: info.color })}>
                  <Icono nombre={info.icono} tamano={18} />
                </div>
                <div style={e(s.alertaContenido)}>
                  <span style={e(s.alertaTipo, { color: info.color })}>{info.label}</span>
                  {detalle ? <span style={e(s.alertaDesc)}>{detalle}</span> : null}
                  <span style={e(s.alertaFecha)}>{formatFechaHora(alerta.fecha)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Boton icono="documento" onPress={handleDescargarPDF} cargando={descargando}>Descargar reporte PDF</Boton>

      <div style={{ height: Spacing.xxl }} />
    </Desplazable>
  );
}

const s: Record<string, Estilo> = {
  container: { flex: 1, backgroundColor: C.background },
  scroll: { padding: Spacing.md, paddingTop: 4, maxWidth: 600, width: '100%', alignSelf: 'center' },
  centrado: { flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  cargandoText: { color: C.textSub, fontSize: FontSizes.sm },

  equipoInfo: { ...tarjeta, padding: Spacing.md, marginBottom: 12, gap: 2 },
  equipoNombre: { color: C.text, fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
  equipoRango: { color: C.textSub, fontSize: FontSizes.sm },

  seccion: { ...tarjeta, marginBottom: 12, overflow: 'hidden' },
  seccionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: 14, paddingBottom: 6 },
  seccionTitulo: { color: C.text, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },

  graficoContainer: { paddingTop: Spacing.sm, paddingBottom: 14 },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.md, rowGap: 6, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leyendaText: { color: C.textSub, fontSize: FontSizes.xs, whiteSpace: 'nowrap' },
  sinDatos: { padding: Spacing.xl, alignItems: 'center' },
  sinDatosText: { color: C.textSub, fontSize: FontSizes.sm, textAlign: 'center' },

  alertaBadge: { backgroundColor: C.control, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 2 },
  alertaBadgeText: { color: C.text, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },

  sinAlertas: { padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm },
  sinAlertasText: { color: C.textSub, fontSize: FontSizes.sm },

  alertaItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  alertaIcono: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  alertaContenido: { flex: 1, gap: 2 },
  alertaTipo: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  alertaDesc: { color: C.text, fontSize: FontSizes.sm },
  alertaFecha: { color: C.textSub, fontSize: FontSizes.xs },
};

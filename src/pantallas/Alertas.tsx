import { useCallback, useEffect, useState } from 'react';
import { showAlert } from '../componentes/AlertProvider';
import { useTirarParaRefrescar } from '../componentes/TirarParaRefrescar';
import { Desplazable, Spinner, Tocable } from '../componentes/ui';
import { equiposConAlertasSinVer, formatFecha, infoTipo, listaDeAlertas, mapearAlertas, type Alerta } from '../lib/alertas';
import { e, type Estilo } from '../lib/estilo';
import { alertaService, equipoService } from '../lib/servicios';
import { C, FontSizes, FontWeights, Radius, Spacing } from '../lib/tema';

// ─── Fila de alerta ──────────────────────────────────
function AlertaItem({ alerta, onMarcarVista }: { alerta: Alerta; onMarcarVista: (id: number) => void }) {
  const info = infoTipo(alerta.tipo);
  return (
    <div style={e(s.item, !alerta.vista && s.itemNoVista)}>
      {/* Indicador lateral de color */}
      <div style={e(s.itemBorde, { backgroundColor: info.color })} />

      <div style={e(s.itemIcono, { backgroundColor: info.color + '22' })}>
        <span style={e(s.itemIconoText)}>{info.icono}</span>
      </div>

      <div style={e(s.itemContenido)}>
        <div style={e(s.itemHeader)}>
          <div style={e(s.tipoBadge, { backgroundColor: info.color + '22', borderColor: info.color })}>
            <span style={e(s.tipoText, { color: info.color })}>{info.label}</span>
          </div>
        </div>
        <span style={e(s.equipoNombre)}>{alerta.equipo}</span>
        <span style={e(s.descripcion)}>{alerta.descripcion}</span>
        <span style={e(s.fecha)}>{formatFecha(alerta.fecha)}</span>
      </div>

      {!alerta.vista && (
        <Tocable estilo={s.vistaBtn} onPress={() => onMarcarVista(alerta.id)} opacidadActiva={0.75} etiqueta="Marcar como vista">
          <span style={e(s.vistaBtnText)}>✓</span>
        </Tocable>
      )}
    </div>
  );
}

// ─── Pantalla Alertas ────────────────────────────────
export default function Alertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarAlertas = useCallback(async (esRefresh = false) => {
    try {
      if (esRefresh) setRefrescando(true);
      else setCargando(true);
      setError(null);
      // Alertas y equipos en paralelo, para mostrar el nombre de cada equipo
      const [data, equipos] = await Promise.all([alertaService.getAlertas(), equipoService.getMisEquipos()]);
      setAlertas(mapearAlertas(listaDeAlertas(data), equipos));
    } catch {
      setError('No se pudieron cargar las alertas.');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => { void cargarAlertas(); }, [cargarAlertas]);

  const { ref, indicador } = useTirarParaRefrescar(() => cargarAlertas(true), refrescando);

  async function handleMarcarVista(id: number) {
    try {
      await alertaService.marcarLeida(id);
      setAlertas((prev) => prev.map((a) => (a.id === id ? { ...a, vista: true, leida: true } : a)));
    } catch {
      showAlert('Error', 'No se pudo marcar la alerta como vista.');
    }
  }

  // Marcar todas como vistas: un pedido por equipo
  function handleMarcarTodas() {
    showAlert('Marcar todas como vistas', '¿Querés marcar todas las alertas como vistas?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          try {
            await Promise.all(equiposConAlertasSinVer(alertas).map((id) => alertaService.marcarTodasLeidas(id)));
            setAlertas((prev) => prev.map((a) => ({ ...a, vista: true })));
          } catch {
            showAlert('Error', 'No se pudieron marcar las alertas.');
          }
        },
      },
    ]);
  }

  const cantNoVistas = alertas.filter((a) => !a.vista).length;

  if (cargando) {
    return (
      <div style={e(s.centrado)}>
        <Spinner tamano="large" color={C.primary} />
        <span style={e(s.cargandoText)}>Cargando alertas...</span>
      </div>
    );
  }

  return (
    <div style={e(s.container)}>
      <div style={e(s.header)}>
        <div>
          <span style={e(s.headerTitulo)}>Alertas</span>
          {cantNoVistas > 0 && <span style={e(s.headerSub)}>{cantNoVistas} sin leer</span>}
        </div>
        {cantNoVistas > 0 && (
          <Tocable estilo={s.marcarTodasBtn} onPress={handleMarcarTodas} opacidadActiva={0.75}>
            <span style={e(s.marcarTodasText)}>Marcar todas</span>
          </Tocable>
        )}
      </div>

      {error && (
        <div style={e(s.errorBanner)}>
          <span style={e(s.errorText)}>⚠️ {error}</span>
          <Tocable onPress={() => cargarAlertas()}>
            <span style={e(s.errorRetry)}>Reintentar</span>
          </Tocable>
        </div>
      )}

      <Desplazable ref={ref} estiloContenido={[s.lista, s.listaAncha]} arriba={indicador}>
        {alertas.length === 0 ? (
          <div style={e(s.vacio)}>
            <span style={e(s.vacioIcono)}>🔕</span>
            <span style={e(s.vacioTitulo)}>Sin alertas</span>
            <span style={e(s.vacioSub)}>
              No tenés alertas pendientes.{'\n'}
              Todo está funcionando correctamente.
            </span>
          </div>
        ) : (
          alertas.map((a) => (
            <div key={String(a.id)}>
              <AlertaItem alerta={a} onMarcarVista={handleMarcarVista} />
            </div>
          ))
        )}
      </Desplazable>
    </div>
  );
}

const s: Record<string, Estilo> = {
  container: { flex: 1, backgroundColor: C.background },
  centrado: { flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  cargandoText: { color: C.textSub, fontSize: FontSizes.sm },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: Spacing.md,
    backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitulo: { color: C.text, fontSize: FontSizes.xxl, fontWeight: FontWeights.bold },
  headerSub: { color: C.critico, fontSize: FontSizes.sm, marginTop: 2 },
  marcarTodasBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, borderWidth: 1, borderColor: C.primary },
  marcarTodasText: { color: C.primary, fontSize: FontSizes.sm, fontWeight: FontWeights.medium },

  errorBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,68,68,0.1)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,68,68,0.3)',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  errorText: { color: C.critico, fontSize: FontSizes.sm, flex: 1 },
  errorRetry: { color: C.primary, fontSize: FontSizes.sm, fontWeight: FontWeights.bold },

  // Es un listado cronológico: en pantallas anchas se acota el ancho en vez de pasar a grilla
  lista: { padding: Spacing.md, paddingBottom: 40 },
  listaAncha: { maxWidth: 800, width: '100%', alignSelf: 'center' },

  item: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: Radius.lg,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  itemNoVista: { borderColor: 'rgba(126, 211, 33, 0.2)', backgroundColor: 'rgba(126, 211, 33, 0.03)' },
  itemBorde: { width: 4, alignSelf: 'stretch' },
  itemIcono: { width: 42, height: 42, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', margin: Spacing.sm },
  itemIconoText: { fontSize: 20 },
  itemContenido: { flex: 1, paddingVertical: Spacing.sm, paddingRight: Spacing.sm },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 4 },
  tipoBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1 },
  tipoText: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold, letterSpacing: 0.5 },
  equipoNombre: { color: C.text, fontSize: FontSizes.md, fontWeight: FontWeights.bold, marginBottom: 2 },
  descripcion: { color: C.textSub, fontSize: FontSizes.sm, lineHeight: 18, marginBottom: 4 },
  fecha: { color: C.textMuted, fontSize: FontSizes.xs },

  vistaBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.primaryBg, borderWidth: 1, borderColor: C.primary,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm,
  },
  vistaBtnText: { color: C.primary, fontSize: FontSizes.md, fontWeight: FontWeights.bold },

  vacio: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  vacioIcono: { fontSize: 48 },
  vacioTitulo: { color: C.text, fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
  vacioSub: { color: C.textSub, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 22 },
};

import { useCallback, useEffect, useState } from 'react';
import { showAlert } from '../componentes/AlertProvider';
import { Icono } from '../componentes/iconos';
import { TituloPestana } from '../componentes/navegacion';
import { RecargaDePantalla } from '../componentes/RecargaDePantalla';
import { AvisoError, BotonIcono, Desplazable, Spinner, Tocable, tarjeta } from '../componentes/ui';
import { equiposConAlertasSinVer, formatFecha, infoTipo, listaDeAlertas, mapearAlertas, type Alerta } from '../lib/alertas';
import { e, type Estilo } from '../lib/estilo';
import { formatHora24 } from '../lib/formato';
import { alertaService, equipoService } from '../lib/servicios';
import { C, FontSizes, FontWeights, Radius, Spacing, TOQUE } from '../lib/tema';

// ─── Fila de alerta ──────────────────────────────────
function AlertaItem({ alerta, onMarcarVista }: { alerta: Alerta; onMarcarVista: (id: number) => void }) {
  const info = infoTipo(alerta.tipo);
  return (
    <div style={e(s.item)}>
      <div style={e(s.itemIcono, { backgroundColor: info.fondo, color: info.color })}>
        <Icono nombre={info.icono} tamano={20} />
      </div>

      <div style={e(s.itemContenido)}>
        <div style={e(s.itemHeader)}>
          {!alerta.vista && <div style={e(s.puntoNueva)} aria-label="Sin leer" role="img" />}
          <span style={e(s.tipoText, { color: info.color })}>{info.label}</span>
        </div>
        <span style={e(s.equipoNombre, !alerta.vista && { fontWeight: FontWeights.bold })}>{alerta.equipo}</span>
        {alerta.descripcion ? <span style={e(s.descripcion)}>{alerta.descripcion}</span> : null}
        <span style={e(s.fecha)}>{formatFecha(alerta.fecha)}</span>
      </div>

      {!alerta.vista && (
        <BotonIcono icono="check" etiqueta="Marcar como vista" onPress={() => onMarcarVista(alerta.id)} color={C.verde} />
      )}
    </div>
  );
}

// ─── Pantalla Alertas ────────────────────────────────
export default function Alertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Hora de la última actualización que salió bien (ESTANDARES D6); en ámbar si la última falló
  const [actualizado, setActualizado] = useState<number | null>(null);

  const cargarAlertas = useCallback(async (esRefresh = false) => {
    try {
      if (!esRefresh) setCargando(true);
      setError(null);
      // Alertas y equipos en paralelo, para mostrar el nombre de cada equipo
      const [data, equipos] = await Promise.all([alertaService.getAlertas(), equipoService.getMisEquipos()]);
      setAlertas(mapearAlertas(listaDeAlertas(data), equipos));
      setActualizado(Date.now());
    } catch {
      setError('No se pudieron cargar las alertas.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargarAlertas(); }, [cargarAlertas]);


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
        <Spinner tamano="large" />
        <span style={e(s.cargandoText)}>Cargando alertas...</span>
      </div>
    );
  }

  return (
    <div style={e(s.container)}>
      <TituloPestana
        titulo="Alertas"
        sub={(
          <>
            {cantNoVistas > 0 && <span style={{ color: C.textSub }}>{cantNoVistas} sin leer · </span>}
            {actualizado != null && <span style={{ color: error ? C.ambar : C.textSub }}>Act. {formatHora24(actualizado)}</span>}
          </>
        )}
        derecha={(
          <div style={e(s.botonesHeader)}>
            {/* En el celular no va: se actualiza tirando la pantalla hacia abajo (D6) */}
            <div className="tpa-oculto-celular">
              <BotonIcono icono="actualizar" etiqueta="Actualizar" onPress={() => cargarAlertas(true)} fondo={C.card} borde={C.border} color={C.textSub} />
            </div>
            {cantNoVistas > 0 && (
              <Tocable estilo={s.marcarTodasBtn} onPress={handleMarcarTodas} opacidadActiva={0.6}>
                <Icono nombre="check" tamano={16} />
                <span style={e(s.marcarTodasText)}>Marcar todas</span>
              </Tocable>
            )}
          </div>
        )}
      />

      {error && <AvisoError texto={error} onReintentar={() => cargarAlertas()} />}

      <RecargaDePantalla ruta="/alertas" recargar={() => cargarAlertas(true)} />
      <Desplazable estiloContenido={[s.lista, s.listaAncha]}>
        {alertas.length === 0 ? (
          <div style={e(s.vacio)}>
            <div style={e(s.vacioIcono)}><Icono nombre="campanaApagada" tamano={28} /></div>
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

  botonesHeader: { flexDirection: 'row', gap: Spacing.sm },
  marcarTodasBtn: {
    minHeight: TOQUE, paddingHorizontal: 14, borderRadius: Radius.md, backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    flexDirection: 'row', alignItems: 'center', gap: 6, color: C.text, flexShrink: 0,
  },
  marcarTodasText: { color: C.text, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },

  // Es un listado cronológico: en pantallas anchas se acota el ancho en vez de pasar a grilla
  lista: { paddingHorizontal: Spacing.md, paddingBottom: 24 },
  listaAncha: { maxWidth: 800, width: '100%', alignSelf: 'center' },

  item: { ...tarjeta, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingLeft: 14, marginBottom: Spacing.sm },
  itemIcono: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  itemContenido: { flex: 1, gap: 2, minWidth: 0 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  puntoNueva: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
  tipoText: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  equipoNombre: { color: C.text, fontSize: FontSizes.md, fontWeight: FontWeights.medium },
  descripcion: { color: C.text, fontSize: FontSizes.sm },
  fecha: { color: C.textSub, fontSize: FontSizes.xs },

  vacio: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  vacioIcono: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.card, color: C.textSub, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  vacioTitulo: { color: C.text, fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
  vacioSub: { color: C.textSub, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 22 },
};

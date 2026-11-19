import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { showAlert } from '../componentes/AlertProvider';
import { useTirarParaRefrescar } from '../componentes/TirarParaRefrescar';
import { Desplazable, Spinner, Tocable, useBreakpoint } from '../componentes/ui';
import { useAuth } from '../contexto/AuthContext';
import { alCambiarEquipos, colorEstado, infoSenal, labelEstado, prepararEquipos, type Equipo } from '../lib/equipos';
import { e, type Estilo } from '../lib/estilo';
import { equipoService } from '../lib/servicios';
import { C, FontSizes, FontWeights, Radius, Spacing, sombra } from '../lib/tema';

/** Cada cuánto se actualiza la lista sola mientras la pestaña está visible. */
const INTERVALO_MS = 60000;

// ─── Tarjeta de equipo ───────────────────────────────
function EquipoCard({ equipo }: { equipo: Equipo }) {
  const navigate = useNavigate();
  const col = colorEstado(equipo.estado);
  const senal = infoSenal(equipo.senal);
  const label = labelEstado(equipo.estado);

  return (
    <div style={e(s.card, { borderLeftColor: col })}>
      <div style={e(s.cardHeader)}>
        <div style={e(s.cardTitleRow)}>
          <div style={e(s.statusDot, { backgroundColor: col })} />
          <span style={e(s.cardName)}>{equipo.nombre}</span>
        </div>
        <div style={e(s.estadoBadge, { backgroundColor: col + '22', borderColor: col })}>
          <span style={e(s.estadoText, { color: col })}>{label}</span>
        </div>
      </div>

      <div style={e(s.tempRow)}>
        <span style={e(s.tempValue, { color: col })}>
          {equipo.temperatura != null ? `${Number(equipo.temperatura).toFixed(1)}°C` : '---'}
        </span>
        <span style={e(s.tempLabel)}>temperatura actual</span>
      </div>

      <div style={e(s.senalRow)}>
        <span style={e(s.senalIcono, { color: senal.color })}>{senal.icono}</span>
        <span style={e(s.senalTexto, { color: senal.color })}>{senal.texto}</span>
      </div>

      {equipo.ultimaConexion && (
        <span style={e(s.ultimaConexion)}>
          Última conexión: {new Date(equipo.ultimaConexion).toLocaleString('es-AR')}
        </span>
      )}

      <div style={e(s.cardActions)}>
        <Tocable estilo={s.actionBtn} onPress={() => navigate(`/equipo/${equipo.id}`)} opacidadActiva={0.75}>
          <span style={e(s.actionIcon)}>📊</span>
          <span style={e(s.actionText)}>Ver datos</span>
        </Tocable>
        <Tocable estilo={s.actionBtn} onPress={() => navigate(`/equipo/configurar/${equipo.id}`)} opacidadActiva={0.75}>
          <span style={e(s.actionIcon)}>⚙️</span>
          <span style={e(s.actionText)}>Configurar</span>
        </Tocable>
      </div>
    </div>
  );
}

// ─── Pantalla principal ──────────────────────────────
export default function Equipos() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const { esMobile, esTablet } = useBreakpoint();
  const numColumns = esMobile ? 1 : esTablet ? 2 : 3;
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarEquipos = useCallback(async (esRefresh = false) => {
    try {
      if (esRefresh) setRefrescando(true);
      else setCargando(true);
      setError(null);
      const data = await equipoService.getMisEquipos();
      setEquipos(prepararEquipos(data));
    } catch {
      setError('No se pudieron cargar los equipos. Revisá tu conexión.');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => { void cargarEquipos(); }, [cargarEquipos]);

  // Al agregar, editar o eliminar un equipo en otra pantalla
  useEffect(() => alCambiarEquipos(() => { void cargarEquipos(true); }), [cargarEquipos]);

  // Se actualiza sola cada 60 segundos; con la pestaña oculta se pausa y al volver refresca enseguida
  useEffect(() => {
    let intervalo: ReturnType<typeof setInterval> | null = null;
    const iniciar = () => { intervalo = setInterval(() => cargarEquipos(true), INTERVALO_MS); };
    const detener = () => {
      if (intervalo) {
        clearInterval(intervalo);
        intervalo = null;
      }
    };
    const cambioVisibilidad = () => {
      if (document.visibilityState === 'visible') {
        void cargarEquipos(true);
        detener();
        iniciar();
      } else {
        detener();
      }
    };
    if (document.visibilityState === 'visible') iniciar();
    document.addEventListener('visibilitychange', cambioVisibilidad);
    return () => {
      detener();
      document.removeEventListener('visibilitychange', cambioVisibilidad);
    };
  }, [cargarEquipos]);

  const { ref, indicador } = useTirarParaRefrescar(() => cargarEquipos(true), refrescando);

  function handleLogout() {
    showAlert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
    ]);
  }

  if (cargando) {
    return (
      <div style={e(s.centrado)}>
        <Spinner tamano="large" color={C.primary} />
        <span style={e(s.cargandoText)}>Cargando equipos...</span>
      </div>
    );
  }

  // Grilla de 1, 2 o 3 columnas según el ancho
  const filas: Equipo[][] = [];
  for (let i = 0; i < equipos.length; i += numColumns) filas.push(equipos.slice(i, i + numColumns));

  return (
    <div style={e(s.container)}>
      <div style={e(s.header)}>
        <div>
          <span style={e(s.headerGreeting)}>Hola, {usuario?.nombre ?? 'Usuario'}</span>
          <div style={e(s.logoRow)}>
            <span style={e(s.logoTele)}>tele</span>
            <span style={e(s.logoMet)}>met</span>
            <span style={e(s.logoCentinela)}> · Centinela</span>
          </div>
        </div>
        <Tocable onPress={handleLogout} estilo={s.logoutBtn}>
          <span style={e(s.logoutText)}>Salir</span>
        </Tocable>
      </div>

      {error && (
        <div style={e(s.errorBanner)}>
          <span style={e(s.errorBannerText)}>⚠️ {error}</span>
          <Tocable onPress={() => cargarEquipos()}>
            <span style={e(s.errorBannerRetry)}>Reintentar</span>
          </Tocable>
        </div>
      )}

      <Desplazable ref={ref} estiloContenido={[s.lista, s.listaAncha]} arriba={indicador}>
        {equipos.length === 0 ? (
          <div style={e(s.vacio)}>
            <span style={e(s.vacioIcono)}>🌡️</span>
            <span style={e(s.vacioTitulo)}>Sin equipos</span>
            <span style={e(s.vacioSub)}>
              Todavía no tenés equipos agregados.{'\n'}
              Tocá el botón + para agregar uno.
            </span>
          </div>
        ) : numColumns === 1 ? (
          // Cada tarjeta va en su celda, como en la lista anterior
          equipos.map((eq) => <div key={String(eq.id)}><EquipoCard equipo={eq} /></div>)
        ) : (
          filas.map((fila, i) => (
            <div key={i}>
              <div style={e(s.fila)}>
                {fila.map((eq) => <EquipoCard key={String(eq.id)} equipo={eq} />)}
              </div>
            </div>
          ))
        )}
      </Desplazable>

      <Tocable estilo={s.fab} onPress={() => navigate('/equipo/agregar')} opacidadActiva={0.85} etiqueta="Agregar equipo">
        <span style={e(s.fabText)}>+</span>
      </Tocable>
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
  headerGreeting: { color: C.textSub, fontSize: FontSizes.sm, marginBottom: 2 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoTele: { color: C.text, fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
  logoMet: { color: C.primary, fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
  logoCentinela: { color: C.textSub, fontSize: FontSizes.md },
  logoutBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, borderWidth: 1, borderColor: C.border },
  logoutText: { color: C.textSub, fontSize: FontSizes.sm },

  errorBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,68,68,0.1)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,68,68,0.3)',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  errorBannerText: { color: C.critico, fontSize: FontSizes.sm, flex: 1 },
  errorBannerRetry: { color: C.primary, fontSize: FontSizes.sm, fontWeight: FontWeights.bold, marginLeft: Spacing.sm },

  lista: { padding: Spacing.md, paddingBottom: 100 },
  // En pantallas anchas la grilla queda centrada en vez de ir de punta a punta
  listaAncha: { maxWidth: 1200, width: '100%', alignSelf: 'center' },
  fila: { flexDirection: 'row', gap: Spacing.md },

  card: {
    flex: 1, backgroundColor: C.card, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: C.border, borderLeftWidth: 4, boxShadow: sombra,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cardName: { color: C.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold, flex: 1 },
  estadoBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1 },
  estadoText: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold, letterSpacing: 0.5 },

  tempRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm, marginBottom: Spacing.sm },
  tempValue: { fontSize: FontSizes.xxxl, fontWeight: FontWeights.bold },
  tempLabel: { color: C.textMuted, fontSize: FontSizes.xs },

  senalRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  senalIcono: { fontSize: FontSizes.sm, letterSpacing: -2 },
  senalTexto: { fontSize: FontSizes.sm },
  ultimaConexion: { color: C.textMuted, fontSize: FontSizes.xs, marginBottom: Spacing.sm },

  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border, paddingTop: Spacing.sm, marginTop: Spacing.xs, gap: Spacing.xs },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.xs, borderRadius: Radius.sm, backgroundColor: C.cardAlt, gap: 2 },
  actionIcon: { fontSize: 18 },
  actionText: { color: C.textSub, fontSize: FontSizes.xs },

  vacio: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  vacioIcono: { fontSize: 48 },
  vacioTitulo: { color: C.text, fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
  vacioSub: { color: C.textSub, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 22 },

  fab: {
    position: 'absolute', bottom: Spacing.xl, right: Spacing.lg, width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', boxShadow: sombra,
  },
  fabText: { color: C.black, fontSize: 28, fontWeight: FontWeights.bold, lineHeight: 32 },
};

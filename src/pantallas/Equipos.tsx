import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { showAlert } from '../componentes/AlertProvider';
import { Icono, IconoSenal } from '../componentes/iconos';
import { RecargaDePantalla } from '../componentes/RecargaDePantalla';
import { BotonTema } from '../componentes/SelectorTema';
import { AvisoError, BotonIcono, Desplazable, Spinner, Tocable, tarjeta, useBreakpoint } from '../componentes/ui';
import { useAuth } from '../contexto/AuthContext';
import {
  alCambiarEquipos, colorEstado, infoSenal, labelEstado, ordenarPorUrgencia, posicionEnRango, prepararEquipos, resumenEstados,
  type Equipo, type EstadoEquipo,
} from '../lib/equipos';
import { e, type Estilo } from '../lib/estilo';
import { formatHora24, formatNumero, formatTemp, haceCuanto } from '../lib/formato';
import { equipoService } from '../lib/servicios';
import { C, FontSizes, FontWeights, Radius, Spacing } from '../lib/tema';

/** Cada cuánto se actualiza la lista sola mientras la pestaña está visible. */
const INTERVALO_MS = 60000;

// ─── Tarjeta de equipo ───────────────────────────────
function EquipoCard({ equipo, ahora }: { equipo: Equipo; ahora: number }) {
  const navigate = useNavigate();
  const col = colorEstado(equipo.estado);
  const senal = infoSenal(equipo.senal);
  const critico = equipo.estado === 'critico';
  const posicion = posicionEnRango(equipo.temperatura, equipo.minima, equipo.maxima);
  const colorTemp = critico ? C.tempCritico
    : equipo.estado === 'atencion' ? C.tempAtencion
    : equipo.estado === 'desconectado' ? C.textSub
    : C.text;

  return (
    <div style={e(s.card, critico && { backgroundColor: C.criticoTarjeta, borderColor: C.criticoBorde })}>
      <div style={e(s.filaArriba)}>
        <div style={e(s.titulos)}>
          <span style={e(s.cardName)}>{equipo.nombre}</span>
          <span style={e(s.cardSub)}>
            Rango {formatNumero(equipo.minima)} a {formatNumero(equipo.maxima)} °C · {haceCuanto(equipo.ultimaConexion, ahora)}
          </span>
        </div>
        <div style={e(s.estado)}>
          <div style={e(s.punto, { backgroundColor: col.punto })} />
          <span style={e(s.estadoText, { color: col.texto })}>{labelEstado(equipo.estado)}</span>
        </div>
      </div>

      <div style={e(s.filaMedio)}>
        <span style={e(s.tempValue, { color: colorTemp })}>
          {formatTemp(equipo.temperatura)}
          <span style={e(s.tempUnidad)}> °C</span>
        </span>
        <div style={e(s.acciones)}>
          <BotonIcono icono="grafico" etiqueta={`Ver datos de ${equipo.nombre}`} onPress={() => navigate(`/equipo/${equipo.id}`)} />
          <BotonIcono icono="ajustes" etiqueta={`Configurar ${equipo.nombre}`} onPress={() => navigate(`/equipo/configurar/${equipo.id}`)} />
        </div>
      </div>

      {/* Posición de la temperatura dentro del rango permitido */}
      <div style={e(s.pista, critico && { backgroundColor: C.criticoPista })} aria-hidden="true">
        {posicion != null && (
          <div style={e(s.barra, { width: `${Math.max(posicion, 0.03) * 100}%`, backgroundColor: critico ? C.criticoBarra : col.punto })} />
        )}
      </div>

      <div style={e(s.senalRow)}>
        <IconoSenal nivel={senal.nivel} color={senal.color} />
        <span style={e(s.senalTexto)}>{senal.texto}</span>
      </div>
    </div>
  );
}

/** Contador del resumen de arriba (Normal, Atención, Crítico y, si hay, Desconectado). */
function Contador({ cantidad, estado }: { cantidad: number; estado: EstadoEquipo }) {
  return (
    <div style={e(s.contador)}>
      <span style={e(s.contadorNumero)}>{cantidad}</span>
      <div style={e(s.contadorEtiqueta)}>
        <div style={e(s.punto, { backgroundColor: colorEstado(estado).punto })} />
        <span style={e(s.contadorTexto)}>{labelEstado(estado)}</span>
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
  const [error, setError] = useState<string | null>(null);
  // Hora de la última actualización que salió bien (ESTANDARES D6); en ámbar si la última falló
  const [actualizado, setActualizado] = useState<number | null>(null);

  const cargarEquipos = useCallback(async (esRefresh = false) => {
    try {
      if (!esRefresh) setCargando(true);
      setError(null);
      const data = await equipoService.getMisEquipos();
      setEquipos(prepararEquipos(data));
      setActualizado(Date.now());
    } catch {
      setError('No se pudieron cargar los equipos. Revisá tu conexión.');
    } finally {
      setCargando(false);
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

  function handleLogout() {
    showAlert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
    ]);
  }

  if (cargando) {
    return (
      <div style={e(s.centrado)}>
        <Spinner tamano="large" />
        <span style={e(s.cargandoText)}>Cargando equipos...</span>
      </div>
    );
  }

  const ordenados = ordenarPorUrgencia(equipos);
  const resumen = resumenEstados(equipos);
  const contadores: EstadoEquipo[] = ['normal', 'atencion', 'critico'];
  if (resumen.desconectado > 0) contadores.push('desconectado');
  const ahora = Date.now();

  return (
    <div style={e(s.container)}>
      <div style={e(s.header)}>
        <div style={e(s.titulos)}>
          <span style={e(s.logo)}>tele<span style={{ color: C.logoMet }}>met</span></span>
          <span style={e(s.headerGreeting)}>
            Hola, {usuario?.nombre ?? 'Usuario'} · {equipos.length === 1 ? '1 equipo' : `${equipos.length} equipos`}
            {actualizado != null && <span style={{ color: error ? C.ambar : C.textSub }}> · Act. {formatHora24(actualizado)}</span>}
          </span>
        </div>
        <div style={e(s.botonesHeader)}>
          {/* En el celular no van Actualizar (se tira la pantalla hacia abajo, D6) ni el tema (va en Perfil, G1) */}
          <div className="tpa-oculto-celular" style={e(s.botonesHeader)}>
            <BotonIcono icono="actualizar" etiqueta="Actualizar" onPress={() => cargarEquipos(true)} fondo={C.card} borde={C.border} color={C.textSub} />
            <BotonTema />
          </div>
          <BotonIcono icono="salir" etiqueta="Cerrar sesión" onPress={handleLogout} fondo={C.card} borde={C.border} color={C.textSub} />
        </div>
      </div>

      {error && <AvisoError texto={error} onReintentar={() => cargarEquipos()} />}

      <RecargaDePantalla ruta="/" recargar={() => cargarEquipos(true)} />
      <Desplazable estiloContenido={[s.lista, s.listaAncha]}>
        {equipos.length === 0 ? (
          <div style={e(s.vacio)}>
            <div style={e(s.vacioIcono)}><Icono nombre="termometro" tamano={28} /></div>
            <span style={e(s.vacioTitulo)}>Sin equipos</span>
            <span style={e(s.vacioSub)}>
              Todavía no tenés equipos agregados.{'\n'}
              Tocá el botón + para agregar uno.
            </span>
          </div>
        ) : (
          <>
            {/* Con cuatro contadores en un celular van de a dos por fila, para que "Desconectado" entre entero */}
            <div style={e(s.resumen, { gridTemplateColumns: `repeat(${esMobile && contadores.length > 3 ? 2 : contadores.length}, minmax(0, 1fr))` })}>
              {contadores.map((estado) => <Contador key={estado} estado={estado} cantidad={resumen[estado]} />)}
            </div>
            {/* Grilla de 1, 2 o 3 columnas según el ancho; lo más urgente primero */}
            <div style={e(s.grilla, { gridTemplateColumns: `repeat(${numColumns}, minmax(0, 1fr))` })}>
              {ordenados.map((eq) => <EquipoCard key={String(eq.id)} equipo={eq} ahora={ahora} />)}
            </div>
          </>
        )}
      </Desplazable>

      <Tocable estilo={s.fab} onPress={() => navigate('/equipo/agregar')} opacidadActiva={0.85} etiqueta="Agregar equipo">
        <Icono nombre="mas" tamano={20} grosor={2.5} />
        <span style={e(s.fabText)}>Agregar</span>
      </Tocable>
    </div>
  );
}

const s: Record<string, Estilo> = {
  container: { flex: 1, backgroundColor: C.background },
  centrado: { flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  cargandoText: { color: C.textSub, fontSize: FontSizes.sm },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    paddingTop: 22, paddingBottom: 14, paddingHorizontal: 20, width: '100%', maxWidth: 1200, alignSelf: 'center',
    // Por encima de la lista: el menú del tema se despliega sobre las tarjetas
    zIndex: 2,
  },
  titulos: { gap: 2, flexShrink: 1, minWidth: 0 },
  logo: { color: C.text, fontSize: FontSizes.xl, fontWeight: FontWeights.bold, letterSpacing: -0.3 },
  headerGreeting: { color: C.textSub, fontSize: FontSizes.sm },
  botonesHeader: { flexDirection: 'row', gap: Spacing.sm },

  lista: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
  // En pantallas anchas la grilla queda centrada en vez de ir de punta a punta
  listaAncha: { maxWidth: 1200, width: '100%', alignSelf: 'center' },

  resumen: { display: 'grid', gap: Spacing.sm, marginBottom: 12 },
  contador: { backgroundColor: C.card, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 12, gap: 2, boxShadow: C.sombra },
  contadorNumero: { color: C.text, fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
  contadorEtiqueta: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  contadorTexto: { color: C.textSub, fontSize: FontSizes.xs, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },

  grilla: { display: 'grid', gap: 10, alignItems: 'start' },

  card: { ...tarjeta, padding: Spacing.md, gap: 12 },
  filaArriba: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  cardName: { color: C.text, fontSize: 16, fontWeight: FontWeights.semibold, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardSub: { color: C.textSub, fontSize: FontSizes.xs },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 3 },
  punto: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  estadoText: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, whiteSpace: 'nowrap' },

  filaMedio: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  tempValue: { fontSize: 38, fontWeight: FontWeights.bold, letterSpacing: -1, lineHeight: 1, whiteSpace: 'nowrap' },
  tempUnidad: { fontSize: 18, fontWeight: FontWeights.medium, color: C.textSub, letterSpacing: 0 },
  acciones: { flexDirection: 'row', gap: Spacing.sm },

  pista: { height: 4, borderRadius: 2, backgroundColor: C.pista, overflow: 'hidden' },
  barra: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 2 },

  senalRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -2 },
  senalTexto: { color: C.textSub, fontSize: FontSizes.xs },

  vacio: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  vacioIcono: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.card, color: C.textSub, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  vacioTitulo: { color: C.text, fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
  vacioSub: { color: C.textSub, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 22 },

  fab: {
    position: 'absolute', bottom: 20, right: 20, height: 52, paddingHorizontal: 20, borderRadius: Radius.lg,
    backgroundColor: C.primary, color: C.sobrePrimary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
  },
  fabText: { color: C.sobrePrimary, fontSize: 15, fontWeight: FontWeights.semibold },
};

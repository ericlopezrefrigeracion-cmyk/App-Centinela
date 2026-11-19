import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { showAlert } from '../componentes/AlertProvider';
import { Desplazable, Spinner, Tocable } from '../componentes/ui';
import { mismoId, type EquipoApi } from '../lib/equipos';
import { e, type Estilo } from '../lib/estilo';
import { generarSemanas, rangoSemana } from '../lib/graficos';
import { exportarReportePDF, htmlReporteSemanal, nombreReporteSemanal } from '../lib/reportes';
import { alertaService, datosService, equipoService } from '../lib/servicios';
import { C, FontSizes, FontWeights, Radius, Spacing } from '../lib/tema';

export default function Historicos() {
  // Puede recibir ?equipoId= para preseleccionar un equipo
  const [params] = useSearchParams();
  const equipoIdParam = params.get('equipoId') ?? '';

  const semanas = useMemo(() => generarSemanas(), []);
  const [equipos, setEquipos] = useState<EquipoApi[]>([]);
  const [equipoSeleccionado, setEquipo] = useState<string>(equipoIdParam);
  const [semanaSeleccionada, setSemana] = useState<string>(semanas[0]?.fechaInicio ?? '');
  const [cargandoEquipos, setCargandoEq] = useState(true);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await equipoService.getMisEquipos();
        setEquipos(data);
        // Sin equipo por parámetro, se elige el primero
        if (!equipoIdParam && data.length > 0) setEquipo(String(data[0]!.id));
      } catch {
        showAlert('Error', 'No se pudieron cargar los equipos.');
      } finally {
        setCargandoEq(false);
      }
    })();
  }, []);

  async function handleDescargar() {
    if (!equipoSeleccionado) {
      showAlert('Seleccioná un equipo', 'Elegí el equipo del que querés descargar los datos.');
      return;
    }
    if (!semanaSeleccionada) {
      showAlert('Seleccioná una semana', 'Elegí la semana que querés descargar.');
      return;
    }

    try {
      setDescargando(true);
      const esSemanaActual = semanaSeleccionada === semanas[0]?.fechaInicio;
      const { desde, hasta } = rangoSemana(semanaSeleccionada, esSemanaActual);

      const [historicoData, alertasData] = await Promise.all([
        datosService.getHistorico(equipoSeleccionado, desde, hasta, 'hora'),
        alertaService.getAlertas({ soloNoLeidas: false, limit: 200 }),
      ]);

      const agrupados = historicoData?.agrupados ?? [];
      if (agrupados.length === 0) {
        showAlert('Sin datos', 'No hay datos registrados para este período.');
        setDescargando(false);
        return;
      }

      const datos = agrupados.map((d: any) => ({
        fecha: d.periodo,
        temp: Number(d.temp_promedio),
        temp_min: Number(d.temp_min),
        temp_max: Number(d.temp_max),
        rssi: 0,
      }));
      // Alertas del equipo dentro de la semana
      const desdeDate = new Date(desde);
      const hastaDate = new Date(hasta);
      const alertas = alertasData.items.filter((a: any) => {
        if (!mismoId(a.equipo_id, equipoSeleccionado)) return false;
        const fechaAlerta = new Date(a.fecha);
        return fechaAlerta >= desdeDate && fechaAlerta <= hastaDate;
      });
      const equipo = equipos.find((eq) => mismoId(eq.id, equipoSeleccionado));
      const semana = semanas.find((sm) => sm.fechaInicio === semanaSeleccionada);

      const html = htmlReporteSemanal({ equipo, datos, alertas, etiquetaSemana: semana?.label ?? '', fechaInicio: semanaSeleccionada });
      exportarReportePDF(html, nombreReporteSemanal(equipo?.nombre, semanaSeleccionada));
    } catch {
      showAlert('Error', 'No se pudo generar el reporte.');
    } finally {
      setDescargando(false);
    }
  }

  if (cargandoEquipos) {
    return (
      <div style={e(s.centrado)}>
        <Spinner tamano="large" color={C.primary} />
        <span style={e(s.cargandoText)}>Cargando...</span>
      </div>
    );
  }

  return (
    <Desplazable estilo={s.container} estiloContenido={s.scroll}>
      <span style={e(s.descripcion)}>Seleccioná el equipo y la semana que querés descargar como PDF.</span>

      <span style={e(s.grupTitulo)}>Equipo</span>
      <div style={e(s.opciones)}>
        {equipos.map((eq) => {
          const activo = String(eq.id) === equipoSeleccionado;
          return (
            <Tocable key={String(eq.id)} estilo={[s.opcionBtn, activo && s.opcionBtnActivo]} onPress={() => setEquipo(String(eq.id))} opacidadActiva={0.75}>
              <span style={e(s.opcionText, activo && s.opcionTextActivo)}>{eq.nombre}</span>
            </Tocable>
          );
        })}
      </div>

      <span style={e(s.grupTitulo)}>Semana</span>
      <div style={e(s.opciones)}>
        {semanas.map((sem) => {
          const activa = sem.fechaInicio === semanaSeleccionada;
          return (
            <Tocable key={sem.fechaInicio} estilo={[s.opcionBtn, activa && s.opcionBtnActivo]} onPress={() => setSemana(sem.fechaInicio)} opacidadActiva={0.75}>
              <span style={e(s.opcionText, activa && s.opcionTextActivo)}>{sem.label}</span>
            </Tocable>
          );
        })}
      </div>

      <div style={e(s.infoBox)}>
        <span style={e(s.infoIcono)}>📄</span>
        <span style={e(s.infoText)}>
          El reporte incluye todas las lecturas de temperatura y alertas
          de la semana seleccionada en formato PDF.
        </span>
      </div>

      <Tocable estilo={[s.btnDescargar, descargando && s.btnDisabled]} onPress={handleDescargar} disabled={descargando} opacidadActiva={0.85}>
        {descargando ? <Spinner color={C.black} /> : <span style={e(s.btnDescargarText)}>📥  Descargar PDF</span>}
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
  descripcion: { color: C.textSub, fontSize: FontSizes.sm, lineHeight: 20, marginBottom: Spacing.lg },
  grupTitulo: { color: C.textSub, fontSize: FontSizes.xs, fontWeight: FontWeights.bold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.sm },
  opciones: { gap: Spacing.xs, marginBottom: Spacing.lg },
  opcionBtn: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: Radius.md, padding: Spacing.md },
  opcionBtnActivo: { backgroundColor: C.primaryBg, borderColor: C.primary },
  opcionText: { color: C.textSub, fontSize: FontSizes.md },
  opcionTextActivo: { color: C.primary, fontWeight: FontWeights.bold },
  infoBox: {
    flexDirection: 'row', backgroundColor: C.primaryBg, borderRadius: Radius.md, borderWidth: 1, borderColor: 'rgba(126,211,33,0.25)',
    padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.lg, alignItems: 'flex-start',
  },
  infoIcono: { fontSize: 16 },
  infoText: { color: C.textSub, fontSize: FontSizes.sm, flex: 1, lineHeight: 20 },
  btnDescargar: { backgroundColor: C.primary, borderRadius: Radius.full, padding: Spacing.md, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnDescargarText: { color: C.black, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
};

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { showAlert } from '../componentes/AlertProvider';
import { Ayuda } from '../componentes/Ayuda';
import { Icono } from '../componentes/iconos';
import { TituloPestana } from '../componentes/navegacion';
import { Boton, Desplazable, Spinner, Tocable, tarjeta } from '../componentes/ui';
import { mismoId, type EquipoApi } from '../lib/equipos';
import { e, type Estilo } from '../lib/estilo';
import { generarSemanas, rangoSemana } from '../lib/graficos';
import { abrirVentanaReporte, exportarReportePDF, htmlReporteSemanal, nombreReporteSemanal } from '../lib/reportes';
import { alertaService, datosService, equipoService } from '../lib/servicios';
import { C, FontSizes, FontWeights, Spacing } from '../lib/tema';

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

    // La pestaña del reporte se abre ya, con el toque: si se abre después de consultar la API,
    // Safari (iPhone) y Chrome la bloquean como ventana emergente.
    let ventana: Window;
    try {
      ventana = abrirVentanaReporte();
    } catch (err) {
      showAlert('No se pudo abrir el reporte', err instanceof Error ? err.message : String(err));
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
        ventana.close();
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

      const html = htmlReporteSemanal({ equipo, datos, alertas, etiquetaSemana: semana?.label ?? '', fechaInicio: semanaSeleccionada, desde, hasta });
      exportarReportePDF(html, nombreReporteSemanal(equipo?.nombre, semanaSeleccionada), ventana);
    } catch {
      ventana.close();
      showAlert('Error', 'No se pudo generar el reporte.');
    } finally {
      setDescargando(false);
    }
  }

  if (cargandoEquipos) {
    return (
      <div style={e(s.centrado)}>
        <Spinner tamano="large" />
        <span style={e(s.cargandoText)}>Cargando...</span>
      </div>
    );
  }

  /** Opción de una lista donde se elige una sola (equipo o semana). */
  const opcion = (clave: string, texto: string, activa: boolean, elegir: () => void) => (
    <Tocable key={clave} estilo={[s.opcionBtn, activa && s.opcionBtnActivo]} onPress={elegir} opacidadActiva={0.6}>
      <span style={e(s.opcionText, activa && s.opcionTextActivo)}>{texto}</span>
      {activa && <Icono nombre="check" tamano={18} color={C.verde} />}
    </Tocable>
  );

  return (
    <div style={e(s.container)}>
      <TituloPestana titulo="Históricos" anchoMaximo={600} />
      <Desplazable estiloContenido={s.scroll}>
        <span style={e(s.descripcion)}>Seleccioná el equipo y la semana que querés descargar como PDF.</span>

        <span style={e(s.grupTitulo)}>Equipo</span>
        <div style={e(s.opciones)}>
          {equipos.map((eq) => opcion(String(eq.id), eq.nombre, String(eq.id) === equipoSeleccionado, () => setEquipo(String(eq.id))))}
        </div>

        <span style={e(s.grupTitulo)}>Semana</span>
        <div style={e(s.opciones)}>
          {semanas.map((sem) => opcion(sem.fechaInicio, sem.label, sem.fechaInicio === semanaSeleccionada, () => setSemana(sem.fechaInicio)))}
        </div>

        <Ayuda>
          El reporte incluye todas las lecturas de temperatura y alertas
          de la semana seleccionada en formato PDF.
        </Ayuda>

        <Boton icono="descarga" onPress={handleDescargar} cargando={descargando}>Descargar PDF</Boton>

        <div style={{ height: Spacing.xxl }} />
      </Desplazable>
    </div>
  );
}

const s: Record<string, Estilo> = {
  container: { flex: 1, backgroundColor: C.background },
  scroll: { paddingHorizontal: Spacing.md, maxWidth: 600, width: '100%', alignSelf: 'center' },
  centrado: { flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  cargandoText: { color: C.textSub, fontSize: FontSizes.sm },
  descripcion: { color: C.textSub, fontSize: FontSizes.sm, lineHeight: 20, marginBottom: Spacing.md, paddingHorizontal: 4 },
  grupTitulo: { color: C.textSub, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, marginBottom: Spacing.sm, paddingHorizontal: 4 },
  opciones: { ...tarjeta, marginBottom: Spacing.lg, overflow: 'hidden' },
  opcionBtn: {
    minHeight: 48, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    borderTopWidth: 1, borderTopColor: C.border, marginTop: -1,
  },
  opcionBtnActivo: { backgroundColor: C.verdeFondo },
  opcionText: { color: C.text, fontSize: FontSizes.md },
  opcionTextActivo: { color: C.verde, fontWeight: FontWeights.semibold },
};

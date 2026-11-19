import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { showAlert } from '../componentes/AlertProvider';
import { volver } from '../componentes/navegacion';
import { Campo, Desplazable, Interruptor, Spinner, Tocable } from '../componentes/ui';
import { avisarCambioEquipos, mismoId } from '../lib/equipos';
import { e, type Estilo } from '../lib/estilo';
import { equipoService } from '../lib/servicios';
import { C, FontSizes, FontWeights, Radius, Spacing } from '../lib/tema';
import { cambiarSigno, formDesdeEquipo, normalizarTemperatura, parametrosParaGuardar, validarConfiguracion, type Errores, type FormConfiguracion } from '../lib/validaciones';

const FORM_VACIO: FormConfiguracion = {
  nombre: '', descripcion: '', ubicacion: '', minima: '', maxima: '', setpoint: '', calibracion: '', retardo: '',
  alertasActivas: true, reportesSemanales: false,
};

export default function EquipoConfigurar({ id }: { id: string }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormConfiguracion>(FORM_VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Errores>({});

  useEffect(() => {
    (async () => {
      try {
        setCargando(true);
        const equipos = await equipoService.getMisEquipos();
        const data = equipos.find((eq) => mismoId(eq.id, id));
        if (!data) throw new Error('Equipo no encontrado');
        setForm(formDesdeEquipo(data));
      } catch {
        showAlert('Error', 'No se pudo cargar la configuración del equipo.');
      } finally {
        setCargando(false);
      }
    })();
  }, [id]);

  function setField(campo: keyof FormConfiguracion, valor: string | boolean) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((er) => ({ ...er, [campo]: '' }));
  }

  async function handleGuardar() {
    const nuevos = validarConfiguracion(form);
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    try {
      setGuardando(true);
      // Datos generales
      await equipoService.editarInfo(id, { nombre: form.nombre, descripcion: form.descripcion, ubicacion: form.ubicacion });
      // Parámetros técnicos
      await equipoService.editarParametros(id, parametrosParaGuardar(form));
      avisarCambioEquipos();
      showAlert('Guardado', 'La configuración fue actualizada correctamente.', [{ text: 'OK', onPress: () => volver(navigate) }]);
    } catch {
      showAlert('Error', 'No se pudo guardar la configuración.');
    } finally {
      setGuardando(false);
    }
  }

  function handleEliminar() {
    showAlert('Eliminar equipo', '¿Estás seguro? Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            // DELETE /app/equipos/:id quita el equipo de la cuenta
            await equipoService.desvincularEquipo(id);
            avisarCambioEquipos();
            navigate('/', { replace: true });
          } catch {
            showAlert('Error', 'No se pudo eliminar el equipo.');
          }
        },
      },
    ]);
  }

  if (cargando) {
    return (
      <div style={e(s.centrado)}>
        <Spinner tamano="large" color={C.primary} />
        <span style={e(s.cargandoText)}>Cargando configuración...</span>
      </div>
    );
  }

  const error = (campo: string) => (errores[campo] ? <span style={e(s.errorText)}>{errores[campo]}</span> : null);

  return (
    <Desplazable estilo={s.container} estiloContenido={s.scroll}>
      {/* Datos generales */}
      <span style={e(s.grupTitulo)}>Datos generales</span>
      <div style={e(s.grupo)}>
        <div style={e(s.campo)}>
          <span style={e(s.label)}>Nombre <span style={e(s.requerido)}>*</span></span>
          <Campo estilo={[s.input, !!errores.nombre && s.inputError]} valor={form.nombre} onCambio={(t) => setField('nombre', t)} maxLength={30} placeholder="Nombre del equipo" colorPlaceholder={C.textMuted} />
          {error('nombre')}
        </div>

        <div style={e(s.separador)} />

        <div style={e(s.campo)}>
          <span style={e(s.label)}>Descripción</span>
          <Campo estilo={[s.input, s.inputMultiline, !!errores.descripcion && s.inputError]} valor={form.descripcion} onCambio={(t) => setField('descripcion', t)} placeholder="Descripción opcional" colorPlaceholder={C.textMuted} multilinea lineas={2} maxLength={50} />
          {error('descripcion')}
        </div>

        <div style={e(s.separador)} />

        <div style={e(s.campo)}>
          <span style={e(s.label)}>Ubicación</span>
          <Campo estilo={[s.input, !!errores.ubicacion && s.inputError]} valor={form.ubicacion} onCambio={(t) => setField('ubicacion', t)} placeholder="Ubicación del equipo" colorPlaceholder={C.textMuted} maxLength={40} />
          {error('ubicacion')}
        </div>
      </div>

      {/* Temperatura */}
      <span style={e(s.grupTitulo)}>Temperatura</span>
      <div style={e(s.grupo)}>
        <div style={e(s.filaDoble)}>
          <div style={e(s.campo, { flex: 1 })}>
            <span style={e(s.label)}>Mínima (°C)</span>
            <CampoTemperatura error={!!errores.minima} valor={form.minima} onCambio={(t) => setField('minima', t)} placeholder="-25" />
            {error('minima')}
          </div>

          <div style={{ width: Spacing.sm }} />

          <div style={e(s.campo, { flex: 1 })}>
            <span style={e(s.label)}>Máxima (°C)</span>
            <CampoTemperatura error={!!errores.maxima} valor={form.maxima} onCambio={(t) => setField('maxima', t)} placeholder="0" />
            {error('maxima')}
          </div>
        </div>

        <div style={e(s.separador)} />

        <div style={e(s.campo)}>
          <span style={e(s.label)}>Temperatura deseada / Setpoint (°C)</span>
          <span style={e(s.labelSub)}>Temperatura objetivo de trabajo</span>
          <CampoTemperatura error={!!errores.setpoint} valor={form.setpoint} onCambio={(t) => setField('setpoint', t)} placeholder="-18" />
          {error('setpoint')}
        </div>

        <div style={e(s.separador)} />

        <div style={e(s.campo)}>
          <span style={e(s.label)}>Calibración (°C)</span>
          <span style={e(s.labelSub)}>Corrección de offset del sensor. Suma o resta este valor a la lectura real.</span>
          <CampoTemperatura error={!!errores.calibracion} valor={form.calibracion} onCambio={(t) => setField('calibracion', t)} placeholder="0.0" />
          {error('calibracion')}
        </div>
      </div>

      {/* Alertas */}
      <span style={e(s.grupTitulo)}>Alertas</span>
      <div style={e(s.grupo)}>
        <div style={e(s.switchRow)}>
          <div style={{ flex: 1 }}>
            <span style={e(s.switchLabel)}>Alertas activas</span>
            <span style={e(s.switchSub)}>Registrar alertas cuando la temperatura esté fuera de rango</span>
          </div>
          <Interruptor valor={form.alertasActivas} onCambio={(v) => setField('alertasActivas', v)} colorPista={{ false: C.border, true: C.primaryBg }} />
        </div>

        <div style={e(s.separador)} />

        <div style={e(s.switchRow)}>
          <div style={{ flex: 1 }}>
            <span style={e(s.switchLabel)}>Reportes semanales</span>
            <span style={e(s.switchSub)}>Recibir un resumen semanal con el historial de temperatura por email</span>
          </div>
          <Interruptor valor={form.reportesSemanales} onCambio={(v) => setField('reportesSemanales', v)} colorPista={{ false: C.border, true: C.primaryBg }} />
        </div>

        <div style={e(s.separador)} />

        <div style={e(s.campo)}>
          <span style={e(s.label)}>Retardo para el aviso (minutos)</span>
          <span style={e(s.labelSub)}>Tiempo que debe permanecer fuera de rango antes de enviar la alerta</span>
          <Campo estilo={[s.input, !!errores.retardo && s.inputError]} valor={form.retardo} onCambio={(t) => setField('retardo', t)} placeholder="5" colorPlaceholder={C.textMuted} inputMode="numeric" />
          {error('retardo')}
        </div>
      </div>

      {/* Botones */}
      <Tocable estilo={[s.btnPrimario, guardando && s.btnDisabled]} onPress={handleGuardar} disabled={guardando} opacidadActiva={0.85}>
        {guardando ? <Spinner color={C.black} /> : <span style={e(s.btnPrimarioText)}>Guardar cambios</span>}
      </Tocable>

      <Tocable estilo={s.btnSecundario} onPress={() => volver(navigate)} opacidadActiva={0.75}>
        <span style={e(s.btnSecundarioText)}>Cancelar</span>
      </Tocable>

      {/* Zona de peligro */}
      <div style={e(s.zonaEliminacion)}>
        <span style={e(s.zonaEliminacionTitulo)}>Zona de peligro</span>
        <span style={e(s.zonaEliminacionSub)}>Esta acción eliminará el equipo de tu cuenta de forma permanente.</span>
        <Tocable estilo={s.btnEliminar} onPress={handleEliminar} opacidadActiva={0.85}>
          <span style={e(s.btnEliminarText)}>Eliminar equipo</span>
        </Tocable>
      </div>

      <div style={{ height: Spacing.xxl }} />
    </Desplazable>
  );
}


/**
 * Campo de temperatura: teclado decimal y un botón ± para el signo (el teclado numérico del iPhone no tiene el menos
 * y las cámaras de frío trabajan bajo cero). La coma decimal se pasa a punto al escribir.
 */
function CampoTemperatura({ valor, onCambio, placeholder, error }: { valor: string; onCambio: (t: string) => void; placeholder: string; error: boolean }) {
  return (
    <div style={{ display: 'flex', gap: Spacing.xs }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Campo estilo={[s.input, error && s.inputError]} valor={valor} onCambio={(t) => onCambio(normalizarTemperatura(t))} placeholder={placeholder} colorPlaceholder={C.textMuted} inputMode="decimal" />
      </div>
      <Tocable estilo={s.botonSigno} onPress={() => onCambio(cambiarSigno(valor))} etiqueta="Cambiar signo">
        <span style={e(s.botonSignoTexto)}>±</span>
      </Tocable>
    </div>
  );
}

const s: Record<string, Estilo> = {
  container: { flex: 1, backgroundColor: C.background },
  scroll: { padding: Spacing.lg, maxWidth: 600, width: '100%', alignSelf: 'center' },
  centrado: { flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  cargandoText: { color: C.textSub, fontSize: FontSizes.sm },
  grupTitulo: { color: C.textSub, fontSize: FontSizes.xs, fontWeight: FontWeights.bold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.sm, marginTop: Spacing.md },
  grupo: { backgroundColor: C.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border, padding: Spacing.md, marginBottom: Spacing.sm },
  separador: { height: 1, backgroundColor: C.border, marginVertical: Spacing.sm },
  campo: { marginBottom: 4 },
  filaDoble: { flexDirection: 'row' },
  label: { color: C.text, fontSize: FontSizes.sm, fontWeight: FontWeights.medium, marginBottom: 4 },
  labelSub: { color: C.textMuted, fontSize: FontSizes.xs, marginBottom: Spacing.xs },
  requerido: { color: C.critico },
  input: { backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border, borderRadius: Radius.md, padding: Spacing.sm + 4, color: C.text, fontSize: FontSizes.md },
  inputError: { borderColor: C.critico },
  botonSigno: { backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border, borderRadius: Radius.md, width: 44, alignItems: 'center', justifyContent: 'center' },
  botonSignoTexto: { color: C.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  inputMultiline: { height: 72, verticalAlign: 'top' },
  errorText: { color: C.critico, fontSize: FontSizes.xs, marginTop: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  switchLabel: { color: C.text, fontSize: FontSizes.md, fontWeight: FontWeights.medium, marginBottom: 2 },
  switchSub: { color: C.textSub, fontSize: FontSizes.xs, lineHeight: 16 },
  btnPrimario: { backgroundColor: C.primary, borderRadius: Radius.full, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.sm },
  btnDisabled: { opacity: 0.6 },
  btnPrimarioText: { color: C.black, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  btnSecundario: { borderRadius: Radius.full, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: C.border, marginBottom: Spacing.xl },
  btnSecundarioText: { color: C.textSub, fontSize: FontSizes.md },
  zonaEliminacion: { borderWidth: 1, borderColor: 'rgba(255,68,68,0.3)', borderRadius: Radius.lg, padding: Spacing.md, backgroundColor: 'rgba(255,68,68,0.05)' },
  zonaEliminacionTitulo: { color: C.critico, fontSize: FontSizes.sm, fontWeight: FontWeights.bold, marginBottom: 4 },
  zonaEliminacionSub: { color: C.textSub, fontSize: FontSizes.sm, marginBottom: Spacing.md, lineHeight: 20 },
  btnEliminar: { borderWidth: 1, borderColor: C.critico, borderRadius: Radius.full, padding: Spacing.sm + 4, alignItems: 'center' },
  btnEliminarText: { color: C.critico, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
};

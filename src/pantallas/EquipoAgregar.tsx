import { useState } from 'react';
import { useNavigate } from 'react-router';
import { showAlert } from '../componentes/AlertProvider';
import { volver } from '../componentes/navegacion';
import { Icono } from '../componentes/iconos';
import { Boton, Campo, campoTexto, Desplazable, tarjeta } from '../componentes/ui';
import { avisarCambioEquipos } from '../lib/equipos';
import { e, type Estilo } from '../lib/estilo';
import { equipoService } from '../lib/servicios';
import { C, FontSizes, FontWeights, Radius, Spacing } from '../lib/tema';
import { mensajeDeError, validarAgregar, type Errores } from '../lib/validaciones';

type Clave = 'id' | 'nombre' | 'descripcion' | 'ubicacion';

export default function EquipoAgregar() {
  const navigate = useNavigate();
  const [form, setForm] = useState<Record<Clave, string>>({ id: '', nombre: '', descripcion: '', ubicacion: '' });
  const [errores, setErrores] = useState<Errores>({});
  const [cargando, setCargando] = useState(false);

  function setField(campo: Clave, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((er) => ({ ...er, [campo]: '' }));
  }

  async function handleAgregar() {
    const nuevos = validarAgregar(form);
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    try {
      setCargando(true);
      await equipoService.registrarEquipo({
        codigo: form.id.trim(),
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined,
        ubicacion: form.ubicacion.trim() || undefined,
      });
      avisarCambioEquipos();
      showAlert('Equipo registrado', `El equipo "${form.nombre}" fue registrado y vinculado correctamente.`, [
        { text: 'OK', onPress: () => volver(navigate) },
      ]);
    } catch (err) {
      showAlert('Error', mensajeDeError(err, 'No se pudo registrar el equipo. Verificá el código.'));
    } finally {
      setCargando(false);
    }
  }

  return (
    <Desplazable estilo={s.container} estiloContenido={s.scroll}>
      <span style={e(s.descripcion)}>Ingresá los datos del nuevo equipo Centinela para vincularlo a tu cuenta.</span>

      <div style={e(s.formulario)}>
        <div style={e(s.campo)}>
          <span style={e(s.label)}>Código del equipo <span style={e(s.requerido)}>*</span></span>
          <span style={e(s.labelSub)}>El código impreso en el dispositivo Centinela</span>
          <Campo estilo={[s.input, !!errores.id && s.inputError]} placeholder="Ej: EQUIPO_001" valor={form.id} onCambio={(t) => setField('id', t)} autoCapitalize="characters" />
          {errores.id ? <span style={e(s.errorText)}>{errores.id}</span> : null}
        </div>

        <div style={e(s.campo)}>
          <span style={e(s.label)}>Nombre <span style={e(s.requerido)}>*</span></span>
          <span style={e(s.labelSub)}>Nombre descriptivo para identificar el equipo</span>
          <Campo estilo={[s.input, !!errores.nombre && s.inputError]} placeholder="Ej: Cámara frigorífica principal" valor={form.nombre} onCambio={(t) => setField('nombre', t)} />
          {errores.nombre ? <span style={e(s.errorText)}>{errores.nombre}</span> : null}
        </div>

        <div style={e(s.campo)}>
          <span style={e(s.label)}>Descripción</span>
          <Campo estilo={[s.input, s.inputMultiline]} placeholder="Descripción opcional del equipo..." valor={form.descripcion} onCambio={(t) => setField('descripcion', t)} multilinea lineas={3} />
        </div>

        <div style={e(s.campo)}>
          <span style={e(s.label)}>Ubicación</span>
          <span style={e(s.labelSub)}>Dirección o descripción del lugar donde está instalado</span>
          <Campo estilo={s.input} placeholder="Ej: Depósito planta baja, sector B" valor={form.ubicacion} onCambio={(t) => setField('ubicacion', t)} />
        </div>
      </div>

      <div style={e(s.infoBox)}>
        <Icono nombre="info" tamano={18} color={C.textSub} />
        <span style={e(s.infoText)}>
          Una vez agregado el equipo, podrás configurar los rangos de temperatura,
          alertas y otros parámetros desde la pantalla de configuración.
        </span>
      </div>

      <div style={e(s.botones)}>
        <Boton icono="mas" onPress={handleAgregar} cargando={cargando}>Agregar equipo</Boton>
        <Boton variante="secundario" onPress={() => volver(navigate)}>Cancelar</Boton>
      </div>

      <div style={{ height: Spacing.xxl }} />
    </Desplazable>
  );
}

const s: Record<string, Estilo> = {
  container: { flex: 1, backgroundColor: C.background },
  scroll: { padding: Spacing.md, paddingTop: 0, maxWidth: 600, width: '100%', alignSelf: 'center' },
  descripcion: { color: C.textSub, fontSize: FontSizes.sm, lineHeight: 20, marginBottom: Spacing.md, paddingHorizontal: 4 },
  formulario: { ...tarjeta, padding: Spacing.md, marginBottom: Spacing.md },
  campo: { marginBottom: Spacing.md },
  label: { color: C.text, fontSize: FontSizes.sm, fontWeight: FontWeights.medium, marginBottom: 4 },
  labelSub: { color: C.textSub, fontSize: FontSizes.xs, marginBottom: 8, lineHeight: 17 },
  requerido: { color: C.rojo },
  input: { ...campoTexto },
  inputError: { borderColor: C.rojo },
  inputMultiline: { height: 88, verticalAlign: 'top' },
  errorText: { color: C.rojo, fontSize: FontSizes.xs, marginTop: Spacing.xs },
  infoBox: { ...tarjeta, flexDirection: 'row', borderRadius: Radius.md, padding: Spacing.md, gap: 12, marginBottom: Spacing.lg, alignItems: 'flex-start' },
  infoText: { color: C.textSub, fontSize: FontSizes.sm, flex: 1, lineHeight: 20 },
  botones: { gap: Spacing.sm },
};

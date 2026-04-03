import { Colors, FontSizes, FontWeights, Radius, Spacing } from '@/constants/theme';
import { equipoService } from '@/services/services';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';

const C = Colors?.centinela ?? {
  background:   '#0d1117',
  card:         '#111823',
  cardAlt:      '#0f1620',
  border:       '#1e2d3a',
  primary:      '#7ed321',
  primaryBg:    'rgba(126, 211, 33, 0.1)',
  text:         '#ffffff',
  textSub:      '#8a9ab0',
  textMuted:    '#4a5a6a',
  critico:      '#ff4444',
  alerta:       '#f5a623',
  white:        '#ffffff',
  black:        '#000000',
};

export default function ConfigurarEquipoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [form, setForm] = useState({
    nombre:           '',
    descripcion:      '',
    ubicacion:        '',
    minima:           '',
    maxima:           '',
    setpoint:         '',
    calibracion:      '',
    retardo:          '',
    alertasActivas:   true,
    reportesSemanales: false,
  });
  const [cargando, setCargando]   = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores]     = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) cargarEquipo();
  }, [id]);

  async function cargarEquipo() {
    try {
      setCargando(true);
      const equipos = await equipoService.getMisEquipos();
      const data = equipos.find((e: any) => e.id === id);
      if (!data) throw new Error('Equipo no encontrado');
      setForm({
        nombre:            data.nombre            ?? '',
        descripcion:       data.descripcion       ?? '',
        ubicacion:         data.ubicacion         ?? '',
        minima:            String(data.minima     ?? ''),
        maxima:            String(data.maxima     ?? ''),
        setpoint:          String(data.set_point  ?? data.setpoint ?? ''),
        calibracion:       String(data.calibracion ?? ''),
        retardo:           String(data.retardo    ?? ''),
        alertasActivas:    data.alertas_cliente   ?? data.alertasActivas ?? true,
        reportesSemanales: data.resumen_semanal     ?? false,
      });
    } catch {
      Alert.alert('Error', 'No se pudo cargar la configuración del equipo.');
    } finally {
      setCargando(false);
    }
  }

  function setField(campo: string, valor: string | boolean) {
    setForm(f => ({ ...f, [campo]: valor }));
    setErrores(e => ({ ...e, [campo]: '' }));
  }

  function validar(): boolean {
    const nuevos: Record<string, string> = {};

    // Nombre
    if (!form.nombre.trim())
      nuevos.nombre = 'El nombre es requerido';
    else if (form.nombre.trim().length > 30)
      nuevos.nombre = 'Máximo 30 caracteres';

    // Descripción
    if (form.descripcion.length > 50)
      nuevos.descripcion = 'Máximo 50 caracteres';

    // Ubicación
    if (form.ubicacion.length > 40)
      nuevos.ubicacion = 'Máximo 40 caracteres';

    // Mínima
    if (!form.minima.trim())
      nuevos.minima = 'La temperatura mínima es requerida';
    else if (isNaN(Number(form.minima)))
      nuevos.minima = 'Debe ser un número';
    else if (Number(form.minima) < -50 || Number(form.minima) > 100)
      nuevos.minima = 'Debe estar entre -50 y +100°C';

    // Máxima
    if (!form.maxima.trim())
      nuevos.maxima = 'La temperatura máxima es requerida';
    else if (isNaN(Number(form.maxima)))
      nuevos.maxima = 'Debe ser un número';
    else if (Number(form.maxima) < -50 || Number(form.maxima) > 100)
      nuevos.maxima = 'Debe estar entre -50 y +100°C';
    else if (form.minima && !nuevos.minima && Number(form.maxima) <= Number(form.minima))
      nuevos.maxima = 'Debe ser mayor que la mínima';

    // Temperatura deseada (setpoint)
    if (!form.setpoint.trim())
      nuevos.setpoint = 'La temperatura deseada es requerida';
    else if (isNaN(Number(form.setpoint)))
      nuevos.setpoint = 'Debe ser un número';
    else if (form.minima && form.maxima && !nuevos.minima && !nuevos.maxima) {
      if (Number(form.setpoint) < Number(form.minima) || Number(form.setpoint) > Number(form.maxima))
        nuevos.setpoint = `Debe estar entre ${form.minima} y ${form.maxima}°C`;
    }

    // Calibración
    if (form.calibracion.trim()) {
      if (isNaN(Number(form.calibracion)))
        nuevos.calibracion = 'Debe ser un número';
      else if (Number(form.calibracion) < -5 || Number(form.calibracion) > 5)
        nuevos.calibracion = 'Debe estar entre -5 y +5';
    }

    // Retardo
    if (form.retardo.trim()) {
      const r = Number(form.retardo);
      if (isNaN(r) || !Number.isInteger(r))
        nuevos.retardo = 'Debe ser un número entero';
      else if (r < 5 || r > 180)
        nuevos.retardo = 'Debe estar entre 5 y 180 minutos';
    }

    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  }

  async function handleGuardar() {
    if (!validar()) return;
    try {
      setGuardando(true);
      // Guardar info básica
      await equipoService.editarInfo(id, {
        nombre:      form.nombre,
        descripcion: form.descripcion,
        ubicacion:   form.ubicacion,
      });
      // Guardar parámetros técnicos
      await equipoService.editarParametros(id, {
        minima:          Number(form.minima),
        maxima:          Number(form.maxima),
        set_point:       Number(form.setpoint),
        calibracion:     form.calibracion.trim() ? Number(form.calibracion) : 0,
        retardo:         form.retardo.trim()      ? Number(form.retardo)     : 5,
        alertas_cliente: form.alertasActivas,
        resumen_semanal: form.reportesSemanales,
      });
      Alert.alert(
        'Guardado',
        'La configuración fue actualizada correctamente.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch {
      Alert.alert('Error', 'No se pudo guardar la configuración.');
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar() {
    Alert.alert(
      'Eliminar equipo',
      '¿Estás seguro? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await equipoService.eliminarEquipo(id);
              router.replace('/(tabs)');
            } catch {
              Alert.alert('Error', 'No se pudo eliminar el equipo.');
            }
          },
        },
      ]
    );
  }

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.cargandoText}>Cargando configuración...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >

      {/* ── Datos generales ── */}
      <Text style={styles.grupTitulo}>Datos generales</Text>
      <View style={styles.grupo}>

        <View style={styles.campo}>
          <Text style={styles.label}>Nombre <Text style={styles.requerido}>*</Text></Text>
          <TextInput
            style={[styles.input, errores.nombre ? styles.inputError : null]}
            value={form.nombre}
            onChangeText={t => setField('nombre', t)}
            maxLength={30}
            placeholder="Nombre del equipo"
            placeholderTextColor={C.textMuted}
          />
          {errores.nombre && <Text style={styles.errorText}>{errores.nombre}</Text>}
        </View>

        <View style={styles.separador} />

        <View style={styles.campo}>
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline, errores.descripcion ? styles.inputError : null]}
            value={form.descripcion}
            onChangeText={t => setField('descripcion', t)}
            placeholder="Descripción opcional"
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={2}
            maxLength={50}
          />
          {errores.descripcion && <Text style={styles.errorText}>{errores.descripcion}</Text>}
        </View>

        <View style={styles.separador} />

        <View style={styles.campo}>
          <Text style={styles.label}>Ubicación</Text>
          <TextInput
            style={[styles.input, errores.ubicacion ? styles.inputError : null]}
            value={form.ubicacion}
            onChangeText={t => setField('ubicacion', t)}
            placeholder="Ubicación del equipo"
            placeholderTextColor={C.textMuted}
            maxLength={40}
          />
          {errores.ubicacion && <Text style={styles.errorText}>{errores.ubicacion}</Text>}
        </View>
      </View>

      {/* ── Configuración de temperatura ── */}
      <Text style={styles.grupTitulo}>Temperatura</Text>
      <View style={styles.grupo}>

        <View style={styles.filaDoble}>
          <View style={[styles.campo, { flex: 1 }]}>
            <Text style={styles.label}>Mínima (°C)</Text>
            <TextInput
              style={[styles.input, errores.minima ? styles.inputError : null]}
              value={form.minima}
              onChangeText={t => setField('minima', t)}
              placeholder="-25"
              placeholderTextColor={C.textMuted}
              keyboardType="numeric"
            />
            {errores.minima && <Text style={styles.errorText}>{errores.minima}</Text>}
          </View>

          <View style={{ width: Spacing.sm }} />

          <View style={[styles.campo, { flex: 1 }]}>
            <Text style={styles.label}>Máxima (°C)</Text>
            <TextInput
              style={[styles.input, errores.maxima ? styles.inputError : null]}
              value={form.maxima}
              onChangeText={t => setField('maxima', t)}
              placeholder="0"
              placeholderTextColor={C.textMuted}
              keyboardType="numeric"
            />
            {errores.maxima && <Text style={styles.errorText}>{errores.maxima}</Text>}
          </View>
        </View>

        <View style={styles.separador} />

        <View style={styles.campo}>
          <Text style={styles.label}>Temperatura deseada / Setpoint (°C)</Text>
          <Text style={styles.labelSub}>Temperatura objetivo de trabajo</Text>
          <TextInput
            style={[styles.input, errores.setpoint ? styles.inputError : null]}
            value={form.setpoint}
            onChangeText={t => setField('setpoint', t)}
            placeholder="-18"
            placeholderTextColor={C.textMuted}
            keyboardType="numeric"
          />
          {errores.setpoint && <Text style={styles.errorText}>{errores.setpoint}</Text>}
        </View>

        <View style={styles.separador} />

        <View style={styles.campo}>
          <Text style={styles.label}>Calibración (°C)</Text>
          <Text style={styles.labelSub}>
            Corrección de offset del sensor. Suma o resta este valor a la lectura real.
          </Text>
          <TextInput
            style={[styles.input, errores.calibracion ? styles.inputError : null]}
            value={form.calibracion}
            onChangeText={t => setField('calibracion', t)}
            placeholder="0.0"
            placeholderTextColor={C.textMuted}
            keyboardType="numeric"
          />
          {errores.calibracion && <Text style={styles.errorText}>{errores.calibracion}</Text>}
        </View>
      </View>

      {/* ── Alertas ── */}
      <Text style={styles.grupTitulo}>Alertas</Text>
      <View style={styles.grupo}>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Alertas activas</Text>
            <Text style={styles.switchSub}>
              Recibir notificaciones push cuando la temperatura esté fuera de rango
            </Text>
          </View>
          <Switch
            value={form.alertasActivas}
            onValueChange={v => setField('alertasActivas', v)}
            trackColor={{ false: C.border, true: C.primaryBg }}
            thumbColor={form.alertasActivas ? C.primary : C.textMuted}
          />
        </View>

        <View style={styles.separador} />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Reportes semanales</Text>
            <Text style={styles.switchSub}>
              Recibir un resumen semanal con el historial de temperatura por email
            </Text>
          </View>
          <Switch
            value={form.reportesSemanales}
            onValueChange={v => setField('reportesSemanales', v)}
            trackColor={{ false: C.border, true: C.primaryBg }}
            thumbColor={form.reportesSemanales ? C.primary : C.textMuted}
          />
        </View>

        <View style={styles.separador} />

        <View style={styles.campo}>
          <Text style={styles.label}>Retardo para el aviso (minutos)</Text>
          <Text style={styles.labelSub}>
            Tiempo que debe permanecer fuera de rango antes de enviar la alerta
          </Text>
          <TextInput
            style={[styles.input, errores.retardo ? styles.inputError : null]}
            value={form.retardo}
            onChangeText={t => setField('retardo', t)}
            placeholder="5"
            placeholderTextColor={C.textMuted}
            keyboardType="numeric"
          />
          {errores.retardo && <Text style={styles.errorText}>{errores.retardo}</Text>}
        </View>
      </View>

      {/* ── Botones ── */}
      <TouchableOpacity
        style={[styles.btnPrimario, guardando && styles.btnDisabled]}
        onPress={handleGuardar}
        disabled={guardando}
        activeOpacity={0.85}
      >
        {guardando
          ? <ActivityIndicator color={C.black} />
          : <Text style={styles.btnPrimarioText}>Guardar cambios</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btnSecundario}
        onPress={() => router.back()}
        activeOpacity={0.75}
      >
        <Text style={styles.btnSecundarioText}>Cancelar</Text>
      </TouchableOpacity>

      {/* ── Zona peligrosa ── */}
      <View style={styles.zonaEliminacion}>
        <Text style={styles.zonaEliminacionTitulo}>Zona de peligro</Text>
        <Text style={styles.zonaEliminacionSub}>
          Esta acción eliminará el equipo de tu cuenta de forma permanente.
        </Text>
        <TouchableOpacity
          style={styles.btnEliminar}
          onPress={handleEliminar}
          activeOpacity={0.85}
        >
          <Text style={styles.btnEliminarText}>Eliminar equipo</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  scroll: {
    padding: Spacing.lg,
  },
  centrado: {
    flex: 1,
    backgroundColor: C.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cargandoText: {
    color: C.textSub,
    fontSize: FontSizes.sm,
  },
  grupTitulo: {
    color: C.textSub,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  grupo: {
    backgroundColor: C.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  separador: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: Spacing.sm,
  },
  campo: {
    marginBottom: 4,
  },
  filaDoble: {
    flexDirection: 'row',
  },
  label: {
    color: C.text,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    marginBottom: 4,
  },
  labelSub: {
    color: C.textMuted,
    fontSize: FontSizes.xs,
    marginBottom: Spacing.xs,
  },
  requerido: {
    color: C.critico,
  },
  input: {
    backgroundColor: C.cardAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.md,
    padding: Spacing.sm + 4,
    color: C.text,
    fontSize: FontSizes.md,
  },
  inputError: {
    borderColor: C.critico,
  },
  inputMultiline: {
    height: 72,
    textAlignVertical: 'top',
  },
  errorText: {
    color: C.critico,
    fontSize: FontSizes.xs,
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  switchLabel: {
    color: C.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    marginBottom: 2,
  },
  switchSub: {
    color: C.textSub,
    fontSize: FontSizes.xs,
    lineHeight: 16,
  },
  btnPrimario: {
    backgroundColor: C.primary,
    borderRadius: Radius.full,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPrimarioText: {
    color: C.black,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  btnSecundario: {
    borderRadius: Radius.full,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: Spacing.xl,
  },
  btnSecundarioText: {
    color: C.textSub,
    fontSize: FontSizes.md,
  },
  zonaEliminacion: {
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    backgroundColor: 'rgba(255,68,68,0.05)',
  },
  zonaEliminacionTitulo: {
    color: C.critico,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    marginBottom: 4,
  },
  zonaEliminacionSub: {
    color: C.textSub,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  btnEliminar: {
    borderWidth: 1,
    borderColor: C.critico,
    borderRadius: Radius.full,
    padding: Spacing.sm + 4,
    alignItems: 'center',
  },
  btnEliminarText: {
    color: C.critico,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
});
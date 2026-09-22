import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { equipoService } from '@/services/services';
import { showAlert } from '@/components/AlertProvider';
import { Colors, FontSizes, FontWeights, Spacing, Radius } from '@/constants/theme';

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
  white:        '#ffffff',
  black:        '#000000',
};

export default function AgregarEquipoScreen() {
  const [form, setForm] = useState({
    id:          '',
    nombre:      '',
    descripcion: '',
    ubicacion:   '',
  });
  const [errores, setErrores]   = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);

  function setField(campo: string, valor: string) {
    setForm(f => ({ ...f, [campo]: valor }));
    setErrores(e => ({ ...e, [campo]: '' }));
  }

  function validar(): boolean {
    const nuevos: Record<string, string> = {};
    if (!form.id.trim())     nuevos.id     = 'El ID del equipo es requerido';
    if (!form.nombre.trim()) nuevos.nombre = 'El nombre es requerido';
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  }

  async function handleAgregar() {
    if (!validar()) return;
    try {
      setCargando(true);
      await equipoService.registrarEquipo({
        codigo:      form.id.trim(),
        nombre:      form.nombre.trim(),
        descripcion: form.descripcion?.trim() || undefined,
        ubicacion:   form.ubicacion?.trim()   || undefined,
      });
      showAlert(
        'Equipo registrado',
        `El equipo "${form.nombre}" fue registrado y vinculado correctamente.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail
        : Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ')
        : 'No se pudo registrar el equipo. Verificá el código.';
      showAlert('Error', msg);
    } finally {
      setCargando(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.descripcion}>
        Ingresá los datos del nuevo equipo Centinela para vincularlo a tu cuenta.
      </Text>

      {/* ID del equipo */}
      <View style={styles.campo}>
        <Text style={styles.label}>Código del equipo <Text style={styles.requerido}>*</Text></Text>
        <Text style={styles.labelSub}>El código impreso en el dispositivo Centinela</Text>
        <TextInput
          style={[styles.input, errores.id ? styles.inputError : null]}
          placeholder="Ej: EQUIPO_001"
          placeholderTextColor={C.textMuted}
          value={form.id}
          onChangeText={t => setField('id', t)}
          autoCapitalize="characters"
        />
        {errores.id && <Text style={styles.errorText}>{errores.id}</Text>}
      </View>

      {/* Nombre */}
      <View style={styles.campo}>
        <Text style={styles.label}>Nombre <Text style={styles.requerido}>*</Text></Text>
        <Text style={styles.labelSub}>Nombre descriptivo para identificar el equipo</Text>
        <TextInput
          style={[styles.input, errores.nombre ? styles.inputError : null]}
          placeholder="Ej: Cámara frigorífica principal"
          placeholderTextColor={C.textMuted}
          value={form.nombre}
          onChangeText={t => setField('nombre', t)}
        />
        {errores.nombre && <Text style={styles.errorText}>{errores.nombre}</Text>}
      </View>

      {/* Descripción */}
      <View style={styles.campo}>
        <Text style={styles.label}>Descripción</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="Descripción opcional del equipo..."
          placeholderTextColor={C.textMuted}
          value={form.descripcion}
          onChangeText={t => setField('descripcion', t)}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Ubicación */}
      <View style={styles.campo}>
        <Text style={styles.label}>Ubicación</Text>
        <Text style={styles.labelSub}>Dirección o descripción del lugar donde está instalado</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Depósito planta baja, sector B"
          placeholderTextColor={C.textMuted}
          value={form.ubicacion}
          onChangeText={t => setField('ubicacion', t)}
        />
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoIcono}>ℹ️</Text>
        <Text style={styles.infoText}>
          Una vez agregado el equipo, podrás configurar los rangos de temperatura,
          alertas y otros parámetros desde la pantalla de configuración.
        </Text>
      </View>

      {/* Botones */}
      <TouchableOpacity
        style={[styles.btnPrimario, cargando && styles.btnDisabled]}
        onPress={handleAgregar}
        disabled={cargando}
        activeOpacity={0.85}
      >
        {cargando
          ? <ActivityIndicator color={C.black} />
          : <Text style={styles.btnPrimarioText}>Agregar equipo</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btnSecundario}
        onPress={() => router.back()}
        activeOpacity={0.75}
      >
        <Text style={styles.btnSecundarioText}>Cancelar</Text>
      </TouchableOpacity>

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
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  descripcion: {
    color: C.textSub,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  campo: {
    marginBottom: Spacing.md,
  },
  label: {
    color: C.text,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    marginBottom: 2,
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
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: C.text,
    fontSize: FontSizes.md,
  },
  inputError: {
    borderColor: C.critico,
  },
  inputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: C.critico,
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: C.primaryBg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(126,211,33,0.25)',
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    alignItems: 'flex-start',
  },
  infoIcono: {
    fontSize: 16,
  },
  infoText: {
    color: C.textSub,
    fontSize: FontSizes.sm,
    flex: 1,
    lineHeight: 20,
  },
  btnPrimario: {
    backgroundColor: C.primary,
    borderRadius: Radius.full,
    padding: Spacing.md,
    alignItems: 'center',
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
  },
  btnSecundarioText: {
    color: C.textSub,
    fontSize: FontSizes.md,
  },
});

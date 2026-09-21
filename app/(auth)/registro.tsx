import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';

const C = Colors?.centinela ?? {
  bg: '#080c10', card: '#0d1219', border: '#1a2332',
  green: '#7ed321', text: '#f0f4ff', sub: '#a0afbe', muted: '#607080',
};
const labelColor = '#a0afbe';

export default function RegistroScreen() {
  const { registro } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ nombre: '', apellido: '', mail: '', password: '', confirmar: '', telefono: '' });
  const [cargando, setCargando] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleRegistro() {
    if (!form.nombre || !form.apellido || !form.mail || !form.password) {
      Alert.alert('Campos requeridos', 'Completá nombre, apellido, email y contraseña.');
      return;
    }
    if (form.password !== form.confirmar) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }
    if (form.password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setCargando(true);
    const res = await registro({
      mail: form.mail.trim().toLowerCase(),
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      password: form.password,
      telefono: form.telefono.trim() || undefined,
    });
    setCargando(false);
    if (res.ok) {
      router.push({ pathname: '/(auth)/verificar-email', params: { mail: form.mail.trim().toLowerCase() } });
    } else {
      Alert.alert('Error al registrarse', res.mensaje);
    }
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.logo}>tele<Text style={{ color: '#7ed321' }}>met</Text></Text>
      <Text style={s.title}>Crear cuenta</Text>
      <Text style={s.sub}>Completá tus datos para empezar</Text>

      <View style={s.row}>
        <View style={[s.field, { flex: 1, marginRight: 8 }]}>
          <Text style={s.label}>Nombre *</Text>
          <TextInput style={s.input} value={form.nombre} onChangeText={v => set('nombre', v)} placeholder="Juan" placeholderTextColor={C.muted} autoCapitalize="words" />
        </View>
        <View style={[s.field, { flex: 1 }]}>
          <Text style={s.label}>Apellido *</Text>
          <TextInput style={s.input} value={form.apellido} onChangeText={v => set('apellido', v)} placeholder="Pérez" placeholderTextColor={C.muted} autoCapitalize="words" />
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.label}>Email *</Text>
        <TextInput style={s.input} value={form.mail} onChangeText={v => set('mail', v)} placeholder="tu@email.com" placeholderTextColor={C.muted} keyboardType="email-address" autoCapitalize="none" />
      </View>

      <View style={s.field}>
        <Text style={s.label}>Teléfono</Text>
        <TextInput style={s.input} value={form.telefono} onChangeText={v => set('telefono', v)} placeholder="+54 9 ..." placeholderTextColor={C.muted} keyboardType="phone-pad" />
      </View>

      <View style={s.field}>
        <Text style={s.label}>Contraseña *</Text>
        <TextInput style={s.input} value={form.password} onChangeText={v => set('password', v)} placeholder="Mínimo 6 caracteres" placeholderTextColor={C.muted} secureTextEntry />
      </View>

      <View style={s.field}>
        <Text style={s.label}>Confirmar contraseña *</Text>
        <TextInput style={s.input} value={form.confirmar} onChangeText={v => set('confirmar', v)} placeholder="Repetí la contraseña" placeholderTextColor={C.muted} secureTextEntry />
      </View>

      <TouchableOpacity style={s.btn} onPress={handleRegistro} disabled={cargando}>
        {cargando ? <ActivityIndicator color="#080c10" /> : <Text style={s.btnText}>Crear cuenta</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={s.link}>
        <Text style={s.linkText}>Ya tengo cuenta — Iniciar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:    { flex: 1, backgroundColor: C.bg },
  container: { padding: 28, paddingTop: 60, paddingBottom: 40, maxWidth: 440, width: '100%', alignSelf: 'center' },
  logo:      { fontSize: 28, fontWeight: '800', color: C.text, marginBottom: 24 },
  title:     { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 6 },
  sub:       { fontSize: 14, color: '#a0afbe', marginBottom: 28 },
  row:       { flexDirection: 'row' },
  field:     { marginBottom: 16 },
  label:     { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, color: '#a0afbe', marginBottom: 6, fontWeight: '600' },
  input:     { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, fontSize: 15, color: C.text },
  btn:       { backgroundColor: '#7ed321', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 24, marginBottom: 8 },
  btnText:   { color: '#080c10', fontWeight: '800', fontSize: 17 },
  link:      { marginTop: 20, alignItems: 'center' },
  linkText:  { color: C.green, fontSize: 14 },
});

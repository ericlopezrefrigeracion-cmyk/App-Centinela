import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';

const C = Colors?.centinela ?? {
  bg: '#080c10', card: '#0d1219', border: '#1a2332',
  green: '#7ed321', text: '#f0f4ff', sub: '#a0afbe', muted: '#607080',
};

export default function VerificarEmailScreen() {
  const { verificarEmail, reenviarVerificacion, login } = useAuth();
  const router = useRouter();
  const { mail, password } = useLocalSearchParams();
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  async function handleVerificar() {
    if (codigo.length < 4) {
      Alert.alert('Error', 'Ingresá el código que recibiste por email.');
      return;
    }
    setCargando(true);
    const res = await verificarEmail(mail as string, codigo.trim());
    if (res.ok) {
      Alert.alert('Email verificado', 'Tu cuenta está activa. Iniciá sesión.');
      router.replace('/(auth)/login');
    } else {
      Alert.alert('Código incorrecto', res.mensaje);
    }
    setCargando(false);
  }

  async function handleReenviar() {
    setReenviando(true);
    await reenviarVerificacion(mail as string);
    setReenviando(false);
    Alert.alert('Código reenviado', 'Revisá tu email.');
  }

  return (
    <View style={s.container}>
      <Text style={s.logo}>tele<Text style={{ color: C.green }}>met</Text></Text>
      <Text style={s.title}>Verificá tu email</Text>
      <Text style={s.sub}>Te enviamos un código a{'\n'}<Text style={{ color: C.green }}>{mail}</Text></Text>

      <View style={s.field}>
        <Text style={s.label}>Código de verificación</Text>
        <TextInput
          style={[s.input, s.inputCodigo]}
          value={codigo}
          onChangeText={setCodigo}
          placeholder="Ej: 123456"
          placeholderTextColor={C.muted}
          keyboardType="number-pad"
          maxLength={8}
          autoFocus
        />
      </View>

      <TouchableOpacity style={s.btn} onPress={handleVerificar} disabled={cargando}>
        {cargando ? <ActivityIndicator color="#080c10" /> : <Text style={s.btnText}>Verificar cuenta</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={s.link} onPress={handleReenviar} disabled={reenviando}>
        <Text style={s.linkText}>
          {reenviando ? 'Reenviando...' : '¿No recibiste el código? Reenviar'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.link} onPress={() => router.replace('/(auth)/login')}>
        <Text style={[s.linkText, { color: C.muted }]}>Volver al inicio de sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#080c10', padding: 28, paddingTop: 80 },
  logo:        { fontSize: 28, fontWeight: '800', color: '#f0f4ff', marginBottom: 32 },
  title:       { fontSize: 24, fontWeight: '800', color: '#f0f4ff', marginBottom: 10 },
  sub:         { fontSize: 15, color: '#a0afbe', marginBottom: 36, lineHeight: 22 },
  field:       { marginBottom: 24 },
  label:       { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, color: '#a0afbe', marginBottom: 8, fontWeight: '600' },
  input:       { backgroundColor: '#0d1219', borderWidth: 1, borderColor: '#1a2332', borderRadius: 10, padding: 14, fontSize: 15, color: '#f0f4ff' },
  inputCodigo: { fontSize: 28, fontWeight: '700', textAlign: 'center', letterSpacing: 8, color: '#f0f4ff' },
  btn:         { backgroundColor: '#7ed321', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  btnText:     { color: '#080c10', fontWeight: '800', fontSize: 17 },
  link:        { marginTop: 16, alignItems: 'center' },
  linkText:    { color: '#7ed321', fontSize: 14 },
});

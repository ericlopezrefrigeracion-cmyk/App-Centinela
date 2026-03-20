import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { authService } from '@/services/services';
import { useAuth } from '@/context/AuthContext';
import { Colors, FontSizes, FontWeights, Spacing, Radius } from '@/constants/theme';

const C = Colors?.centinela ?? {
  background:    '#0d1117',
  card:          '#111823',
  cardAlt:       '#0f1620',
  border:        '#1e2d3a',
  primary:       '#7ed321',
  primaryBg:     'rgba(126, 211, 33, 0.1)',
  primaryBorder: 'rgba(126, 211, 33, 0.25)',
  text:          '#ffffff',
  textSub:       '#8a9ab0',
  textMuted:     '#4a5a6a',
  critico:       '#ff4444',
  white:         '#ffffff',
  black:         '#000000',
};

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [verPass, setVerPass]   = useState(false);
  const [errores, setErrores]   = useState<{ email?: string; password?: string }>({});

  // ── Validación ───────────────────────────────────────
  function validar(): boolean {
    const nuevos: { email?: string; password?: string } = {};

    if (!email.trim()) {
      nuevos.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      nuevos.email = 'El email no es válido';
    }

    if (!password) {
      nuevos.password = 'La contraseña es requerida';
    } else if (password.length < 6) {
      nuevos.password = 'Mínimo 6 caracteres';
    }

    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  }

  // ── Login ────────────────────────────────────────────
  async function handleLogin() {
    if (!validar()) return;

    setCargando(true);
    const resultado = await login(email.trim().toLowerCase(), password);
    setCargando(false);

    if (!resultado.ok) {
      Alert.alert('Error al iniciar sesión', resultado.mensaje);
    }
    // Si ok=true el AuthContext actualiza el estado y _layout.tsx
    // redirige automáticamente a /(tabs)
  }

  // ── Recuperar contraseña ─────────────────────────────
  async function handleRecuperar() {
    if (!email.trim()) {
      Alert.alert(
        'Ingresá tu email',
        'Escribí tu email en el campo de arriba antes de recuperar la contraseña.'
      );
      return;
    }
    try {
      await authService.recuperarPassword(email.trim().toLowerCase());
      Alert.alert(
        'Email enviado',
        'Revisá tu bandeja de entrada para recuperar la contraseña.'
      );
    } catch {
      Alert.alert('Error', 'No se pudo enviar el email. Verificá la dirección ingresada.');
    }
  }

  // ── Render ───────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* Logo */}
        <View style={styles.logoSection}>
          {/* Arcos decorativos */}
          <View style={styles.arcosContainer}>
            {[80, 60, 40].map((size, i) => (
              <View
                key={i}
                style={[styles.arco, {
                  width: size,
                  height: size / 2,
                  borderColor: `rgba(126, 211, 33, ${0.15 + i * 0.15})`,
                  borderTopLeftRadius: size / 2,
                  borderTopRightRadius: size / 2,
                  bottom: 0,
                }]}
              />
            ))}
            <View style={styles.arcoCentro} />
          </View>

          {/* Nombre */}
          <View style={styles.logoRow}>
            <Text style={styles.logoTele}>tele</Text>
            <Text style={styles.logoMet}>met</Text>
          </View>
          <Text style={styles.logoSub}>Centinela</Text>
          <Text style={styles.logoTagline}>Monitoreo de temperatura 24/7</Text>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          <Text style={styles.formTitulo}>Iniciar sesión</Text>

          {/* Email */}
          <View style={styles.campo}>
            <Text style={styles.campoLabel}>Email</Text>
            <TextInput
              style={[styles.input, errores.email ? styles.inputError : null]}
              placeholder="tu@email.com"
              placeholderTextColor={C.textMuted}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setErrores(e => ({ ...e, email: undefined }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            {errores.email && (
              <Text style={styles.errorText}>{errores.email}</Text>
            )}
          </View>

          {/* Contraseña */}
          <View style={styles.campo}>
            <Text style={styles.campoLabel}>Contraseña</Text>
            <View style={styles.passRow}>
              <TextInput
                style={[
                  styles.input,
                  styles.passInput,
                  errores.password ? styles.inputError : null,
                ]}
                placeholder="••••••••"
                placeholderTextColor={C.textMuted}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setErrores(e => ({ ...e, password: undefined }));
                }}
                secureTextEntry={!verPass}
                autoComplete="password"
              />
              <TouchableOpacity
                style={[styles.eyeBtn, errores.password ? styles.inputError : null]}
                onPress={() => setVerPass(v => !v)}
                activeOpacity={0.75}
              >
                <Text style={styles.eyeText}>{verPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {errores.password && (
              <Text style={styles.errorText}>{errores.password}</Text>
            )}
          </View>

          {/* Recuperar contraseña */}
          <TouchableOpacity
            style={styles.recuperarBtn}
            onPress={handleRecuperar}
            activeOpacity={0.75}
          >
            <Text style={styles.recuperarText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          {/* Botón ingresar */}
          <TouchableOpacity
            style={[styles.btn, cargando && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={cargando}
            activeOpacity={0.85}
          >
            {cargando
              ? <ActivityIndicator color={C.black} />
              : <Text style={styles.btnText}>Ingresar →</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Registro */}
        <TouchableOpacity onPress={() => router.push('/(auth)/registro')} style={{ marginBottom: 16, alignItems: 'center' }}>
          <Text style={{ color: C.primary, fontSize: 14 }}>¿No tenés cuenta? Registrate</Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footer}>
          Centinela © 2026 · Telemet
        </Text>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────
//  Estilos
// ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },

  // Logo
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  arcosContainer: {
    width: 90,
    height: 50,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  arco: {
    position: 'absolute',
    borderWidth: 1.5,
    borderBottomWidth: 0,
  },
  arcoCentro: {
    position: 'absolute',
    bottom: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.primary,
  },
  logoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  logoTele: {
    color: C.text,
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.bold,
    letterSpacing: 1,
  },
  logoMet: {
    color: C.primary,
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.bold,
    letterSpacing: 1,
  },
  logoSub: {
    color: C.textSub,
    fontSize: FontSizes.md,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  logoTagline: {
    color: C.textMuted,
    fontSize: FontSizes.sm,
  },

  // Formulario
  form: {
    backgroundColor: C.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: Spacing.lg,
  },
  formTitulo: {
    color: C.text,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.lg,
  },

  // Campos
  campo: {
    marginBottom: Spacing.md,
  },
  campoLabel: {
    color: C.textSub,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: C.cardAlt,
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
  passRow: {
    flexDirection: 'row',
  },
  passInput: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  eyeBtn: {
    backgroundColor: C.cardAlt,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: C.border,
    borderTopRightRadius: Radius.md,
    borderBottomRightRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  eyeText: {
    fontSize: FontSizes.md,
  },
  errorText: {
    color: C.critico,
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs,
  },

  // Recuperar
  recuperarBtn: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
  },
  recuperarText: {
    color: C.primary,
    fontSize: FontSizes.sm,
  },

  // Botón
  btn: {
    backgroundColor: C.primary,
    borderRadius: Radius.full,
    padding: Spacing.md,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: C.black,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },

  // Footer
  footer: {
    textAlign: 'center',
    color: C.textMuted,
    fontSize: FontSizes.xs,
  },
});

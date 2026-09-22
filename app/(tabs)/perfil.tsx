import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Linking
} from 'react-native';
import { Colors, FontSizes, FontWeights, Spacing, Radius } from '@/constants/theme';
import { authService } from '@/services/services';
import { showAlert } from '@/components/AlertProvider';
import { useAuth } from '@/context/AuthContext';

const C = Colors?.centinela ?? {
  background:    '#0d1117',
  card:          '#111823',
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

function FilaDato({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.filaDato}>
      <Text style={styles.filaLabel}>{label}</Text>
      <Text style={styles.filaValor}>{valor || '—'}</Text>
    </View>
  );
}

export default function PerfilScreen() {
  const { logout } = useAuth();
  const [usuario, setUsuario]   = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarPerfil();
  }, []);

  async function cargarPerfil() {
    try {
      const data = await authService.getPerfil();
      setUsuario({
        nombre:   data.nombre,
        apellido: data.apellido,
        email:    data.mail,
        telefono: data.telefono ?? '',
        cuit:     data.cuit ?? '',
      });
    } catch (e) {
      console.log('Error cargando perfil:', e);
    } finally {
      setCargando(false);
    }
  }

  async function handleLogout() {
    showAlert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout() },
    ]);
  }

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(usuario?.nombre?.[0] ?? '') + (usuario?.apellido?.[0] ?? '')}
          </Text>
        </View>
        <Text style={styles.nombre}>{usuario?.nombre} {usuario?.apellido}</Text>
        <Text style={styles.email}>{usuario?.email}</Text>
      </View>

      {/* Datos personales */}
      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>Datos personales</Text>
        <FilaDato label="Nombre"   valor={`${usuario?.nombre ?? ''} ${usuario?.apellido ?? ''}`} />
        <FilaDato label="Email"    valor={usuario?.email ?? ''} />
        <FilaDato label="Teléfono" valor={usuario?.telefono ?? ''} />
        <FilaDato label="CUIT"     valor={usuario?.cuit ?? ''} />
      </View>

      {/* Soporte */}
      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>Soporte</Text>
        <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL('https://wa.me/543385470666')}>
          <Text style={styles.linkText}>💬  WhatsApp Telemet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL('https://telemet.netlify.app')}>
          <Text style={styles.linkText}>🌐  telemet.netlify.app</Text>
        </TouchableOpacity>
      </View>

      {/* Cerrar sesión */}
      <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
        <Text style={styles.btnLogoutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Centinela v1.0 · Telemet © 2026</Text>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: C.background },
  scroll:     { padding: Spacing.lg, paddingBottom: 40, maxWidth: 600, width: '100%', alignSelf: 'center' },
  centrado:   { flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' },

  header:     { alignItems: 'center', marginBottom: Spacing.xl },
  avatar:     { width: 72, height: 72, borderRadius: 36, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 26, fontWeight: '800', color: C.black },
  nombre:     { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: C.text, marginBottom: 4 },
  email:      { fontSize: FontSizes.sm, color: C.textSub },

  seccion:       { backgroundColor: C.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border, padding: Spacing.md, marginBottom: Spacing.lg },
  seccionTitulo: { fontSize: FontSizes.xs, textTransform: 'uppercase', letterSpacing: 0.8, color: C.textMuted, fontWeight: FontWeights.bold, marginBottom: Spacing.sm },

  filaDato:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  filaLabel: { fontSize: FontSizes.sm, color: C.textSub },
  filaValor: { fontSize: FontSizes.sm, color: C.text, fontWeight: FontWeights.medium },

  linkRow:  { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  linkText: { fontSize: FontSizes.sm, color: C.primary },

  btnLogout:     { backgroundColor: 'rgba(255,68,68,0.1)', borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,68,68,0.2)', marginBottom: Spacing.lg },
  btnLogoutText: { color: C.critico, fontWeight: FontWeights.bold, fontSize: FontSizes.md },

  version: { textAlign: 'center', color: C.textMuted, fontSize: FontSizes.xs },
});

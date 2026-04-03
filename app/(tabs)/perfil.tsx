import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Switch, Linking, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Colors, FontSizes, FontWeights, Spacing, Radius } from '@/constants/theme';
import { authService } from '@/services/services';
import { useAuth } from '@/context/AuthContext';

// Configurar comportamiento de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

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
  const [notifActivas, setNotifActivas] = useState(false);
  const [permisoEstado, setPermisoEstado] = useState('undetermined');

  useEffect(() => {
    cargarPerfil();
    verificarPermisos();
  }, []);

  async function verificarPermisos() {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPermisoEstado(status);
      const guardado = await AsyncStorage.getItem('centinela_notif');
      setNotifActivas(status === 'granted' && guardado === 'true');
    } catch {}
  }

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

  async function registrarTokenFCM() {
    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      const fcmToken = tokenData.data;
      const plataforma = Platform.OS === 'ios' ? 'ios' : 'android';
      await authService.registrarFcmToken(fcmToken, plataforma);
      await AsyncStorage.setItem('centinela_fcm_token', fcmToken);
    } catch (e) {
      console.log('Error registrando FCM token:', e);
    }
  }

  async function toggleNotif(val: boolean) {
    if (val) {
      // Solicitar permiso
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso denegado',
          'Para recibir alertas, habilitá las notificaciones en la configuración del sistema.'
        );
        return;
      }
      setPermisoEstado(status);
      setNotifActivas(true);
      await AsyncStorage.setItem('centinela_notif', 'true');
      await registrarTokenFCM();
      Alert.alert('Notificaciones activadas', 'Vas a recibir alertas cuando la temperatura salga de rango.');
    } else {
      setNotifActivas(false);
      await AsyncStorage.setItem('centinela_notif', 'false');
      // Eliminar token del servidor
      try {
        const token = await AsyncStorage.getItem('centinela_fcm_token');
        if (token) {
          await authService.eliminarFcmToken(token);
          await AsyncStorage.removeItem('centinela_fcm_token');
        }
      } catch {}
    }
  }

  async function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: async () => {
        // Eliminar token FCM al cerrar sesión
        try {
          const token = await AsyncStorage.getItem('centinela_fcm_token');
          if (token) {
            await authService.eliminarFcmToken(token);
            await AsyncStorage.removeItem('centinela_fcm_token');
          }
        } catch {}
        logout();
      }},
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

      {/* Notificaciones */}
      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>Notificaciones push</Text>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Recibir alertas de temperatura</Text>
            <Text style={styles.switchSub}>
              {permisoEstado === 'granted'
                ? notifActivas ? 'Activas — recibirás alertas al instante' : 'Permiso otorgado pero desactivadas'
                : 'Se solicitará permiso al activar'}
            </Text>
          </View>
          <Switch
            value={notifActivas}
            onValueChange={toggleNotif}
            trackColor={{ false: C.border, true: 'rgba(126,211,33,0.4)' }}
            thumbColor={notifActivas ? C.primary : '#666'}
          />
        </View>
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
  scroll:     { padding: Spacing.lg, paddingBottom: 40 },
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

  switchRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, gap: 12 },
  switchLabel: { fontSize: FontSizes.sm, color: C.text, marginBottom: 2 },
  switchSub:   { fontSize: FontSizes.xs, color: C.textMuted },

  linkRow:  { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  linkText: { fontSize: FontSizes.sm, color: C.primary },

  btnLogout:     { backgroundColor: 'rgba(255,68,68,0.1)', borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,68,68,0.2)', marginBottom: Spacing.lg },
  btnLogoutText: { color: C.critico, fontWeight: FontWeights.bold, fontSize: FontSizes.md },

  version: { textAlign: 'center', color: C.textMuted, fontSize: FontSizes.xs },
});

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Colores con fallback directo para evitar errores en la carga inicial
const C = Colors?.centinela ?? {
  background: '#0d1117',
  card:        '#111823',
  text:        '#ffffff',
  primary:     '#7ed321',
};

export const unstable_settings = {
  anchor: '(tabs)',
};

// ─── Componente interno que maneja la redirección ────
function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { estaLogueado, cargando } = useAuth();

  // Redirige según si hay sesión activa o no
  useEffect(() => {
    if (cargando) return;
    if (estaLogueado) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  }, [estaLogueado, cargando]);

  // Pantalla de carga mientras verifica la sesión guardada
  if (cargando) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Pantallas de Centinela */}
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen
          name="equipo/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: C.card },
            headerTintColor: C.text,
            headerTitle: 'Datos del Equipo',
          }}
        />
        <Stack.Screen
          name="equipo/configurar/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: C.card },
            headerTintColor: C.text,
            headerTitle: 'Configurar Equipo',
          }}
        />
        <Stack.Screen
          name="equipo/agregar"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: C.card },
            headerTintColor: C.text,
            headerTitle: 'Agregar Equipo',
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

// ─── Layout raíz — envuelve todo en AuthProvider ─────
export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ErrorBoundary>
  );
}
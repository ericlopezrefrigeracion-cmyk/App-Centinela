import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        // Usa el verde de Centinela para el tab activo
        tabBarActiveTintColor: Colors.centinela.primary,
        tabBarInactiveTintColor: Colors.centinela.textMuted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: Colors.centinela.card,
          borderTopColor: Colors.centinela.border,
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}>

      {/* Tab principal — lista de equipos */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Equipos',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="thermometer.medium" color={color} />
          ),
        }}
      />

      {/* Tab alertas */}
      <Tabs.Screen
        name="alertas"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="bell.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="historicos"
        options={{
          title: 'Históricos',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="chart.bar.fill" color={color} />
          ),
        }}
      />

      {/* Tab perfil */}
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
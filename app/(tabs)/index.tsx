import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { equipoService } from '@/services/services';
import { Colors, FontSizes, FontWeights, Spacing, Radius, Shadow } from '@/constants/theme';

const C = Colors.centinela;

// ─────────────────────────────────────────────────────
//  Tipos
// ─────────────────────────────────────────────────────
type EstadoEquipo = 'normal' | 'alerta' | 'critico' | 'desconectado';
type NivelSenal  = 'buena' | 'normal' | 'baja';

interface Equipo {
  id:             number;
  nombre:         string;
  temperatura:    number | null;
  senal:          NivelSenal;
  estado:         EstadoEquipo;
  ultimaConexion: string | null;
}

// ─────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────
function colorEstado(estado: EstadoEquipo): string {
  const mapa: Record<EstadoEquipo, string> = {
    normal:       C.normal,
    alerta:       C.alerta,
    critico:      C.critico,
    desconectado: C.desconectado,
  };
  return mapa[estado] ?? C.desconectado;
}

function infoSenal(senal: NivelSenal) {
  const mapa = {
    buena:  { texto: 'Señal buena',  color: C.senalBuena,  icono: '▋▋▋' },
    normal: { texto: 'Señal normal', color: C.senalNormal, icono: '▋▋░' },
    baja:   { texto: 'Señal baja',   color: C.senalBaja,   icono: '▋░░' },
  };
  return mapa[senal] ?? { texto: 'Sin señal', color: C.desconectado, icono: '░░░' };
}

// ─────────────────────────────────────────────────────
//  Componente — Tarjeta de equipo
// ─────────────────────────────────────────────────────
function EquipoCard({ equipo }: { equipo: Equipo }) {
  const col    = colorEstado(equipo.estado);
  const senal  = infoSenal(equipo.senal);

  return (
    <View style={[styles.card, { borderLeftColor: col }]}>

      {/* Encabezado */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <View style={[styles.statusDot, { backgroundColor: col }]} />
          <Text style={styles.cardName}>{equipo.nombre}</Text>
        </View>
        <View style={[styles.estadoBadge, { backgroundColor: col + '22', borderColor: col }]}>
          <Text style={[styles.estadoText, { color: col }]}>
            {equipo.estado?.toUpperCase() ?? 'SIN DATOS'}
          </Text>
        </View>
      </View>

      {/* Temperatura */}
      <View style={styles.tempRow}>
        <Text style={[styles.tempValue, { color: col }]}>
          {equipo.temperatura != null
            ? `${Number(equipo.temperatura).toFixed(1)}°C`
            : '---'}
        </Text>
        <Text style={styles.tempLabel}>temperatura actual</Text>
      </View>

      {/* Señal */}
      <View style={styles.senalRow}>
        <Text style={[styles.senalIcono, { color: senal.color }]}>{senal.icono}</Text>
        <Text style={[styles.senalTexto, { color: senal.color }]}>{senal.texto}</Text>
      </View>

      {/* Última conexión */}
      {equipo.ultimaConexion && (
        <Text style={styles.ultimaConexion}>
          Última conexión: {new Date(equipo.ultimaConexion).toLocaleString('es-AR')}
        </Text>
      )}

      {/* Acciones */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push(`/equipo/${equipo.id}`)}
          activeOpacity={0.75}
        >
          <Text style={styles.actionIcon}>📊</Text>
          <Text style={styles.actionText}>Ver datos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push(`/equipo/configurar/${equipo.id}`)}
          activeOpacity={0.75}
        >
          <Text style={styles.actionIcon}>⚙️</Text>
          <Text style={styles.actionText}>Configurar</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────
//  Pantalla principal
// ─────────────────────────────────────────────────────
export default function HomeScreen() {
  const { usuario, logout } = useAuth();
  const [equipos, setEquipos]         = useState<Equipo[]>([]);
  const [cargando, setCargando]       = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const cargarEquipos = useCallback(async (esRefresh = false) => {
    try {
      esRefresh ? setRefrescando(true) : setCargando(true);
      setError(null);
      const data = await equipoService.getMisEquipos();
      setEquipos(data.map((e: any) => ({
        ...e,
        // Mapear rssi a nivel de señal
        senal: !e.rssi ? 'baja'
              : e.rssi > -60 ? 'buena'
              : e.rssi > -75 ? 'normal'
              : 'baja',
        // Mapear estado de la API al estado visual
        estado: e.estado === 'vinculado' && e.ultimaConexion
          ? (() => {
              const mins = (Date.now() - new Date(e.ultimaConexion).getTime()) / 60000;
              return mins > 15 ? 'desconectado' : 'normal';
            })()
          : e.estado === 'vinculado' ? 'normal'
          : 'desconectado',
      })));
    } catch (err) {
      setError('No se pudieron cargar los equipos. Revisá tu conexión.');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => { cargarEquipos(); }, []);

  // Auto-refresh cada 60 segundos
  useEffect(() => {
    const intervalo = setInterval(() => cargarEquipos(true), 60000);
    return () => clearInterval(intervalo);
  }, []);

  function handleLogout() {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
      ]
    );
  }

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.cargandoText}>Cargando equipos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Hola, {usuario?.nombre ?? 'Usuario'}</Text>
          <View style={styles.logoRow}>
            <Text style={styles.logoTele}>tele</Text>
            <Text style={styles.logoMet}>met</Text>
            <Text style={styles.logoCentinela}> · Centinela</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Banner de error */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>⚠️ {error}</Text>
          <TouchableOpacity onPress={() => cargarEquipos()}>
            <Text style={styles.errorBannerRetry}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lista de equipos */}
      <FlatList
        data={equipos}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <EquipoCard equipo={item} />}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => cargarEquipos(true)}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.vacioIcono}>🌡️</Text>
            <Text style={styles.vacioTitulo}>Sin equipos</Text>
            <Text style={styles.vacioSub}>
              Todavía no tenés equipos agregados.{'\n'}
              Tocá el botón + para agregar uno.
            </Text>
          </View>
        }
      />

      {/* Botón flotante agregar */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/equipo/agregar')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.md,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerGreeting: {
    color: C.textSub,
    fontSize: FontSizes.sm,
    marginBottom: 2,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoTele: {
    color: C.text,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  logoMet: {
    color: C.primary,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  logoCentinela: {
    color: C.textSub,
    fontSize: FontSizes.md,
  },
  logoutBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: C.border,
  },
  logoutText: {
    color: C.textSub,
    fontSize: FontSizes.sm,
  },

  // Error
  errorBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,68,68,0.3)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  errorBannerText: {
    color: C.critico,
    fontSize: FontSizes.sm,
    flex: 1,
  },
  errorBannerRetry: {
    color: C.primary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    marginLeft: Spacing.sm,
  },

  // Lista
  lista: {
    padding: Spacing.md,
    paddingBottom: 100,
  },

  // Tarjeta
  card: {
    backgroundColor: C.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 4,
    ...Shadow,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardName: {
    color: C.text,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    flex: 1,
  },
  estadoBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  estadoText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    letterSpacing: 0.5,
  },

  // Temperatura
  tempRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tempValue: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.bold,
  },
  tempLabel: {
    color: C.textMuted,
    fontSize: FontSizes.xs,
  },

  // Señal
  senalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  senalIcono: {
    fontSize: FontSizes.sm,
    letterSpacing: -2,
  },
  senalTexto: {
    fontSize: FontSizes.sm,
  },
  ultimaConexion: {
    color: C.textMuted,
    fontSize: FontSizes.xs,
    marginBottom: Spacing.sm,
  },

  // Acciones
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    backgroundColor: C.cardAlt,
    gap: 2,
  },
  actionIcon: {
    fontSize: 18,
  },
  actionText: {
    color: C.textSub,
    fontSize: FontSizes.xs,
  },

  // Vacío
  vacio: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  vacioIcono: {
    fontSize: 48,
  },
  vacioTitulo: {
    color: C.text,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  vacioSub: {
    color: C.textSub,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 22,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow,
  },
  fabText: {
    color: C.black,
    fontSize: 28,
    fontWeight: FontWeights.bold,
    lineHeight: 32,
  },
});

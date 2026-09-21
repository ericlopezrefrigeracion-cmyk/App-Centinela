import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { Colors, FontSizes, FontWeights, Spacing, Radius } from '@/constants/theme';
import { alertaService, equipoService } from '@/services/services';

const C = Colors?.centinela ?? {
  background:   '#0d1117',
  card:         '#111823',
  cardAlt:      '#0f1620',
  border:       '#1e2d3a',
  primary:      '#7ed321',
  primaryBg:    'rgba(126, 211, 33, 0.1)',
  primaryBorder:'rgba(126, 211, 33, 0.25)',
  text:         '#ffffff',
  textSub:      '#8a9ab0',
  textMuted:    '#4a5a6a',
  normal:       '#7ed321',
  alerta:       '#f5a623',
  critico:      '#ff4444',
  desconectado: '#4a5a6a',
  white:        '#ffffff',
  black:        '#000000',
};

// ─────────────────────────────────────────────────────
//  Tipos
// ─────────────────────────────────────────────────────
type TipoAlerta = 'temperatura' | 'desconexion' | 'reconexion';

interface Alerta {
  id:        number;
  equipo_id: string;
  fecha:     string;
  equipo:    string;  // nombre del equipo
  tipo:      TipoAlerta;
  descripcion: string;
  vista:     boolean;
}

// ─────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────
function infoTipo(tipo: TipoAlerta) {
  const mapa = {
    temperatura:  { icono: '🌡️', color: C.critico,      label: 'Temperatura' },
    desconexion:  { icono: '📵', color: C.desconectado,  label: 'Desconexión' },
    reconexion:   { icono: '✅', color: C.normal,        label: 'Reconexión'  },
  };
  return mapa[tipo] ?? { icono: '⚠️', color: C.alerta, label: 'Alerta' };
}

function formatFecha(fechaStr: string): string {
  const fecha = new Date(fechaStr);
  return fecha.toLocaleString('es-AR', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

// ─────────────────────────────────────────────────────
//  Componente — fila de alerta
// ─────────────────────────────────────────────────────
function AlertaItem({
  alerta,
  onMarcarVista,
}: {
  alerta: Alerta;
  onMarcarVista: (id: number) => void;
}) {
  const info = infoTipo(alerta.tipo);

  return (
    <View style={[styles.item, !alerta.vista && styles.itemNoVista]}>
      {/* Indicador lateral de color */}
      <View style={[styles.itemBorde, { backgroundColor: info.color }]} />

      {/* Icono */}
      <View style={[styles.itemIcono, { backgroundColor: info.color + '22' }]}>
        <Text style={styles.itemIconoText}>{info.icono}</Text>
      </View>

      {/* Contenido */}
      <View style={styles.itemContenido}>
        <View style={styles.itemHeader}>
          {/* Badge tipo */}
          <View style={[styles.tipoBadge, { backgroundColor: info.color + '22', borderColor: info.color }]}>
            <Text style={[styles.tipoText, { color: info.color }]}>{info.label}</Text>
          </View>
          {/* Punto de no leída */}
        </View>

        <Text style={styles.equipoNombre}>{alerta.equipo}</Text>
        <Text style={styles.descripcion}>{alerta.descripcion}</Text>
        <Text style={styles.fecha}>{formatFecha(alerta.fecha)}</Text>
      </View>

      {/* Botón marcar como vista */}
      {!alerta.vista && (
        <TouchableOpacity
          style={styles.vistaBtn}
          onPress={() => onMarcarVista(alerta.id)}
          activeOpacity={0.75}
        >
          <Text style={styles.vistaBtnText}>✓</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────
//  Pantalla Alertas
// ─────────────────────────────────────────────────────
export default function AlertasScreen() {
  const [alertas, setAlertas]         = useState<Alerta[]>([]);
  const [cargando, setCargando]       = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const cargarAlertas = useCallback(async (esRefresh = false) => {
    try {
      esRefresh ? setRefrescando(true) : setCargando(true);
      setError(null);
      // Cargar alertas y equipos en paralelo para mapear nombres
      const [data, equipos] = await Promise.all([
        alertaService.getAlertas(),
        equipoService.getMisEquipos(),
      ]);
      const lista = Array.isArray(data) ? data : (data?.items ?? []);
      // Crear mapa id -> nombre
      const mapaEquipos: Record<string, string> = {};
      equipos.forEach((e: any) => { mapaEquipos[e.id] = e.nombre; });
      setAlertas(lista.map((a: any) => ({
        ...a,
        equipo:      mapaEquipos[a.equipo_id] ?? 'Equipo desconocido',
        descripcion: a.tipo + (a.valor != null ? ` — ${a.valor}°C` : ''),
        vista:       a.leida,
      })));
    } catch {
      setError('No se pudieron cargar las alertas.');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => { cargarAlertas(); }, []);

  // Marcar una alerta como vista
  async function handleMarcarVista(id: number) {
    try {
      await alertaService.marcarLeida(id);
      setAlertas(prev =>
        prev.map(a => a.id === id ? { ...a, vista: true, leida: true } : a)
      );
    } catch {
      Alert.alert('Error', 'No se pudo marcar la alerta como vista.');
    }
  }

  // Marcar todas como vistas (agrupadas por equipo para minimizar requests)
  async function handleMarcarTodas() {
    Alert.alert(
      'Marcar todas como vistas',
      '¿Querés marcar todas las alertas como vistas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              const noVistas = alertas.filter(a => !a.vista);
              const equipoIds = [...new Set(noVistas.map(a => a.equipo_id))];
              await Promise.all(equipoIds.map(id => alertaService.marcarTodasLeidas(id)));
              setAlertas(prev => prev.map(a => ({ ...a, vista: true })));
            } catch {
              Alert.alert('Error', 'No se pudieron marcar las alertas.');
            }
          },
        },
      ]
    );
  }

  const cantNoVistas = alertas.filter(a => !a.vista).length;

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.cargandoText}>Cargando alertas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitulo}>Alertas</Text>
          {cantNoVistas > 0 && (
            <Text style={styles.headerSub}>
              {cantNoVistas} sin leer
            </Text>
          )}
        </View>
        {cantNoVistas > 0 && (
          <TouchableOpacity
            style={styles.marcarTodasBtn}
            onPress={handleMarcarTodas}
            activeOpacity={0.75}
          >
            <Text style={styles.marcarTodasText}>Marcar todas</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity onPress={() => cargarAlertas()}>
            <Text style={styles.errorRetry}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lista */}
      <FlatList
        data={alertas}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <AlertaItem alerta={item} onMarcarVista={handleMarcarVista} />
        )}
        contentContainerStyle={[styles.lista, styles.listaAncha]}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => cargarAlertas(true)}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.vacioIcono}>🔕</Text>
            <Text style={styles.vacioTitulo}>Sin alertas</Text>
            <Text style={styles.vacioSub}>
              No tenés alertas pendientes.{'\n'}
              Todo está funcionando correctamente.
            </Text>
          </View>
        }
      />
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
  headerTitulo: {
    color: C.text,
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
  },
  headerSub: {
    color: C.critico,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  marcarTodasBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: C.primary,
  },
  marcarTodasText: {
    color: C.primary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
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
  errorText: {
    color: C.critico,
    fontSize: FontSizes.sm,
    flex: 1,
  },
  errorRetry: {
    color: C.primary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
  },

  // Lista -- es un feed cronológico, así que en pantallas anchas se acota el ancho en vez de
  // pasar a grilla (mantiene el orden de lectura de arriba hacia abajo).
  lista: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  listaAncha: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },

  // Item alerta
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  itemNoVista: {
    borderColor: 'rgba(126, 211, 33, 0.2)',
    backgroundColor: 'rgba(126, 211, 33, 0.03)',
  },
  itemBorde: {
    width: 4,
    alignSelf: 'stretch',
  },
  itemIcono: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    margin: Spacing.sm,
  },
  itemIconoText: {
    fontSize: 20,
  },
  itemContenido: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  tipoBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  tipoText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    letterSpacing: 0.5,
  },
  puntoPendiente: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
  },
  equipoNombre: {
    color: C.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    marginBottom: 2,
  },
  descripcion: {
    color: C.textSub,
    fontSize: FontSizes.sm,
    lineHeight: 18,
    marginBottom: 4,
  },
  fecha: {
    color: C.textMuted,
    fontSize: FontSizes.xs,
  },

  // Botón marcar vista
  vistaBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primaryBg,
    borderWidth: 1,
    borderColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  vistaBtnText: {
    color: C.primary,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
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
});

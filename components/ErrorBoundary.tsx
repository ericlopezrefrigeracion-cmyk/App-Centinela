import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, FontSizes, FontWeights, Spacing, Radius } from '@/constants/theme';

const C = Colors?.centinela ?? {
  background: '#0d1117',
  card:       '#111823',
  border:     '#1e2d3a',
  primary:    '#7ed321',
  text:       '#ffffff',
  textSub:    '#8a9ab0',
  critico:    '#ff4444',
};

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary atrapó un error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.icono}>⚠️</Text>
          <Text style={styles.titulo}>Algo salió mal</Text>
          <Text style={styles.mensaje}>
            {this.state.error?.message ?? 'Error inesperado'}
          </Text>
          <TouchableOpacity
            style={styles.boton}
            onPress={() => this.setState({ hasError: false, error: undefined })}
          >
            <Text style={styles.botonTexto}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  icono: {
    fontSize: 48,
  },
  titulo: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: C.text,
  },
  mensaje: {
    fontSize: FontSizes.sm,
    color: C.textSub,
    textAlign: 'center',
    lineHeight: 22,
  },
  boton: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: C.primary,
  },
  botonTexto: {
    color: C.primary,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
});

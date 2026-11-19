import { Component, type ErrorInfo, type ReactNode } from 'react';
import { C, FontSizes, FontWeights, Radius, Spacing } from '../lib/tema';
import { Tocable } from './ui';

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

// Si una pantalla falla, muestra el error con un botón para reintentar en vez de dejar la página en blanco.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary atrapó un error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, gap: Spacing.md }}>
          <span style={{ fontSize: 48 }}>⚠️</span>
          <span style={{ fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: C.text }}>Algo salió mal</span>
          <span style={{ fontSize: FontSizes.sm, color: C.textSub, textAlign: 'center', lineHeight: '22px' }}>
            {this.state.error?.message ?? 'Error inesperado'}
          </span>
          <Tocable
            estilo={{ marginTop: Spacing.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: C.primary }}
            onPress={() => this.setState({ hasError: false, error: undefined })}
          >
            <span style={{ color: C.primary, fontSize: FontSizes.md, fontWeight: FontWeights.bold }}>Reintentar</span>
          </Tocable>
        </div>
      );
    }
    return this.props.children;
  }
}

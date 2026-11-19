import { Component, type ErrorInfo, type ReactNode } from 'react';
import { C, FontSizes, FontWeights, Spacing } from '../lib/tema';
import { Icono } from './iconos';
import { Boton } from './ui';

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
          <Icono nombre="alerta" tamano={44} color={C.ambar} />
          <span style={{ fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: C.text }}>Algo salió mal</span>
          <span style={{ fontSize: FontSizes.sm, color: C.textSub, textAlign: 'center', lineHeight: '22px' }}>
            {this.state.error?.message ?? 'Error inesperado'}
          </span>
          <Boton variante="secundario" estilo={{ marginTop: Spacing.md }} onPress={() => this.setState({ hasError: false, error: undefined })}>
            Reintentar
          </Boton>
        </div>
      );
    }
    return this.props.children;
  }
}

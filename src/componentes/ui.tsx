// Piezas básicas de la interfaz (equivalentes web de los componentes de React Native que se usaban).
import { forwardRef, useEffect, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { e, type ListaEstilos } from '../lib/estilo';

// ── Botón táctil (TouchableOpacity) ─────────────────
export function Tocable({
  estilo, onPress, disabled, opacidadActiva = 0.2, children, etiqueta,
}: {
  estilo?: ListaEstilos;
  onPress?: () => void;
  disabled?: boolean;
  opacidadActiva?: number;
  children?: ReactNode;
  etiqueta?: string;
}) {
  function activar() {
    if (!disabled) onPress?.();
  }
  function teclado(ev: KeyboardEvent) {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      activar();
    }
  }
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled ? 'true' : undefined}
      aria-label={etiqueta}
      className="tocable"
      style={{ ...e(estilo), ['--opacidad-activa' as string]: String(opacidadActiva) } as CSSProperties}
      onClick={activar}
      onKeyDown={teclado}
    >
      {children}
    </div>
  );
}

// ── Indicador de carga (ActivityIndicator) ──────────
export function Spinner({ tamano = 'small', color = '#1976D2' }: { tamano?: 'small' | 'large'; color?: string }) {
  const lado = tamano === 'large' ? 36 : 20;
  return (
    <div role="progressbar" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: lado, height: lado, animation: 'girar 0.75s linear infinite' }}>
        <svg height="100%" viewBox="0 0 32 32" width="100%">
          <circle cx="16" cy="16" fill="none" r="14" strokeWidth="4" style={{ stroke: color, opacity: 0.2 }} />
          <circle cx="16" cy="16" fill="none" r="14" strokeWidth="4" style={{ stroke: color, strokeDasharray: 80, strokeDashoffset: 60 }} />
        </svg>
      </div>
    </div>
  );
}

// ── Zona con desplazamiento (ScrollView) ────────────
export const Desplazable = forwardRef<HTMLDivElement, {
  estilo?: ListaEstilos;
  estiloContenido?: ListaEstilos;
  children?: ReactNode;
  arriba?: ReactNode;
}>(function Desplazable({ estilo, estiloContenido, children, arriba }, ref) {
  return (
    <div ref={ref} className="desplazable" style={e(estilo)}>
      {arriba}
      <div style={e(estiloContenido)}>{children}</div>
    </div>
  );
});

// ── Campo de texto (TextInput) ──────────────────────
export function Campo({
  estilo, valor, onCambio, placeholder, colorPlaceholder, tipo = 'text', multilinea, lineas, maxLength,
  autoCapitalize, autoComplete, inputMode, autoFocus, autoCorrect,
}: {
  estilo?: ListaEstilos;
  valor: string;
  onCambio: (texto: string) => void;
  placeholder?: string;
  colorPlaceholder?: string;
  tipo?: 'text' | 'email' | 'password' | 'tel';
  multilinea?: boolean;
  lineas?: number;
  maxLength?: number;
  autoCapitalize?: 'none' | 'words' | 'characters' | 'sentences';
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric' | 'decimal';
  autoFocus?: boolean;
  autoCorrect?: boolean;
}) {
  const style = { ...e(estilo), ...(colorPlaceholder ? { ['--color-placeholder' as string]: colorPlaceholder } : {}) } as CSSProperties;
  const comunes = {
    value: valor,
    placeholder,
    maxLength,
    autoCapitalize,
    autoComplete,
    autoFocus,
    autoCorrect: autoCorrect === false ? 'off' : undefined,
    spellCheck: autoCorrect === false ? false : undefined,
    dir: 'auto',
    style,
  };
  if (multilinea) {
    return <textarea {...comunes} rows={lineas} onChange={(ev) => onCambio(ev.target.value)} />;
  }
  return <input {...comunes} type={tipo} inputMode={inputMode} onChange={(ev) => onCambio(ev.target.value)} />;
}

// ── Interruptor (Switch de react-native-web) ────────
export function Interruptor({ valor, onCambio, colorPista }: {
  valor: boolean;
  onCambio: (v: boolean) => void;
  colorPista: { false: string; true: string };
}) {
  return (
    <div style={{ width: 40, height: 20, cursor: 'pointer' }}>
      <div style={{ position: 'absolute', top: 3, left: 0, width: 40, height: 14, borderRadius: 10, backgroundColor: valor ? colorPista.true : colorPista.false, transition: 'background-color 0.1s' }} />
      <div
        style={{
          width: 20, height: 20, borderRadius: '100%',
          backgroundColor: valor ? '#009688' : '#FAFAFA',
          boxShadow: 'rgba(0, 0, 0, 0.5) 0px 1px 3px 0px',
          transform: `translateX(${valor ? 20 : 0}px)`,
          transition: 'transform 0.1s',
        }}
      />
      <input
        type="checkbox"
        role="switch"
        checked={valor}
        onChange={(ev) => onCambio(ev.target.checked)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', margin: 0, opacity: 0, cursor: 'pointer' }}
      />
    </div>
  );
}

// ── Ancho de la ventana (useWindowDimensions) ───────
export function useAnchoVentana(): number {
  const [ancho, setAncho] = useState(() => window.innerWidth);
  useEffect(() => {
    const medir = () => setAncho(window.innerWidth);
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);
  return ancho;
}

/** Breakpoints: menos de 600 px celular, menos de 1024 tablet, el resto escritorio. */
export function useBreakpoint() {
  const width = useAnchoVentana();
  const breakpoint = width < 600 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
  return { width, breakpoint, esMobile: breakpoint === 'mobile', esTablet: breakpoint === 'tablet', esDesktop: breakpoint === 'desktop' };
}

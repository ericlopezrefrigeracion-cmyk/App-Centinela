// Piezas básicas de la interfaz (equivalentes web de los componentes de React Native que se usaban).
import { forwardRef, useEffect, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { e, type Estilo, type ListaEstilos } from '../lib/estilo';
import { C, FontWeights, Radius, TOQUE } from '../lib/tema';
import { Icono, type NombreIcono } from './iconos';

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
export function Spinner({ tamano = 'small', color = C.primary }: { tamano?: 'small' | 'large'; color?: string }) {
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

// ── Interruptor ─────────────────────────────────────
export function Interruptor({ valor, onCambio, etiqueta }: {
  valor: boolean;
  onCambio: (v: boolean) => void;
  etiqueta?: string;
}) {
  return (
    <div style={{ width: 48, height: TOQUE, justifyContent: 'center', cursor: 'pointer' }}>
      <div style={{ width: 48, height: 28, borderRadius: 14, backgroundColor: valor ? C.primary : C.pista, transition: 'background-color 0.15s' }}>
        <div
          style={{
            position: 'absolute', top: 3, left: 3, width: 22, height: 22, borderRadius: 11,
            backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.35)',
            transform: `translateX(${valor ? 20 : 0}px)`, transition: 'transform 0.15s',
          }}
        />
      </div>
      <input
        type="checkbox"
        role="switch"
        aria-label={etiqueta}
        checked={valor}
        onChange={(ev) => onCambio(ev.target.checked)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', margin: 0, opacity: 0, cursor: 'pointer' }}
      />
    </div>
  );
}

// ── Botones con el estilo de la app ─────────────────
export type VarianteBoton = 'primario' | 'secundario' | 'peligro' | 'texto';

const VARIANTES: Record<VarianteBoton, { fondo: Estilo; color: string }> = {
  primario: { fondo: { backgroundColor: C.primary }, color: C.sobrePrimary },
  secundario: { fondo: { backgroundColor: C.control, borderWidth: 1, borderColor: C.borderControl }, color: C.text },
  peligro: { fondo: { backgroundColor: C.rojoFondo }, color: C.rojo },
  texto: { fondo: { backgroundColor: 'transparent' }, color: C.verde },
};

/** Botón de ancho completo (48 px de alto) con ícono opcional; muestra un círculo mientras carga. */
export function Boton({
  variante = 'primario', onPress, disabled, cargando, icono, children, estilo, etiqueta,
}: {
  variante?: VarianteBoton;
  onPress?: () => void;
  disabled?: boolean;
  cargando?: boolean;
  icono?: NombreIcono;
  children: ReactNode;
  estilo?: ListaEstilos;
  etiqueta?: string;
}) {
  const v = VARIANTES[variante];
  return (
    <Tocable
      estilo={[
        {
          minHeight: 48, borderRadius: Radius.md, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center',
          justifyContent: 'center', gap: 8, color: v.color,
        },
        v.fondo,
        (disabled || cargando) && { opacity: 0.6 },
        estilo,
      ]}
      onPress={onPress}
      disabled={disabled || cargando}
      opacidadActiva={0.75}
      etiqueta={etiqueta}
    >
      {cargando ? <Spinner color={v.color} /> : (
        <>
          {icono && <Icono nombre={icono} tamano={18} />}
          <span style={{ color: v.color, fontSize: 15, fontWeight: FontWeights.semibold, textAlign: 'center' }}>{children}</span>
        </>
      )}
    </Tocable>
  );
}

/** Botón cuadrado de 44×44 con solo un ícono (siempre con etiqueta para lectores de pantalla). */
export function BotonIcono({ icono, etiqueta, onPress, color = C.text, fondo = C.control, borde }: {
  icono: NombreIcono;
  etiqueta: string;
  onPress?: () => void;
  color?: string;
  fondo?: string;
  borde?: string;
}) {
  return (
    <Tocable
      estilo={[
        { width: TOQUE, height: TOQUE, borderRadius: Radius.md, backgroundColor: fondo, alignItems: 'center', justifyContent: 'center', color },
        borde ? { borderWidth: 1, borderColor: borde } : null,
      ]}
      onPress={onPress}
      etiqueta={etiqueta}
      opacidadActiva={0.6}
    >
      <Icono nombre={icono} tamano={18} />
    </Tocable>
  );
}

/** Tarjeta base: fondo de tarjeta, borde suave y esquinas de 16 px. */
export const tarjeta: Estilo = {
  backgroundColor: C.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border, boxShadow: C.sombra,
};

/** Campo de texto base (48 px de alto). */
export const campoTexto: Estilo = {
  backgroundColor: C.campo, borderWidth: 1, borderColor: C.borderControl, borderRadius: Radius.md,
  paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, color: C.text, fontSize: 15,
};

/** Aviso de error arriba de una lista, con "Reintentar". */
export function AvisoError({ texto, onReintentar }: { texto: string; onReintentar: () => void }) {
  return (
    <div style={e({ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.rojoFondo, borderRadius: Radius.md, paddingVertical: 4, paddingLeft: 14, paddingRight: 4, marginHorizontal: 16, marginBottom: 12, color: C.rojo })}>
      <Icono nombre="alerta" tamano={18} />
      <span style={{ color: C.rojo, fontSize: 13, flex: 1 }}>{texto}</span>
      <Tocable onPress={onReintentar} estilo={{ minHeight: TOQUE, justifyContent: 'center', paddingHorizontal: 10 }}>
        <span style={{ color: C.text, fontSize: 13, fontWeight: FontWeights.semibold }}>Reintentar</span>
      </Tocable>
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

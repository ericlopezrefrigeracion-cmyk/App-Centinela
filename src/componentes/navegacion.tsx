// Barra de pestañas flotante, encabezado de las pantallas apiladas y título de las pestañas.
import type { CSSProperties, ReactNode } from 'react';
import { useNavigate, type NavigateFunction } from 'react-router';
import { C, FontWeights, Radius, TOQUE } from '../lib/tema';
import { Icono, type NombreIcono } from './iconos';
import { useAnchoVentana } from './ui';

export type Pestana = 'equipos' | 'alertas' | 'historicos' | 'perfil';

export const PESTANAS: { clave: Pestana; ruta: string; titulo: string; icono: NombreIcono }[] = [
  { clave: 'equipos', ruta: '/', titulo: 'Equipos', icono: 'termometro' },
  { clave: 'alertas', ruta: '/alertas', titulo: 'Alertas', icono: 'campana' },
  { clave: 'historicos', ruta: '/historicos', titulo: 'Históricos', icono: 'barras' },
  { clave: 'perfil', ruta: '/perfil', titulo: 'Perfil', icono: 'persona' },
];

/** Barra de navegación flotante y redondeada, separada de los bordes de la pantalla. */
export function BarraPestanas({ activa }: { activa: Pestana }) {
  const navigate = useNavigate();
  // Desde 768 px la etiqueta va al lado del ícono
  const alLado = useAnchoVentana() >= 768;

  return (
    <div
      style={{
        backgroundColor: C.background,
        paddingTop: 8,
        paddingLeft: 12,
        paddingRight: 12,
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        role="tablist"
        style={{
          height: 64, flexDirection: 'row', width: '100%', maxWidth: 560, alignSelf: 'center',
          backgroundColor: C.card, borderWidth: 1, borderStyle: 'solid', borderColor: C.border, borderRadius: Radius.xl,
          boxShadow: C.sombra, overflow: 'hidden',
        }}
      >
        {PESTANAS.map((p) => {
          const actual = p.clave === activa;
          const color = actual ? C.verde : C.textSub;
          return (
            <a
              key={p.clave}
              href={p.ruta}
              role="tab"
              aria-selected={actual}
              className="tocable"
              style={{
                flex: 1, display: 'flex', textDecoration: 'none', color, gap: alLado ? 8 : 3,
                flexDirection: alLado ? 'row' : 'column', alignItems: 'center', justifyContent: 'center',
                ['--opacidad-activa' as string]: '0.6',
              } as CSSProperties}
              onClick={(ev) => {
                ev.preventDefault();
                navigate(p.ruta);
              }}
            >
              <Icono nombre={p.icono} tamano={22} />
              <span style={{ color, fontSize: 11, fontWeight: actual ? FontWeights.semibold : FontWeights.medium, whiteSpace: 'nowrap', ...(alLado ? { fontSize: 13 } : {}) }}>
                {p.titulo}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

/** Vuelve a la pantalla anterior; si se entró directo por un enlace, va al inicio. */
export function volver(navigate: NavigateFunction, inicio = '/') {
  const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
  if (idx > 0) navigate(-1);
  else navigate(inicio, { replace: true });
}

/** Encabezado de las pantallas apiladas: botón de volver de 44×44 y el título. */
export function Encabezado({ titulo, inicio = '/' }: { titulo: string; inicio?: string }) {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 12, paddingRight: 16, backgroundColor: C.background }}>
      <a
        href={inicio}
        aria-label="Volver"
        className="tocable"
        style={{
          width: TOQUE, height: TOQUE, borderRadius: Radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: C.card, border: `1px solid ${C.border}`, color: C.text, ['--opacidad-activa' as string]: '0.6',
        } as CSSProperties}
        onClick={(ev) => {
          ev.preventDefault();
          volver(navigate, inicio);
        }}
      >
        <Icono nombre="volver" tamano={20} />
      </a>
      <h1 style={{ margin: 0, color: C.text, fontSize: 18, fontWeight: FontWeights.semibold, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1, minWidth: 0 }}>
        {titulo}
      </h1>
    </div>
  );
}

/** Título de una pestaña (Alertas, Históricos, Perfil), con subtítulo y acción opcionales a la derecha. */
export function TituloPestana({ titulo, sub, colorSub = C.textSub, derecha, anchoMaximo = 800 }: {
  titulo: string;
  sub?: ReactNode;
  colorSub?: string;
  derecha?: ReactNode;
  anchoMaximo?: number;
}) {
  return (
    <div style={{ paddingTop: 22, paddingBottom: 14, paddingLeft: 20, paddingRight: 20, width: '100%', maxWidth: anchoMaximo, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ flexShrink: 1, minWidth: 0 }}>
        <h1 style={{ margin: 0, color: C.text, fontSize: 24, fontWeight: FontWeights.bold, letterSpacing: -0.3, fontFamily: 'inherit' }}>{titulo}</h1>
        {sub ? <span style={{ color: colorSub, fontSize: 13, marginTop: 2 }}>{sub}</span> : null}
      </div>
      {derecha}
    </div>
  );
}

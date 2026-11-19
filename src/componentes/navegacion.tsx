// Barra de pestañas inferior y encabezado de las pantallas apiladas (mismas medidas que tenía
// la navegación de React Navigation).
import type { CSSProperties } from 'react';
import { useNavigate, type NavigateFunction } from 'react-router';
import { C } from '../lib/tema';
import { useAnchoVentana } from './ui';

const FUENTE_NAVEGACION = 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';

// Íconos de Material Icons (los trazos salen de la misma fuente que se usaba antes, 512 unidades).
const ICONOS = {
  equipos: 'M320 277V107Q320 89 311.5 74.5Q303 60 288.5 51.5Q274 43 256 43Q238 43 223.5 51.5Q209 60 200.5 74.5Q192 89 192 107V277Q173 292 161.0 314.5Q149 337 149 363Q149 392 163.5 416.5Q178 441 202.5 455.0Q227 469 256 469Q285 469 309.5 455.0Q334 441 348.5 416.5Q363 392 363 363Q363 337 351.0 314.5Q339 292 320 277ZM235 235V107Q235 98 241.0 91.5Q247 85 256 85Q265 85 271.0 91.5Q277 98 277 107V128H256V149H277V171V192H256V213H277V235Z',
  alertas: 'M384 341 427 384V405H85V384L128 341V235Q128 185 153.5 148.0Q179 111 224 100V85Q224 72 233.0 62.5Q242 53 256.0 53.0Q270 53 279.0 62.5Q288 72 288 85V100Q333 111 358.5 148.0Q384 185 384 235ZM256 469Q238 469 225.5 457.0Q213 445 213 427H299Q299 444 286.0 456.5Q273 469 256 469Z',
  historicos: 'M346 277H405V405H346ZM226 107H286V405H226ZM107 196H171V405H107Z',
  perfil: 'M427 384V427H85V384Q85 346 143.5 322.5Q202 299 256.0 299.0Q310 299 368.5 322.5Q427 346 427 384ZM316.0 231.0Q291 256 256.0 256.0Q221 256 196.0 231.0Q171 206 171.0 171.0Q171 136 196.0 110.5Q221 85 256.0 85.0Q291 85 316.0 110.5Q341 136 341.0 171.0Q341 206 316.0 231.0Z',
};

export type Pestana = 'equipos' | 'alertas' | 'historicos' | 'perfil';

export const PESTANAS: { clave: Pestana; ruta: string; titulo: string }[] = [
  { clave: 'equipos', ruta: '/', titulo: 'Equipos' },
  { clave: 'alertas', ruta: '/alertas', titulo: 'Alertas' },
  { clave: 'historicos', ruta: '/historicos', titulo: 'Históricos' },
  { clave: 'perfil', ruta: '/perfil', titulo: 'Perfil' },
];

export function BarraPestanas({ activa }: { activa: Pestana }) {
  const navigate = useNavigate();
  // Desde 768 px la etiqueta va al lado del ícono (igual que antes)
  const alLado = useAnchoVentana() >= 768;

  return (
    <div
      role="tablist"
      style={{
        backgroundColor: C.card,
        borderTopWidth: 1,
        borderTopColor: C.border,
        height: 'calc(58px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingTop: 8,
      }}
    >
      <div style={{ flex: 1, flexDirection: 'row' }}>
        {PESTANAS.map((p) => {
          const color = p.clave === activa ? C.primary : C.textMuted;
          return (
            <a
              key={p.clave}
              href={p.ruta}
              role="tab"
              aria-selected={p.clave === activa}
              className="tocable"
              style={{
                flex: 1, display: 'flex', padding: 5, textDecoration: 'none', color,
                flexDirection: alLado ? 'row' : 'column', alignItems: 'center', justifyContent: 'center',
                ['--opacidad-activa' as string]: '1',
              }}
              onClick={(ev) => {
                ev.preventDefault();
                navigate(p.ruta);
              }}
            >
              <div style={{ width: 31, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                <svg width={28} height={28} viewBox="0 0 512 512" aria-hidden="true">
                  <path d={ICONOS[p.clave]} fill={color} />
                </svg>
              </div>
              <span
                style={{
                  color, fontSize: 11, fontWeight: 500, fontFamily: FUENTE_NAVEGACION, textAlign: 'center',
                  backgroundColor: 'transparent', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  ...(alLado ? { marginLeft: 5, marginRight: 13, lineHeight: '24px' } : { height: 11, overflow: 'visible' }),
                }}
              >
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

export function Encabezado({ titulo, inicio = '/', fondo = C.card, colorTitulo = C.text }: { titulo: string; inicio?: string; fondo?: string; colorTitulo?: string }) {
  const navigate = useNavigate();
  return (
    <div
      style={{
        height: 64, flexDirection: 'row', alignItems: 'center',
        backgroundColor: fondo, borderBottomWidth: 1, borderBottomColor: 'rgb(39, 39, 41)',
      }}
    >
      <div style={{ width: 52, height: 64, alignItems: 'flex-start', justifyContent: 'center' }}>
        <a
          href={inicio}
          aria-label="Volver"
          className="tocable"
          style={{ marginLeft: 11, width: 30, height: 30, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', ['--opacidad-activa' as string]: '0.3' } as CSSProperties}
          onClick={(ev) => {
            ev.preventDefault();
            volver(navigate, inicio);
          }}
        >
          <svg width={24} height={24} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill={C.text} />
          </svg>
        </a>
      </div>
      <div style={{ marginLeft: 4, justifyContent: 'center', flexShrink: 1 }}>
        <h1 style={{ margin: 0, color: colorTitulo, fontSize: 18, fontWeight: 500, fontFamily: FUENTE_NAVEGACION, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {titulo}
        </h1>
      </div>
    </div>
  );
}

// Selector de tema Claro / Auto / Oscuro (ESTANDARES G1): segmentado de 3 botones para el perfil y
// botón de ícono para la barra que abre las mismas 3 opciones. Aplica al instante, sin recargar.
// Centinela no tiene backend propio: la elección se guarda solo en este dispositivo.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { PREFERENCIAS_TEMA, ROTULOS_TEMA, type PreferenciaTema } from '../lib/preferenciaTema';
import { C, FontWeights, Radius, TOQUE } from '../lib/tema';
import { useTema } from '../lib/temaNavegador';
import { Icono, type NombreIcono } from './iconos';

const ICONOS: Record<PreferenciaTema, NombreIcono> = { claro: 'sol', auto: 'monitor', oscuro: 'luna' };

const botonBase: CSSProperties = {
  appearance: 'none', border: 0, margin: 0, font: 'inherit', cursor: 'pointer',
  display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  minHeight: TOQUE, minWidth: TOQUE, borderRadius: Radius.sm, paddingLeft: 10, paddingRight: 10,
};

/** Segmentado de 3 botones con ícono y rótulo. */
export function SelectorTema({ alElegir }: { alElegir?: () => void }) {
  const { preferencia, elegir } = useTema();
  return (
    <div
      role="group"
      aria-label="Tema"
      style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: Radius.md, backgroundColor: C.control, border: `1px solid ${C.borderControl}` }}
    >
      {PREFERENCIAS_TEMA.map((opcion) => {
        const activa = opcion === preferencia;
        return (
          <button
            key={opcion}
            type="button"
            className="tocable"
            aria-pressed={activa}
            aria-label={`Tema ${ROTULOS_TEMA[opcion].toLowerCase()}`}
            onClick={() => {
              elegir(opcion);
              alElegir?.();
            }}
            style={{
              ...botonBase, flex: 1,
              backgroundColor: activa ? C.card : 'transparent',
              color: activa ? C.text : C.textSub,
              boxShadow: activa ? `0 0 0 1px ${C.border}` : 'none',
              fontWeight: activa ? FontWeights.semibold : FontWeights.medium, fontSize: 14,
              ['--opacidad-activa' as string]: '0.6',
            } as CSSProperties}
          >
            <Icono nombre={ICONOS[opcion]} tamano={18} />
            <span style={{ color: 'inherit', fontSize: 14, fontWeight: 'inherit' }}>{ROTULOS_TEMA[opcion]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Botón de ícono de 44×44 para la barra: muestra el tema elegido y abre las 3 opciones. */
export function BotonTema() {
  const { preferencia } = useTema();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (ev: PointerEvent) => {
      if (caja.current && !caja.current.contains(ev.target as Node)) setAbierto(false);
    };
    const escape = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', fuera);
      document.removeEventListener('keydown', escape);
    };
  }, [abierto]);

  return (
    <div ref={caja} style={{ position: 'relative', zIndex: 5 }}>
      <button
        type="button"
        className="tocable"
        aria-label={`Tema: ${ROTULOS_TEMA[preferencia]}`}
        aria-haspopup="true"
        aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}
        style={{
          ...botonBase, width: TOQUE, height: TOQUE, padding: 0, borderRadius: Radius.md,
          backgroundColor: C.card, border: `1px solid ${C.border}`, color: C.textSub,
          ['--opacidad-activa' as string]: '0.6',
        } as CSSProperties}
      >
        <Icono nombre={ICONOS[preferencia]} tamano={18} />
      </button>
      {abierto && (
        <div
          style={{
            position: 'absolute', top: TOQUE + 6, right: 0, width: 300, maxWidth: 'calc(100vw - 32px)',
            padding: 8, borderRadius: Radius.lg, backgroundColor: C.card, border: `1px solid ${C.border}`,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
          }}
        >
          <SelectorTema alElegir={() => setAbierto(false)} />
        </div>
      )}
    </div>
  );
}

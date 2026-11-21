// Recuadro de ayuda de una pantalla: ícono "i", el texto y una X que oculta TODAS las ayudas de una
// vez (se vuelven a mostrar desde el Perfil). Toda pantalla usa este componente: no se decide en cada una.
import type { ReactNode } from 'react';
import { elegirAyudasVisibles, useAyudasVisibles } from '../lib/ayudas';
import { e, type Estilo } from '../lib/estilo';
import { C, FontSizes, Radius, Spacing, TOQUE } from '../lib/tema';
import { showAlert } from './AlertProvider';
import { Icono } from './iconos';
import { Tocable, tarjeta } from './ui';

/** Aviso cuando no se pudo guardar la elección (las ayudas ya volvieron a como estaban). */
export function avisarAyudasNoGuardadas() {
  showAlert('No se pudo guardar', 'Este navegador no deja guardar la preferencia. Probá de nuevo o fijate si está en modo privado.');
}

export function Ayuda({ children }: { children: ReactNode }) {
  const visibles = useAyudasVisibles();
  if (!visibles) return null;
  return (
    <div style={e(s.caja)} role="note">
      <div style={e(s.icono)}>
        <Icono nombre="info" tamano={18} color={C.textSub} />
      </div>
      <span style={e(s.texto)}>{children}</span>
      <Tocable
        estilo={s.cerrar}
        etiqueta="Ocultar las ayudas"
        opacidadActiva={0.6}
        onPress={() => {
          if (!elegirAyudasVisibles(false)) avisarAyudasNoGuardadas();
        }}
      >
        <Icono nombre="cerrar" tamano={18} />
      </Tocable>
    </div>
  );
}

const s: Record<string, Estilo> = {
  caja: {
    ...tarjeta, flexDirection: 'row', borderRadius: Radius.md, gap: 12, marginBottom: Spacing.lg, alignItems: 'flex-start',
    paddingTop: 4, paddingBottom: 4, paddingLeft: Spacing.md, paddingRight: 4,
  },
  // El ícono y el texto quedan alineados con la X de 44 px
  icono: { paddingTop: 12 },
  texto: { color: C.textSub, fontSize: FontSizes.sm, flex: 1, lineHeight: 20, paddingTop: 12, paddingBottom: 12 },
  cerrar: {
    width: TOQUE, height: TOQUE, flexShrink: 0, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center',
    color: C.textSub,
  },
};

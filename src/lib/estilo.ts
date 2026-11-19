// Estilos en línea con la misma forma que los StyleSheet de React Native: así cada pantalla
// conserva sus medidas exactas. e() combina estilos y traduce las claves propias de RN.
import type { CSSProperties } from 'react';

type Medida = number | string;

export type Estilo = CSSProperties & {
  paddingHorizontal?: Medida;
  paddingVertical?: Medida;
  marginHorizontal?: Medida;
  marginVertical?: Medida;
};

export type ListaEstilos = Estilo | false | null | undefined | ListaEstilos[];

const px = (v: Medida) => (typeof v === 'number' ? `${v}px` : v);

// Prioridad igual a RN: primero lo general (padding), después el eje (paddingHorizontal) y al final
// el lado puntual (paddingLeft), sin importar el orden en que estén escritas las claves.
const LADOS = ['Top', 'Right', 'Bottom', 'Left'] as const;

function aplanar(lista: ListaEstilos[], salida: Estilo[] = []): Estilo[] {
  for (const s of lista) {
    if (!s) continue;
    if (Array.isArray(s)) aplanar(s, salida);
    else salida.push(s);
  }
  return salida;
}

/** Une estilos (los últimos pisan a los primeros) y los pasa a CSS. */
export function e(...estilos: ListaEstilos[]): CSSProperties {
  const junto: Record<string, any> = Object.assign({}, ...aplanar(estilos));
  const r: Record<string, any> = {};

  // 1) generales
  for (const base of ['padding', 'margin'] as const) {
    if (junto[base] != null) LADOS.forEach((l) => { r[base + l] = junto[base]; });
  }
  if (junto.borderWidth != null) LADOS.forEach((l) => { r[`border${l}Width`] = junto.borderWidth; });
  if (junto.borderColor != null) LADOS.forEach((l) => { r[`border${l}Color`] = junto.borderColor; });
  if (junto.borderRadius != null) {
    ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].forEach((l) => { r[`border${l}Radius`] = junto.borderRadius; });
  }
  // 2) por eje
  for (const base of ['padding', 'margin'] as const) {
    const h = junto[base + 'Horizontal'];
    const v = junto[base + 'Vertical'];
    if (h != null) { r[base + 'Left'] = h; r[base + 'Right'] = h; }
    if (v != null) { r[base + 'Top'] = v; r[base + 'Bottom'] = v; }
  }
  // 3) el resto, incluidos los lados puntuales
  for (const [k, v] of Object.entries(junto)) {
    if (v == null) continue;
    if (['padding', 'margin', 'borderWidth', 'borderColor', 'borderRadius', 'paddingHorizontal', 'paddingVertical', 'marginHorizontal', 'marginVertical'].includes(k)) continue;
    r[k] = v;
  }
  // En RN lineHeight es en píxeles; en CSS un número solo sería un multiplicador.
  if (typeof r.lineHeight === 'number') r.lineHeight = px(r.lineHeight);
  return r as CSSProperties;
}

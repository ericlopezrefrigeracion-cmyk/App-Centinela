// Colores, tamaños y espaciados de Centinela.
// Los colores son variables CSS (definidas en src/estilos.css): oscuro "Grafito" y claro "Clara",
// según el modo del teléfono o de la computadora. Cambian en vivo, sin recargar la página.

const v = (nombre: string) => `var(--c-${nombre})`;

export const C = {
  // Fondos y bordes
  background: v('fondo'),
  card: v('tarjeta'),
  control: v('control'),
  campo: v('campo'),
  border: v('borde'),
  borderControl: v('borde-control'),
  pista: v('pista'),
  sombra: v('sombra'),
  velo: v('velo'),

  // Marca
  primary: v('marca'),
  sobrePrimary: v('sobre-marca'),
  logoMet: v('logo-met'),

  // Textos
  text: v('texto'),
  textSub: v('texto-sub'),
  textMuted: v('texto-suave'),

  // Estados: texto, punto/barra y fondo suave
  verde: v('verde'),
  verdePunto: v('verde-punto'),
  verdeFondo: v('verde-fondo'),
  ambar: v('ambar'),
  ambarPunto: v('ambar-punto'),
  ambarFondo: v('ambar-fondo'),
  rojo: v('rojo'),
  rojoPunto: v('rojo-punto'),
  rojoFondo: v('rojo-fondo'),
  gris: v('gris'),
  grisPunto: v('gris-punto'),
  grisFondo: v('gris-fondo'),

  // Tarjeta en estado crítico (oscuro: borde rojo suave; claro: fondo rojo suave)
  criticoTarjeta: v('critico-tarjeta'),
  criticoBorde: v('critico-borde'),
  criticoPista: v('critico-pista'),
  criticoBarra: v('critico-barra'),
  tempAtencion: v('temp-atencion'),
  tempCritico: v('temp-critico'),

  // Gráfico
  graficoLinea: v('grafico-linea'),
  graficoGrilla: v('grafico-grilla'),
  graficoCorte: v('grafico-corte'),
} as const;

export const FUENTE = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const FontSizes = { xs: 12, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26, xxxl: 32 } as const;
export const FontWeights = { regular: 400, medium: 500, semibold: 600, bold: 700 } as const;
export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const Radius = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 } as const;
/** Alto mínimo de todo lo que se toca. */
export const TOQUE = 44;

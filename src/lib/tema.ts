// Colores, tamaños y espaciados de Centinela (los mismos de la versión anterior en Expo).
// La app es oscura siempre: no cambia con el modo claro/oscuro del sistema.

const verde = '#7ed321';

export const C = {
  // Fondos
  background: '#0d1117',
  card: '#111823',
  cardAlt: '#0f1620',
  border: '#1e2d3a',

  // Verde principal
  primary: verde,
  primaryLight: '#b5e030',
  primaryDark: '#5a9a18',
  primaryBg: 'rgba(126, 211, 33, 0.1)',
  primaryBorder: 'rgba(126, 211, 33, 0.25)',

  // Textos
  text: '#ffffff',
  textSub: '#8a9ab0',
  textMuted: '#4a5a6a',

  // Estados del equipo
  normal: verde,
  alerta: '#f5a623',
  critico: '#ff4444',
  desconectado: '#4a5a6a',

  // Señal WiFi
  senalBuena: verde,
  senalNormal: '#f5a623',
  senalBaja: '#ff4444',

  white: '#ffffff',
  black: '#000000',
  // Fondo de la navegación por pilas (lo que se ve alrededor de las pantallas angostas)
  fondoPila: 'rgb(1, 1, 1)',
} as const;

export const FontSizes = { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26, xxxl: 32 } as const;
export const FontWeights = { regular: 400, medium: 500, bold: 700 } as const;
export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const Radius = { sm: 6, md: 12, lg: 18, xl: 24, full: 999 } as const;
export const sombra = '0px 2px 8px rgba(126, 211, 33, 0.08)';

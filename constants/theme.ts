/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// ─── Colores originales de Expo (no se tocan) ────────
const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

// ─── Colores base de Centinela ───────────────────────
const centinelaGreen      = '#7ed321';
const centinelaGreenLight = '#b5e030';
const centinelaGreenDark  = '#5a9a18';
const centinelaBg         = '#0d1117';
const centinelaCard       = '#111823';
const centinelaCardAlt    = '#0f1620';
const centinelaBorder     = '#1e2d3a';

// ─────────────────────────────────────────────────────
//  Colors
//  Mantiene la estructura original { light, dark }
//  y agrega el modo Centinela (dark por defecto en la app)
// ─────────────────────────────────────────────────────
export const Colors = {
  // Modos originales de Expo — no modificados
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },

  // ── Modo Centinela (el que usamos en toda la app) ──
  centinela: {
    // Fondos
    background:    centinelaBg,
    card:          centinelaCard,
    cardAlt:       centinelaCardAlt,
    border:        centinelaBorder,

    // Verde principal
    primary:       centinelaGreen,
    primaryLight:  centinelaGreenLight,
    primaryDark:   centinelaGreenDark,
    primaryBg:     'rgba(126, 211, 33, 0.1)',
    primaryBorder: 'rgba(126, 211, 33, 0.25)',

    // Textos
    text:          '#ffffff',
    textSub:       '#8a9ab0',
    textMuted:     '#4a5a6a',
    icon:          '#8a9ab0',
    tabIconDefault:'#4a5a6a',
    tabIconSelected: centinelaGreen,
    tint:          centinelaGreen,

    // Estados del equipo
    normal:        centinelaGreen,
    alerta:        '#f5a623',
    critico:       '#ff4444',
    desconectado:  '#4a5a6a',

    // Señal WiFi
    senalBuena:    centinelaGreen,
    senalNormal:   '#f5a623',
    senalBaja:     '#ff4444',

    // Utilidades
    white:         '#ffffff',
    black:         '#000000',
    transparent:   'transparent',
    overlay:       'rgba(0, 0, 0, 0.6)',
  },
};

// ─────────────────────────────────────────────────────
//  Fonts
//  Mantiene la estructura original de Expo por plataforma
//  y agrega tamaños y pesos usados en Centinela
// ─────────────────────────────────────────────────────
export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// ─────────────────────────────────────────────────────
//  FontSizes — tamaños usados en Centinela
//  Uso: import { FontSizes } from '../constants/theme';
// ─────────────────────────────────────────────────────
export const FontSizes = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  26,
  xxxl: 32,
};

// ─────────────────────────────────────────────────────
//  FontWeights — pesos usados en Centinela
// ─────────────────────────────────────────────────────
export const FontWeights = {
  regular: '400' as const,
  medium:  '500' as const,
  bold:    '700' as const,
};

// ─────────────────────────────────────────────────────
//  Spacing — márgenes y paddings
// ─────────────────────────────────────────────────────
export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

// ─────────────────────────────────────────────────────
//  Radius — bordes redondeados
// ─────────────────────────────────────────────────────
export const Radius = {
  sm:   6,
  md:   12,
  lg:   18,
  xl:   24,
  full: 999,
};

// ─────────────────────────────────────────────────────
//  Shadow — sombra estándar para tarjetas
//  boxShadow para web/nueva arquitectura, elevation para Android
// ─────────────────────────────────────────────────────
export const Shadow = {
  boxShadow:  '0px 2px 8px rgba(126, 211, 33, 0.08)',
  elevation:  4,
};

export default Colors;
// Tests guardianes: reglas del estándar común que se revisan sobre el código, no sobre el comportamiento.
import { describe, expect, it } from 'vitest';

const fuentes = import.meta.glob('../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const deLaApp = Object.entries(fuentes).filter(([ruta]) => !ruta.endsWith('.test.ts') && !ruta.endsWith('.test.tsx'));

describe('hora y números (ESTANDARES E7)', () => {
  it('solo src/lib/formato.ts formatea fechas y números (Buenos Aires, 24 h, coma decimal)', () => {
    const fuera = deLaApp
      .filter(([ruta]) => !ruta.endsWith('/lib/formato.ts'))
      .filter(([, codigo]) => /\.toLocale\w*\(|\bIntl\./.test(codigo))
      .map(([ruta]) => ruta);
    expect(fuera).toEqual([]);
  });
});

describe('íconos (ESTANDARES G2)', () => {
  it('ninguna pantalla usa emojis: van íconos SVG de src/componentes/iconos.tsx', () => {
    const conEmoji = deLaApp
      .filter(([ruta]) => ruta.endsWith('.tsx'))
      // © y ® también son "pictográficos" para Unicode, pero son texto
      .filter(([, codigo]) => /\p{Extended_Pictographic}/u.test(codigo.replace(/[©®™]/g, '')))
      .map(([ruta]) => ruta);
    expect(conEmoji).toEqual([]);
  });
});

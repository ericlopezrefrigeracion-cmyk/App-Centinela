import { describe, expect, it } from 'vitest';
import { generarSemanas, hayCorte, parseFecha, procesarRecientes, rangoSemana, segmentos } from './graficos';

const T0 = Date.parse('2026-11-19T12:00:00Z');
const en = (min: number) => new Date(T0 + min * 60000).toISOString();

describe('lecturas de las últimas 24 h', () => {
  it('descarta lo de más de 24 h y promedia por tramos de 5 minutos, en orden', () => {
    const ahora = T0 + 24 * 60 * 60000;
    const datos = procesarRecientes(
      [
        { fecha: en(10), temp: 4 },
        { fecha: en(-1), temp: 99 }, // más de 24 h antes de "ahora"
        { fecha: en(1), temp: 2 },
        { fecha: en(3), temp: 3 }, // mismo tramo que el de 1 minuto: promedio 2,5
      ],
      ahora,
    );
    expect(datos.map((d) => [d.fecha, d.temp])).toEqual([
      [en(1), 2.5],
      [en(10), 4],
    ]);
  });
});

describe('cortes de conexión en el gráfico', () => {
  it('más de 15 minutos entre lecturas parte la línea', () => {
    const datos = [0, 5, 10, 26, 31].map((m) => ({ fecha: en(m), temp: 1 }));
    expect(segmentos(datos)).toEqual([
      { kind: 'line', indices: [0, 1, 2] },
      { kind: 'gap', from: 2, to: 3 },
      { kind: 'line', indices: [3, 4] },
    ]);
    expect(hayCorte(datos)).toBe(true);
  });
  it('15 minutos justos no es corte', () => {
    const datos = [0, 15, 30].map((m) => ({ fecha: en(m), temp: 1 }));
    expect(segmentos(datos)).toEqual([{ kind: 'line', indices: [0, 1, 2] }]);
    expect(hayCorte(datos)).toBe(false);
  });
});

describe('fechas del histórico', () => {
  it('lee los formatos que manda la API como hora local', () => {
    expect(parseFecha('2026-03-30 14:05:00').getTime()).toBe(new Date(2026, 2, 30, 14, 5).getTime());
    expect(parseFecha('2026-03-30T14:05:00Z').getTime()).toBe(new Date(2026, 2, 30, 14, 5).getTime());
    expect(parseFecha('2026-03-30').getTime()).toBe(new Date(2026, 2, 30).getTime());
    expect(isNaN(parseFecha('').getTime())).toBe(true);
  });
});

describe('semanas de Históricos', () => {
  it('ocho semanas desde el lunes de la actual', () => {
    // Jueves 19/11/2026 a la tarde
    const semanas = generarSemanas(new Date(2026, 10, 19, 15, 0));
    expect(semanas).toHaveLength(8);
    expect(semanas.slice(0, 2).map((s) => s.label)).toEqual(['Semana actual', 'Semana pasada']);
    expect(semanas[2]!.label).toBe('02/11 — 08/11');
  });
  it('una semana pasada va del lunes 00:00 al domingo 23:59:59.999 locales', () => {
    const { desde, hasta } = rangoSemana('2026-11-09', false);
    expect(new Date(desde).getTime()).toBe(new Date(2026, 10, 9, 0, 0, 0, 0).getTime());
    expect(new Date(hasta).getTime()).toBe(new Date(2026, 10, 15, 23, 59, 59, 999).getTime());
  });
  it('la semana actual llega hasta ahora', () => {
    const ahora = new Date(2026, 10, 19, 15, 0);
    expect(rangoSemana('2026-11-16', true, ahora).hasta).toBe(ahora.toISOString());
  });
});

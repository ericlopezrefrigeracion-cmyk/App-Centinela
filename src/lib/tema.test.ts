// Tests del rediseño: orden por urgencia, resumen, barra de rango, formatos, alertas y reportes PDF.
import { describe, expect, it } from 'vitest';
import { scriptPrincipal } from '../componentes/AvisoVersion';
import { detalleAlerta, infoTipo, normalizarTipo } from './alertas';
import { infoSenal, ordenarPorUrgencia, posicionEnRango, resumenEstados, type EstadoEquipo } from './equipos';
import { formatDiaHora, formatFechaHoraCompleta, formatHora24, formatNumero, formatPeriodo, formatTemp, haceCuanto } from './formato';
import { escalaRedonda, graficoPdf24h, graficoPdfSemanal, marcasEjeX } from './graficos';
import { htmlReporte24h, htmlReporteSemanal, nombreReporte24h } from './reportes';

const eq = (nombre: string, estado: EstadoEquipo) => ({ nombre, estado });

describe('orden de las tarjetas por urgencia', () => {
  it('crítico, atención, desconectado y por último normal', () => {
    const lista = [eq('A', 'normal'), eq('B', 'desconectado'), eq('C', 'critico'), eq('D', 'atencion')];
    expect(ordenarPorUrgencia(lista).map((x) => x.nombre)).toEqual(['C', 'D', 'B', 'A']);
  });
  it('dentro del mismo estado respeta el orden que mandó la API', () => {
    const lista = [eq('N1', 'normal'), eq('C1', 'critico'), eq('N2', 'normal'), eq('C2', 'critico')];
    expect(ordenarPorUrgencia(lista).map((x) => x.nombre)).toEqual(['C1', 'C2', 'N1', 'N2']);
  });
  it('no modifica la lista original', () => {
    const lista = [eq('A', 'normal'), eq('B', 'critico')];
    ordenarPorUrgencia(lista);
    expect(lista.map((x) => x.nombre)).toEqual(['A', 'B']);
  });
});

describe('resumen de estados', () => {
  it('cuenta cada estado', () => {
    const lista = [eq('a', 'normal'), eq('b', 'normal'), eq('c', 'critico'), eq('d', 'desconectado')];
    expect(resumenEstados(lista)).toEqual({ normal: 2, atencion: 0, critico: 1, desconectado: 1 });
  });
  it('sin equipos todo en cero', () => {
    expect(resumenEstados([])).toEqual({ normal: 0, atencion: 0, critico: 0, desconectado: 0 });
  });
});

describe('posición dentro del rango', () => {
  it('2,5 en un rango de 0 a 5 está en la mitad', () => {
    expect(posicionEnRango(2.5, 0, 5)).toBe(0.5);
  });
  it('con rangos negativos: −20 entre −25 y −15 también es la mitad', () => {
    expect(posicionEnRango(-20, -25, -15)).toBe(0.5);
  });
  it('fuera de rango queda en el extremo', () => {
    expect(posicionEnRango(-9.3, -25, -15)).toBe(1);
    expect(posicionEnRango(-30, -25, -15)).toBe(0);
  });
  it('sin temperatura o con rango inválido no hay barra', () => {
    expect(posicionEnRango(null, 0, 5)).toBeNull();
    expect(posicionEnRango(3, 5, 5)).toBeNull();
    expect(posicionEnRango(3, 8, 2)).toBeNull();
  });
});

describe('señal WiFi', () => {
  it('cantidad de arcos encendidos según el nivel', () => {
    expect([infoSenal('buena').nivel, infoSenal('normal').nivel, infoSenal('baja').nivel]).toEqual([3, 2, 1]);
  });
});

describe('formatos', () => {
  it('coma decimal y signo menos tipográfico', () => {
    expect(formatTemp(-9.3)).toBe('−9,3');
    expect(formatTemp(7)).toBe('7,0');
    expect(formatTemp(2.449)).toBe('2,4');
    expect(formatTemp(null)).toBe('—');
    expect(formatNumero(-25)).toBe('−25');
    expect(formatNumero(2.5)).toBe('2,5');
    expect(formatNumero(0)).toBe('0');
    // −0,04 redondea a 0: sin "menos cero"
    expect(formatTemp(-0.04)).toBe('0,0');
  });
  it('horas en 24 h de Buenos Aires, sin importar la zona de la computadora', () => {
    // 18:05 UTC = 15:05 en Buenos Aires (UTC−3)
    expect(formatHora24('2026-11-19T18:05:00Z')).toBe('15:05');
    expect(formatDiaHora('2026-11-19T18:05:00Z')).toBe('19/11 15:05');
    expect(formatFechaHoraCompleta('2026-01-02T03:04:00Z')).toBe('02/01/2026 00:04');
    expect(formatHora24('no es fecha')).toBe('—');
  });
  it('los períodos del histórico se muestran tal cual vienen', () => {
    expect(formatPeriodo('2026-03-30 14:00:00')).toBe('30/03 14:00');
    expect(formatPeriodo('2026-03-30')).toBe('30/03');
  });
  it('"hace X min"', () => {
    const ahora = Date.parse('2026-11-19T18:00:00Z');
    const antes = (min: number) => new Date(ahora - min * 60000).toISOString();
    expect(haceCuanto(antes(0.5), ahora)).toBe('recién');
    expect(haceCuanto(antes(1), ahora)).toBe('hace 1 min');
    expect(haceCuanto(antes(59), ahora)).toBe('hace 59 min');
    expect(haceCuanto(antes(95), ahora)).toBe('hace 1 h');
    expect(haceCuanto(antes(60 * 24), ahora)).toBe('hace 1 día');
    expect(haceCuanto(antes(60 * 72), ahora)).toBe('hace 3 días');
    expect(haceCuanto(null, ahora)).toBe('sin datos');
  });
});

describe('alertas', () => {
  it('tipos con tilde; la reconexión va en verde, no en rojo', () => {
    expect(['temperatura', 'desconexion', 'reconexion'].map((t) => infoTipo(t).label)).toEqual(['Temperatura', 'Desconexión', 'Reconexión']);
    expect(infoTipo('reconexion').color).toBe('var(--c-verde)');
    expect(infoTipo('RECONEXION').color).toBe('var(--c-verde)');
    expect(infoTipo('temperatura').color).toBe('var(--c-rojo)');
  });
  it('normaliza mayúsculas y tildes del tipo', () => {
    expect(normalizarTipo('Reconexión')).toBe('reconexion');
  });
  it('el detalle muestra la temperatura o el mensaje, nunca repite el tipo', () => {
    expect(detalleAlerta({ valor: -18.25 })).toBe('−18,3 °C');
    expect(detalleAlerta({ valor: null, mensaje: 'Puerta abierta' })).toBe('Puerta abierta');
    expect(detalleAlerta({ valor: null })).toBe('');
  });
});

describe('escala del eje Y', () => {
  it('pasos redondos que cubren las lecturas y el rango', () => {
    // De −0,5 a 5,5: un cuarto del recorrido es 1,5 → paso 2 → de −2 a 6
    expect(escalaRedonda(-0.5, 5.5)).toEqual({ desde: -2, hasta: 6, paso: 2 });
    // De −25,5 a −8,8: un cuarto es ≈4,2 → paso 5 → de −30 a −5
    expect(escalaRedonda(-25.5, -8.8)).toEqual({ desde: -30, hasta: -5, paso: 5 });
  });
});

describe('marcas del eje X del gráfico', () => {
  it('en un celular (≈300 px) entran 5 marcas, de punta a punta', () => {
    expect(marcasEjeX(289, 300, 64)).toEqual([0, 72, 144, 216, 288]);
  });
  it('nunca más que los datos ni menos de dos', () => {
    expect(marcasEjeX(3, 1000)).toEqual([0, 1, 2]);
    expect(marcasEjeX(100, 50)).toEqual([0, 99]);
    expect(marcasEjeX(1, 300)).toEqual([0]);
    expect(marcasEjeX(0, 300)).toEqual([]);
  });
});

describe('reportes PDF', () => {
  const T = Date.parse('2026-11-19T18:00:00Z');
  const datos = [0, 5, 10, 60, 65].map((m) => ({ fecha: new Date(T - (65 - m) * 60000).toISOString(), temp: -18.5 + m / 100 }));
  const equipo = { nombre: 'Freezer <b>helados</b>', minima: -25, maxima: -15, setpoint: -18 };
  const alertas = [
    { id: 1, tipo: 'reconexion', fecha: '2026-11-19T17:30:00Z', valor: null, leida: true },
    { id: 2, tipo: 'temperatura', fecha: '2026-11-19T17:00:00Z', valor: -9.3, leida: false },
  ];

  it('sin datos dice "Sin datos" en vez de un gráfico roto', () => {
    expect(graficoPdf24h([], 0, 5)).toContain('Sin datos');
    expect(graficoPdfSemanal([], 0, 5)).toContain('Sin datos');
    expect(graficoPdf24h([{ fecha: '2026-11-19T18:00:00Z', temp: 3 }], 0, 5)).not.toContain('NaN');
  });
  it('el gráfico marca el corte de conexión y usa hora 24 h', () => {
    const svg = graficoPdf24h(datos, -25, -15);
    expect(svg).toContain('stroke-dasharray="5,4"'); // corte de 50 minutos
    expect(svg).toMatch(/>1[0-9]:[0-5][0-9]</);
    expect(svg).not.toMatch(/[ap]\. m\./);
    expect(svg).not.toContain('NaN');
  });
  it('reporte de 24 h: A4, colores de impresión, tildes, signo menos y nada de HTML del usuario sin escapar', () => {
    const html = htmlReporte24h(equipo, datos, alertas, T);
    expect(html).toContain('size: A4');
    expect(html).toContain('print-color-adjust: exact');
    expect(html).toContain('break-inside: avoid');
    expect(html).toContain('Freezer &lt;b&gt;helados&lt;/b&gt;');
    expect(html).not.toContain('<b>helados</b>');
    expect(html).toContain('−25 a −15 °C');
    expect(html).toContain('Reconexión');
    expect(html).toContain('−9,3 °C');
    // Período en hora de Buenos Aires: 18/11 15:00 a 19/11 15:00
    expect(html).toContain('18/11/2026 15:00 a 19/11/2026 15:00');
    // La reconexión no va en rojo
    expect(html).toMatch(/color:#2f7a0a;font-weight:bold">Reconexión/);
  });
  it('reporte semanal sin datos ni alertas no se rompe', () => {
    const html = htmlReporteSemanal({ equipo: undefined, datos: [], alertas: [], etiquetaSemana: 'Semana actual', fechaInicio: '2026-11-16' });
    expect(html).toContain('Sin datos para graficar');
    expect(html).toContain('Sin alertas durante este período.');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('undefined');
  });
  it('nombre del archivo con la fecha de Buenos Aires y sin caracteres raros', () => {
    // 02:00 UTC del 20/11 todavía es 19/11 en Buenos Aires
    expect(nombreReporte24h('Cámara #1 / norte', Date.parse('2026-11-20T02:00:00Z'))).toBe('Reporte de temperaturas - Cámara 1 norte - 19-11-2026');
  });
});

describe('aviso de versión nueva', () => {
  it('reconoce el archivo principal que nombra el index.html publicado', () => {
    expect(scriptPrincipal('<script type="module" crossorigin src="/assets/index-D-xVMNf4.js"></script>')).toBe('/assets/index-D-xVMNf4.js');
    expect(scriptPrincipal('<script type="module" src="/src/main.tsx"></script>')).toBeNull();
  });
});

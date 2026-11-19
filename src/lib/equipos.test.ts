import { describe, expect, it } from 'vitest';
import { mapearAlertas, equiposConAlertasSinVer, listaDeAlertas } from './alertas';
import { estadoEquipo, labelEstado, mapearEquipos, nivelSenal, prepararEquipos, mismoId } from './equipos';

const AHORA = new Date('2026-11-19T15:00:00-03:00').getTime();
const haceMin = (m: number) => new Date(AHORA - m * 60000).toISOString();

describe('señal según rssi', () => {
  it('más de -60 dBm es buena', () => {
    expect(nivelSenal(-45)).toBe('buena');
    expect(nivelSenal(-59)).toBe('buena');
  });
  it('-60 justo ya es normal, hasta -74', () => {
    expect(nivelSenal(-60)).toBe('normal');
    expect(nivelSenal(-74)).toBe('normal');
  });
  it('-75 o menos es baja', () => {
    expect(nivelSenal(-75)).toBe('baja');
    expect(nivelSenal(-90)).toBe('baja');
  });
  it('sin dato (null o 0) cuenta como baja', () => {
    expect(nivelSenal(null)).toBe('baja');
    expect(nivelSenal(undefined)).toBe('baja');
    expect(nivelSenal(0)).toBe('baja');
  });
});

describe('estado del equipo', () => {
  it('usa el estado de temperatura que manda la API si el equipo está conectado', () => {
    expect(estadoEquipo({ ultimaConexion: haceMin(2), estado_temp: 'critico' }, AHORA)).toBe('critico');
    expect(estadoEquipo({ ultimaConexion: haceMin(2), estado_temp: 'atencion' }, AHORA)).toBe('atencion');
  });
  it('sin estado de la API queda normal', () => {
    expect(estadoEquipo({ ultimaConexion: haceMin(2) }, AHORA)).toBe('normal');
  });
  it('a los 15 minutos exactos sin datos todavía no está desconectado', () => {
    expect(estadoEquipo({ ultimaConexion: haceMin(15), estado_temp: 'normal' }, AHORA)).toBe('normal');
  });
  it('pasados los 15 minutos está desconectado aunque la API diga crítico', () => {
    const quinceYUnSegundo = new Date(AHORA - 15 * 60000 - 1000).toISOString();
    expect(estadoEquipo({ ultimaConexion: quinceYUnSegundo, estado_temp: 'critico' }, AHORA)).toBe('desconectado');
  });
  it('sin última conexión está desconectado', () => {
    expect(estadoEquipo({ ultimaConexion: null, estado_temp: 'normal' }, AHORA)).toBe('desconectado');
  });
  it('etiquetas con tilde', () => {
    expect(['normal', 'atencion', 'critico', 'desconectado'].map((x) => labelEstado(x as any)))
      .toEqual(['NORMAL', 'ATENCIÓN', 'CRÍTICO', 'DESCONECTADO']);
  });
});

describe('mapeo de GET /app/equipos', () => {
  const respuesta = [
    {
      rol: 'admin',
      ultimo_dato: { temp: 4.25, rssi: -66, fecha: '2026-11-19T17:58:00Z' },
      equipo: {
        id: 'EQ1', nombre: 'Cámara', minima: 0, maxima: 5, set_point: 2, retardo: 10,
        alertas_cliente: true, resumen_semanal: false, ultima_conexion: '2026-11-19T17:58:00Z', estado_temp: 'atencion',
      },
    },
    {
      rol: 'lector',
      ultimo_dato: null,
      equipo: { id: 'EQ2', nombre: 'Freezer', minima: -25, maxima: -15, set_point: -18, retardo: 5, alertas_cliente: false, ultima_conexion: null },
    },
  ];

  it('agrega los nombres que usa la app y conserva los de la API', () => {
    const [a, b] = mapearEquipos(respuesta);
    expect(a).toMatchObject({
      id: 'EQ1', nombre: 'Cámara', rol: 'admin', temperatura: 4.25, rssi: -66,
      ultimaConexion: '2026-11-19T17:58:00Z', minima: 0, maxima: 5, setpoint: 2, retardo: 10,
      alertasActivas: true, set_point: 2, resumen_semanal: false,
    });
    expect(b).toMatchObject({ id: 'EQ2', rol: 'lector', temperatura: null, rssi: null, ultimaConexion: null, setpoint: -18, alertasActivas: false });
  });

  it('prepara estado y señal para las tarjetas', () => {
    // 17:58 UTC = 14:58 en Buenos Aires: 2 minutos antes de AHORA
    const [a, b] = prepararEquipos(mapearEquipos(respuesta), AHORA);
    expect([a!.estado, a!.senal]).toEqual(['atencion', 'normal']);
    expect([b!.estado, b!.senal]).toEqual(['desconectado', 'baja']);
  });

  it('compara ids de la URL (texto) con los de la API', () => {
    expect(mismoId('123', 123)).toBe(true);
    expect(mismoId('EQ1', 'EQ1')).toBe(true);
    expect(mismoId('12', 123)).toBe(false);
    expect(mismoId(undefined, undefined)).toBe(false);
  });
});

describe('mapeo de GET /app/alertas', () => {
  it('acepta la lista paginada o suelta', () => {
    expect(listaDeAlertas({ items: [{ id: 1 }], total: 1 })).toEqual([{ id: 1 }]);
    expect(listaDeAlertas([{ id: 2 }])).toEqual([{ id: 2 }]);
    expect(listaDeAlertas(null)).toEqual([]);
  });

  it('pone el nombre del equipo, la descripción y si está vista', () => {
    const alertas = mapearAlertas(
      [
        { id: 1, equipo_id: 'EQ1', tipo: 'temperatura', valor: 8.4, leida: false, fecha: 'x' },
        { id: 2, equipo_id: 'EQ9', tipo: 'desconexion', valor: null, leida: true, fecha: 'x' },
      ],
      [{ id: 'EQ1', nombre: 'Cámara' }],
    );
    expect(alertas.map((a) => [a.equipo, a.descripcion, a.vista])).toEqual([
      ['Cámara', 'temperatura — 8.4°C', false],
      ['Equipo desconocido', 'desconexion', true],
    ]);
  });

  it('"marcar todas" pide una vez por equipo con alertas sin ver', () => {
    const alertas = mapearAlertas(
      [
        { id: 1, equipo_id: 'A', tipo: 'temperatura', leida: false, fecha: 'x' },
        { id: 2, equipo_id: 'A', tipo: 'temperatura', leida: false, fecha: 'x' },
        { id: 3, equipo_id: 'B', tipo: 'reconexion', leida: true, fecha: 'x' },
        { id: 4, equipo_id: 'C', tipo: 'desconexion', leida: false, fecha: 'x' },
      ],
      [],
    );
    expect(equiposConAlertasSinVer(alertas)).toEqual(['A', 'C']);
  });
});

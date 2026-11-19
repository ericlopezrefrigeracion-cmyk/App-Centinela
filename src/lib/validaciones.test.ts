import { describe, expect, it } from 'vitest';
import {
  cambiarSigno, formDesdeEquipo, normalizarTemperatura, parametrosParaGuardar, validarAgregar, validarConfiguracion, validarLogin, validarRegistro,
  type FormConfiguracion,
} from './validaciones';

const valido: FormConfiguracion = {
  nombre: 'Cámara principal', descripcion: '', ubicacion: '', minima: '0', maxima: '5', setpoint: '2',
  calibracion: '', retardo: '', alertasActivas: true, reportesSemanales: false,
};
const con = (cambios: Partial<FormConfiguracion>) => validarConfiguracion({ ...valido, ...cambios });

describe('configuración del equipo', () => {
  it('un formulario correcto no tiene errores', () => {
    expect(con({})).toEqual({});
  });

  it('nombre requerido y de hasta 30 caracteres', () => {
    expect(con({ nombre: '   ' })).toEqual({ nombre: 'El nombre es requerido' });
    expect(con({ nombre: 'x'.repeat(30) })).toEqual({});
    expect(con({ nombre: 'x'.repeat(31) })).toEqual({ nombre: 'Máximo 30 caracteres' });
  });

  it('descripción hasta 50 y ubicación hasta 40', () => {
    expect(con({ descripcion: 'x'.repeat(51), ubicacion: 'y'.repeat(41) })).toEqual({
      descripcion: 'Máximo 50 caracteres', ubicacion: 'Máximo 40 caracteres',
    });
  });

  it('mínima y máxima entre -50 y +100', () => {
    expect(con({ minima: '-50', maxima: '100', setpoint: '0' })).toEqual({});
    expect(con({ minima: '-51' }).minima).toBe('Debe estar entre -50 y +100°C');
    expect(con({ maxima: '101' }).maxima).toBe('Debe estar entre -50 y +100°C');
    expect(con({ minima: 'abc' }).minima).toBe('Debe ser un número');
    expect(con({ minima: '' }).minima).toBe('La temperatura mínima es requerida');
  });

  it('la máxima tiene que ser mayor que la mínima', () => {
    expect(con({ minima: '5', maxima: '5' })).toEqual({ maxima: 'Debe ser mayor que la mínima' });
    expect(con({ minima: '9', maxima: '5' }).maxima).toBe('Debe ser mayor que la mínima');
  });

  it('el setpoint tiene que estar dentro del rango', () => {
    expect(con({ setpoint: '6' })).toEqual({ setpoint: 'Debe estar entre 0 y 5°C' });
    expect(con({ setpoint: '-1' })).toEqual({ setpoint: 'Debe estar entre 0 y 5°C' });
    expect(con({ setpoint: '' })).toEqual({ setpoint: 'La temperatura deseada es requerida' });
    // Si el rango está mal, no se valida el setpoint contra él
    expect(con({ minima: '9', setpoint: '20' })).toEqual({ maxima: 'Debe ser mayor que la mínima' });
  });

  it('calibración opcional entre -5 y +5', () => {
    expect(con({ calibracion: '-5' })).toEqual({});
    expect(con({ calibracion: '5.5' })).toEqual({ calibracion: 'Debe estar entre -5 y +5' });
    expect(con({ calibracion: 'x' })).toEqual({ calibracion: 'Debe ser un número' });
  });

  it('retardo opcional, entero, entre 5 y 180 minutos', () => {
    expect(con({ retardo: '5' })).toEqual({});
    expect(con({ retardo: '180' })).toEqual({});
    expect(con({ retardo: '4' })).toEqual({ retardo: 'Debe estar entre 5 y 180 minutos' });
    expect(con({ retardo: '181' })).toEqual({ retardo: 'Debe estar entre 5 y 180 minutos' });
    expect(con({ retardo: '7.5' })).toEqual({ retardo: 'Debe ser un número entero' });
  });

  it('al guardar, calibración vacía va en 0 y retardo vacío en 5', () => {
    expect(parametrosParaGuardar({ ...valido, minima: '-25', maxima: '-15', setpoint: '-18' })).toEqual({
      minima: -25, maxima: -15, set_point: -18, calibracion: 0, retardo: 5, alertas_cliente: true, resumen_semanal: false,
    });
    expect(parametrosParaGuardar({ ...valido, calibracion: '-1.5', retardo: '30', reportesSemanales: true })).toMatchObject({
      calibracion: -1.5, retardo: 30, resumen_semanal: true,
    });
  });

  it('carga el formulario desde el equipo de la API', () => {
    expect(formDesdeEquipo({ nombre: 'F', minima: -25, maxima: -15, set_point: -18, calibracion: 0.5, retardo: 10, alertas_cliente: false, resumen_semanal: true }))
      .toEqual({ nombre: 'F', descripcion: '', ubicacion: '', minima: '-25', maxima: '-15', setpoint: '-18', calibracion: '0.5', retardo: '10', alertasActivas: false, reportesSemanales: true });
  });
});

describe('otros formularios', () => {
  it('login', () => {
    expect(validarLogin('', '')).toEqual({ email: 'El email es requerido', password: 'La contraseña es requerida' });
    expect(validarLogin('juan@', '12345')).toEqual({ email: 'El email no es válido', password: 'Mínimo 6 caracteres' });
    expect(validarLogin('juan@ejemplo.com', '123456')).toEqual({});
  });

  it('agregar equipo', () => {
    expect(validarAgregar({ id: ' ', nombre: '' })).toEqual({ id: 'El ID del equipo es requerido', nombre: 'El nombre es requerido' });
    expect(validarAgregar({ id: 'EQUIPO_001', nombre: 'Cámara' })).toEqual({});
  });

  it('registro', () => {
    const base = { nombre: 'Ana', apellido: 'Gómez', mail: 'a@b.com', password: 'secreto', confirmar: 'secreto' };
    expect(validarRegistro(base)).toBeNull();
    expect(validarRegistro({ ...base, apellido: '' })?.titulo).toBe('Campos requeridos');
    expect(validarRegistro({ ...base, confirmar: 'otro' })?.mensaje).toBe('Las contraseñas no coinciden.');
    expect(validarRegistro({ ...base, password: '123', confirmar: '123' })?.mensaje).toBe('La contraseña debe tener al menos 6 caracteres.');
  });
});

// Campos de temperatura en el celular (19/11): el teclado numérico del iPhone no tiene el menos (botón ±) y el
// decimal en español pone coma.
describe('campos de temperatura', () => {
  it('± cambia el signo, también de un campo vacío o con espacios', () => {
    expect(cambiarSigno('18')).toBe('-18')
    expect(cambiarSigno('-18')).toBe('18')
    expect(cambiarSigno('')).toBe('-')
    expect(cambiarSigno('-')).toBe('')
    expect(cambiarSigno(' 2.5 ')).toBe('-2.5')
  })
  it('la coma decimal pasa a punto y el valor valida como número', () => {
    expect(normalizarTemperatura('-0,5')).toBe('-0.5')
    expect(normalizarTemperatura('4')).toBe('4')
    expect(con({ calibracion: normalizarTemperatura('-0,5') })).toEqual({})
    expect(con({ minima: normalizarTemperatura('-25'), setpoint: normalizarTemperatura('-18,5') })).toEqual({})
  })
})

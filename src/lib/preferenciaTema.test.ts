// Selector de tema Claro / Auto / Oscuro (ESTANDARES G1): qué preferencia rige, qué se ve, qué se
// pone en <html> y que el script del primer cuadro haga lo mismo. Los valores esperados salen de la
// regla escrita (usuario → dispositivo → sistema), no de correr el código.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import scriptInicial from '../../public/tema-inicial.js?raw';
import { atributoTema, resolverPreferencia, temaEfectivo } from './preferenciaTema';
import { aplicarEnDocumento } from './temaNavegador';

describe('qué preferencia rige', () => {
  it('sin nada guardado es Auto', () => {
    expect(resolverPreferencia({})).toBe('auto');
  });
  it('la del dispositivo cuando no hay usuario', () => {
    expect(resolverPreferencia({ guardada: 'oscuro' })).toBe('oscuro');
  });
  it('la del usuario manda sobre la del dispositivo', () => {
    expect(resolverPreferencia({ usuario: 'claro', guardada: 'oscuro' })).toBe('claro');
    expect(resolverPreferencia({ usuario: 'auto', guardada: 'oscuro' })).toBe('auto');
  });
  it('un valor roto o viejo se saltea', () => {
    expect(resolverPreferencia({ usuario: 'dark', guardada: 'claro' })).toBe('claro');
    expect(resolverPreferencia({ usuario: null, guardada: '' })).toBe('auto');
    expect(resolverPreferencia({ guardada: 'OSCURO' })).toBe('auto');
  });
});

describe('qué se ve', () => {
  it('Claro y Oscuro no dependen del sistema', () => {
    expect(temaEfectivo('claro', true)).toBe('claro');
    expect(temaEfectivo('oscuro', false)).toBe('oscuro');
  });
  it('Auto sigue al sistema', () => {
    expect(temaEfectivo('auto', true)).toBe('oscuro');
    expect(temaEfectivo('auto', false)).toBe('claro');
  });
  it('atributo data-theme: solo con elección manual', () => {
    expect(atributoTema('claro')).toBe('light');
    expect(atributoTema('oscuro')).toBe('dark');
    expect(atributoTema('auto')).toBeNull();
  });
});

// Encabezado como el de index.html: un color de barra por modo
const CABEZA = `
  <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#000000" />
  <meta name="color-scheme" content="light dark" />`;

function metas() {
  return Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')).map((m) => m.content);
}

describe('en el documento', () => {
  beforeEach(() => {
    document.head.innerHTML = CABEZA;
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
    localStorage.clear();
  });
  afterEach(() => localStorage.clear());

  it('Oscuro: data-theme, color-scheme y las dos barras en el color oscuro', () => {
    aplicarEnDocumento('oscuro');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(document.querySelector('meta[name="color-scheme"]')?.getAttribute('content')).toBe('dark');
    expect(metas()).toEqual(['#000000', '#000000']);
  });

  it('volver a Auto deja todo como estaba', () => {
    aplicarEnDocumento('claro');
    expect(metas()).toEqual(['#ffffff', '#ffffff']);
    aplicarEnDocumento('auto');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('');
    expect(document.querySelector('meta[name="color-scheme"]')?.getAttribute('content')).toBe('light dark');
    expect(metas()).toEqual(['#ffffff', '#000000']);
  });

  it('el script del primer cuadro aplica lo guardado en el dispositivo', () => {
    localStorage.setItem('tema', 'oscuro');
    new Function(scriptInicial)();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(metas()).toEqual(['#000000', '#000000']);
    // Y después la app puede volver a Auto con los colores originales
    aplicarEnDocumento('auto');
    expect(metas()).toEqual(['#ffffff', '#000000']);
  });

  it('el script del primer cuadro no toca nada con Auto o con un valor roto', () => {
    localStorage.setItem('tema', 'auto');
    new Function(scriptInicial)();
    localStorage.setItem('tema', 'negro');
    new Function(scriptInicial)();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(metas()).toEqual(['#ffffff', '#000000']);
  });
});

// Vitest reemplaza los .css importados por un texto vacío: se lee el archivo directo
const css = readFileSync('src/estilos.css', 'utf8');

// Declaraciones de un bloque CSS (sin comentarios ni espacios), para comparar
function declaraciones(bloque: string): string[] {
  return bloque
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(';')
    .map((d) => d.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function bloqueDe(selector: string, desde = 0): string {
  const inicio = css.indexOf(`${selector} {`, desde);
  expect(inicio, `falta ${selector} en estilos.css`).toBeGreaterThanOrEqual(0);
  const apertura = css.indexOf('{', inicio);
  return css.slice(apertura + 1, css.indexOf('}', apertura));
}

describe('CSS del tema (guardián)', () => {
  it('el claro elegido a mano tiene los mismos colores que el claro del sistema', () => {
    const delSistema = bloqueDe(':root:not([data-theme="dark"])', css.indexOf('@media (prefers-color-scheme: light)'));
    const aMano = bloqueDe(':root[data-theme="light"]');
    expect(declaraciones(aMano)).toEqual(declaraciones(delSistema));
    expect(declaraciones(aMano).length).toBeGreaterThan(10);
  });
  it('sin :has() ni light-dark() (no andan en navegadores viejos)', () => {
    expect(css).not.toMatch(/:has\(|light-dark\(/);
  });
});

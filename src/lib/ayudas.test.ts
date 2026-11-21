// Ayudas de pantalla: la X oculta todas de una vez, el perfil las vuelve a mostrar y, si no se puede
// guardar, vuelven a como estaban. Los valores esperados salen de la regla escrita (por defecto se
// muestran; solo "1" guardado las oculta), no de correr el código.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLAVE_AYUDAS, ayudasVisibles, ayudasVisiblesSegun, elegirAyudasVisibles, releerAyudas } from './ayudas';

describe('qué se guarda decide si se ven', () => {
  it('sin nada guardado se muestran', () => {
    expect(ayudasVisiblesSegun(null)).toBe(true);
    expect(ayudasVisiblesSegun(undefined)).toBe(true);
  });
  it('solo "1" las oculta; un valor roto no', () => {
    expect(ayudasVisiblesSegun('1')).toBe(false);
    expect(ayudasVisiblesSegun('0')).toBe(true);
    expect(ayudasVisiblesSegun('true')).toBe(true);
    expect(ayudasVisiblesSegun('')).toBe(true);
  });
});

describe('ocultar y volver a mostrar', () => {
  beforeEach(() => {
    localStorage.clear();
    releerAyudas();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    releerAyudas();
  });

  it('arrancan visibles', () => {
    expect(ayudasVisibles()).toBe(true);
  });

  it('ocultarlas las oculta todas y queda guardado', () => {
    expect(elegirAyudasVisibles(false)).toBe(true);
    expect(ayudasVisibles()).toBe(false);
    expect(localStorage.getItem(CLAVE_AYUDAS)).toBe('1');
  });

  it('mostrarlas desde el perfil borra la marca', () => {
    elegirAyudasVisibles(false);
    expect(elegirAyudasVisibles(true)).toBe(true);
    expect(ayudasVisibles()).toBe(true);
    expect(localStorage.getItem(CLAVE_AYUDAS)).toBeNull();
  });

  it('si no se puede guardar, vuelven y avisa con false', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cuota llena');
    });
    expect(elegirAyudasVisibles(false)).toBe(false);
    expect(ayudasVisibles()).toBe(true);
  });

  it('lo guardado en otra pestaña se refleja', () => {
    localStorage.setItem(CLAVE_AYUDAS, '1');
    window.dispatchEvent(new StorageEvent('storage', { key: CLAVE_AYUDAS, newValue: '1' }));
    expect(ayudasVisibles()).toBe(false);
  });
});

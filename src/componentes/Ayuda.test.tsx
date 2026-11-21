// La X de una ayuda oculta todas las ayudas a la vez (no solo la que se tocó).
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { elegirAyudasVisibles, releerAyudas } from '../lib/ayudas';
import { Ayuda } from './Ayuda';

describe('<Ayuda>', () => {
  beforeEach(() => {
    localStorage.clear();
    releerAyudas();
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    releerAyudas();
  });

  it('la X tiene su etiqueta y oculta todas las ayudas de la pantalla', () => {
    render(<><Ayuda>Primera</Ayuda><Ayuda>Segunda</Ayuda></>);
    expect(screen.getByText('Primera')).toBeTruthy();
    expect(screen.getByText('Segunda')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Ocultar las ayudas' })[0]!);
    expect(screen.queryByText('Primera')).toBeNull();
    expect(screen.queryByText('Segunda')).toBeNull();
  });

  it('vuelven a aparecer cuando se activan desde el perfil', () => {
    elegirAyudasVisibles(false);
    render(<Ayuda>Texto de ayuda</Ayuda>);
    expect(screen.queryByText('Texto de ayuda')).toBeNull();
    act(() => {
      elegirAyudasVisibles(true);
    });
    expect(screen.getByText('Texto de ayuda')).toBeTruthy();
  });
});

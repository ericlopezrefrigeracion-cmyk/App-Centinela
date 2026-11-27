// Tirar para actualizar (ESTANDARES D6): la lógica sin pantalla y lo que se dibuja. Con renderToStaticMarkup para que
// corra igual en los proyectos con jsdom y en los que no lo tienen. Los valores esperados se escriben a mano.
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TirarParaActualizar } from './TirarParaActualizar'
import {
  arribaDeTodo, cantidadRecargas, debeActivarse, decidirGesto, distanciaVisible, hayModalAbierto, leerEntorno,
  recargarPantalla, registrarRecarga, superaUmbral, type NodoDesplazable,
} from './tirarParaActualizarEstado'

describe('tirar para actualizar: cuándo se activa', () => {
  it('solo en la app instalada y con pantalla táctil', () => {
    expect(debeActivarse({ standalone: true, tactil: true })).toBe(true)
    expect(debeActivarse({ standalone: false, tactil: true })).toBe(false)
    expect(debeActivarse({ standalone: true, tactil: false })).toBe(false)
  })

  it('lee display-mode, navigator.standalone del iPhone y pointer coarse', () => {
    const ventana = (activas: string[], standalone?: boolean) => ({
      matchMedia: (c: string) => ({ matches: activas.includes(c) }),
      navigator: { standalone },
    })
    expect(leerEntorno(ventana(['(display-mode: standalone)', '(pointer: coarse)']))).toEqual({ standalone: true, tactil: true })
    expect(leerEntorno(ventana(['(pointer: coarse)'], true))).toEqual({ standalone: true, tactil: true })
    expect(leerEntorno(ventana([]))).toEqual({ standalone: false, tactil: false })
    // Sin matchMedia (o si tira error) no se activa.
    expect(leerEntorno({ matchMedia: () => { throw new Error('no') } })).toEqual({ standalone: false, tactil: false })
  })
})

describe('tirar para actualizar: el gesto', () => {
  it('el indicador baja la mitad de lo que tira el dedo, hasta 96 px', () => {
    expect(distanciaVisible(-30)).toBe(0)
    expect(distanciaVisible(0)).toBe(0)
    expect(distanciaVisible(40)).toBe(20)
    expect(distanciaVisible(127)).toBe(63)
    expect(distanciaVisible(128)).toBe(64)
    expect(distanciaVisible(500)).toBe(96)
  })

  it('actualiza al soltar después de tirar 128 px o más', () => {
    expect(superaUmbral(127)).toBe(false)
    expect(superaUmbral(128)).toBe(true)
  })

  it('distingue el tirón del scroll hacia arriba y del deslizamiento de costado', () => {
    expect(decidirGesto(2, 3)).toBe('esperar')
    expect(decidirGesto(0, 10)).toBe('tirar')
    expect(decidirGesto(0, -10)).toBe('soltar')
    expect(decidirGesto(20, 10)).toBe('soltar')
  })

  it('solo empieza con la página arriba de todo y sin una lista desplazada bajo el dedo', () => {
    const lista: NodoDesplazable = { scrollTop: 0, parentElement: null }
    const item: NodoDesplazable = { scrollTop: 0, parentElement: lista, closest: () => null }
    expect(arribaDeTodo(item, 0)).toBe(true)
    expect(arribaDeTodo(item, 15)).toBe(false)
    lista.scrollTop = 40
    expect(arribaDeTodo(item, 0)).toBe(false)
    expect(arribaDeTodo(null, 0)).toBe(true)
  })

  it('no empieza en campos de texto ni en zonas marcadas data-sin-tirar', () => {
    const campo: NodoDesplazable = { scrollTop: 0, parentElement: null, closest: (s: string) => (s.includes('[data-sin-tirar]') ? {} : null) }
    expect(arribaDeTodo(campo, 0)).toBe(false)
  })

  it('con un modal abierto o el scroll del body bloqueado no hace nada', () => {
    expect(hayModalAbierto({ querySelector: () => null, body: { style: { overflow: '' } } })).toBe(false)
    expect(hayModalAbierto({ querySelector: () => ({}), body: { style: { overflow: '' } } })).toBe(true)
    expect(hayModalAbierto({ querySelector: () => null, body: { style: { overflow: 'hidden' } } })).toBe(true)
  })
})

describe('tirar para actualizar: qué recarga', () => {
  it('sin recargas registradas, recarga la página', async () => {
    let paginas = 0
    expect(await recargarPantalla(() => { paginas++ })).toBe('pagina')
    expect(paginas).toBe(1)
  })

  it('con recargas registradas, llama a todas (aunque una falle) y no recarga la página', async () => {
    const llamadas: string[] = []
    const quitarA = registrarRecarga(() => { llamadas.push('a') })
    const quitarB = registrarRecarga(async () => { llamadas.push('b'); throw new Error('sin red') })
    let paginas = 0
    expect(await recargarPantalla(() => { paginas++ })).toBe('datos')
    expect(llamadas.sort()).toEqual(['a', 'b'])
    expect(paginas).toBe(0)
    quitarA()
    quitarB()
    expect(cantidadRecargas()).toBe(0)
  })

  it('sin tirar no dibuja el círculo, solo el aviso vacío para lectores de pantalla', () => {
    const html = renderToStaticMarkup(<TirarParaActualizar />)
    expect(html).not.toContain('class="tpa ')
    expect(html).toContain('role="status"')
  })
})

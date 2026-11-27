// "Tirar para actualizar" de la app instalada (ESTANDARES D6). Se monta una sola vez en la raíz de la app y solo se
// activa en modo standalone con pantalla táctil (en el navegador queda el gesto nativo). Tirando hacia abajo desde
// arriba de todo aparece un círculo con la flecha; al soltar pasado el umbral vuelve a cargar los datos de la pantalla
// (las recargas que registró cada indicador "Act. HH:MM" con useRecargaDePantalla) o, si no hay, la página entera.
// No arranca con un modal abierto, dentro de una lista desplazada, en campos de texto ni en zonas `data-sin-tirar`.
//
// No depende del router ni de Tailwind; los colores son variables --tpa-* (ver tirarParaActualizar.css).
// Fuente única: Proyectos/plantillas/tirar-para-actualizar/. Se copia tal cual a cada proyecto.
import { useEffect, useRef, useState } from 'react'
import './tirarParaActualizar.css'
import {
  UMBRAL_PX, arribaDeTodo, debeActivarse, decidirGesto, distanciaVisible, hayModalAbierto, leerEntorno,
  recargarPantalla, registrarRecarga, type NodoDesplazable,
} from './tirarParaActualizarEstado'

/** Registra la recarga de datos de la pantalla para el "tirar para actualizar" mientras el componente está montado. */
export function useRecargaDePantalla(recargar: (() => unknown) | undefined): void {
  const ultima = useRef(recargar)
  ultima.current = recargar
  useEffect(() => registrarRecarga(() => ultima.current?.()), [])
}

type Fase = 'quieto' | 'tirando' | 'actualizando'

// Tiempo mínimo con el círculo girando, para que se vea que actualizó aunque la respuesta llegue enseguida.
const GIRO_MINIMO_MS = 500

export function TirarParaActualizar({ recargarPagina }: { recargarPagina?: () => void } = {}) {
  const [fase, setFase] = useState<Fase>('quieto')
  const [distancia, setDistancia] = useState(0)
  const recargaPagina = useRef(recargarPagina)
  recargaPagina.current = recargarPagina

  useEffect(() => {
    if (typeof window === 'undefined' || !debeActivarse(leerEntorno(window))) return
    const raiz = document.documentElement
    // Que el navegador no haga su propio tirón ni el rebote encima del nuestro.
    const overscrollAntes = raiz.style.overscrollBehaviorY
    raiz.style.overscrollBehaviorY = 'contain'

    let inicio: { x: number; y: number } | null = null
    let modo: 'pendiente' | 'tirando' = 'pendiente'
    let recorrido = 0
    let actualizando = false

    const cortar = () => { inicio = null; modo = 'pendiente'; recorrido = 0 }

    const alTocar = (e: TouchEvent) => {
      if (actualizando || e.touches.length !== 1) { cortar(); return }
      if (!arribaDeTodo(e.target as NodoDesplazable | null, window.scrollY) || hayModalAbierto(document)) { cortar(); return }
      const t = e.touches[0]!
      inicio = { x: t.clientX, y: t.clientY }
      modo = 'pendiente'
      recorrido = 0
    }

    const alMover = (e: TouchEvent) => {
      if (!inicio) return
      if (e.touches.length !== 1) { cortar(); setDistancia(0); setFase('quieto'); return }
      const t = e.touches[0]!
      const dx = t.clientX - inicio.x
      const dy = t.clientY - inicio.y
      if (modo === 'pendiente') {
        const gesto = decidirGesto(dx, dy)
        if (gesto === 'esperar') return
        if (gesto === 'soltar' || window.scrollY > 0) { cortar(); return }
        modo = 'tirando'
        setFase('tirando')
      }
      // Ya es un tirón: el dedo no mueve la página, mueve el indicador.
      if (e.cancelable) e.preventDefault()
      recorrido = dy
      setDistancia(distanciaVisible(dy))
    }

    const alSoltar = () => {
      if (!inicio || modo !== 'tirando') { cortar(); return }
      const alcanzo = distanciaVisible(recorrido) >= UMBRAL_PX
      cortar()
      if (!alcanzo) { setDistancia(0); setFase('quieto'); return }
      actualizando = true
      setFase('actualizando')
      setDistancia(UMBRAL_PX)
      const pagina = recargaPagina.current ?? (() => window.location.reload())
      void Promise.all([
        recargarPantalla(pagina).catch(() => 'datos'),
        new Promise(resolver => setTimeout(resolver, GIRO_MINIMO_MS)),
      ]).finally(() => {
        actualizando = false
        setDistancia(0)
        setFase('quieto')
      })
    }

    const opcionesPasivas: AddEventListenerOptions = { passive: true }
    const opcionesActivas: AddEventListenerOptions = { passive: false }
    document.addEventListener('touchstart', alTocar, opcionesPasivas)
    document.addEventListener('touchmove', alMover, opcionesActivas)
    document.addEventListener('touchend', alSoltar, opcionesPasivas)
    document.addEventListener('touchcancel', alSoltar, opcionesPasivas)
    return () => {
      raiz.style.overscrollBehaviorY = overscrollAntes
      document.removeEventListener('touchstart', alTocar, opcionesPasivas)
      document.removeEventListener('touchmove', alMover, opcionesActivas)
      document.removeEventListener('touchend', alSoltar, opcionesPasivas)
      document.removeEventListener('touchcancel', alSoltar, opcionesPasivas)
    }
  }, [])

  const visible = fase !== 'quieto' || distancia > 0
  const listo = fase === 'actualizando' || distancia >= UMBRAL_PX
  return (
    <>
      {visible && (
        <div className={`tpa${fase === 'tirando' ? ' tpa-siguiendo' : ''}${listo ? ' tpa-listo' : ''}`} aria-hidden="true"
          style={{ transform: `translate(-50%, ${distancia}px)`, opacity: Math.min(1, distancia / UMBRAL_PX + 0.2) }}>
          <svg className={fase === 'actualizando' ? 'tpa-flecha tpa-girando' : 'tpa-flecha'} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
            style={fase === 'actualizando' ? undefined : { transform: `rotate(${Math.round(distancia * 3.5)}deg)` }}>
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </div>
      )}
      <span className="tpa-lector" role="status">{fase === 'actualizando' ? 'Actualizando' : ''}</span>
    </>
  )
}

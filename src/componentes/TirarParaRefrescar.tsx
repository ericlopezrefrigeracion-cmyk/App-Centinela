// "Tirar para refrescar" en pantallas táctiles: con la lista arriba de todo, arrastrar hacia
// abajo más de 70 px y soltar vuelve a cargar los datos. Mientras tanto se ve un círculo
// girando arriba (como el RefreshControl del celular). En la computadora no aparece nada.
import { useEffect, useRef, useState } from 'react';
import { C } from '../lib/tema';
import { Spinner } from './ui';

const UMBRAL = 70;

export function useTirarParaRefrescar(alRefrescar: () => void, refrescando: boolean) {
  // Ref por callback: la lista aparece después de la primera carga
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [tirado, setTirado] = useState(0);
  const inicio = useRef<number | null>(null);
  const funcion = useRef(alRefrescar);
  funcion.current = alRefrescar;
  // El círculo solo se muestra en los refrescos pedidos a mano (no en el automático de cada minuto)
  const [pedido, setPedido] = useState(false);
  const antes = useRef(refrescando);
  useEffect(() => {
    if (antes.current && !refrescando) setPedido(false);
    antes.current = refrescando;
  }, [refrescando]);

  useEffect(() => {
    if (!el) return;
    let distancia = 0;
    const empezar = (ev: TouchEvent) => {
      inicio.current = el.scrollTop <= 0 ? ev.touches[0]!.clientY : null;
      distancia = 0;
    };
    const mover = (ev: TouchEvent) => {
      if (inicio.current == null) return;
      distancia = Math.max(0, ev.touches[0]!.clientY - inicio.current);
      setTirado(Math.min(distancia, UMBRAL * 1.5));
    };
    const soltar = () => {
      if (inicio.current != null && distancia > UMBRAL) {
        setPedido(true);
        funcion.current();
      }
      inicio.current = null;
      distancia = 0;
      setTirado(0);
    };
    el.addEventListener('touchstart', empezar, { passive: true });
    el.addEventListener('touchmove', mover, { passive: true });
    el.addEventListener('touchend', soltar);
    el.addEventListener('touchcancel', soltar);
    return () => {
      el.removeEventListener('touchstart', empezar);
      el.removeEventListener('touchmove', mover);
      el.removeEventListener('touchend', soltar);
      el.removeEventListener('touchcancel', soltar);
    };
  }, [el]);

  const girando = pedido && refrescando;
  const visible = girando || tirado > 10;
  const indicador = visible ? (
    <div style={{ position: 'absolute', top: girando ? 12 : Math.min(tirado, UMBRAL) - 28, left: 0, right: 0, alignItems: 'center', zIndex: 2, pointerEvents: 'none' }}>
      <div style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.4)', opacity: girando ? 1 : Math.min(1, tirado / UMBRAL) }}>
        <Spinner color={C.primary} />
      </div>
    </div>
  ) : null;

  return { ref: setEl, indicador };
}

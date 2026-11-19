// Aviso de versión nueva (ESTANDARES D7): cada 5 minutos y al volver a la pestaña se fija si el
// index.html publicado apunta a otro archivo de la app; si cambió, ofrece actualizar.
import { useEffect, useState } from 'react';
import { C, FontWeights, Radius, TOQUE } from '../lib/tema';
import { Icono } from './iconos';
import { Tocable } from './ui';

const CADA_MS = 5 * 60 * 1000;

/** El archivo principal de la app que nombra un index.html ("/assets/index-abc123.js"). */
export function scriptPrincipal(html: string): string | null {
  return html.match(/\/assets\/index-[\w-]+\.js/)?.[0] ?? null;
}

export function AvisoVersion() {
  const [hayNueva, setHayNueva] = useState(false);

  useEffect(() => {
    const actual = scriptPrincipal(document.documentElement.innerHTML);
    if (!actual) return; // en desarrollo no hay archivo con hash
    let cancelado = false;
    const revisar = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch('/index.html', { cache: 'no-store' });
        const publicado = scriptPrincipal(await res.text());
        if (!cancelado && publicado && publicado !== actual) setHayNueva(true);
      } catch {
        // Sin conexión: se vuelve a probar en la próxima vuelta
      }
    };
    const intervalo = setInterval(revisar, CADA_MS);
    document.addEventListener('visibilitychange', revisar);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', revisar);
    };
  }, []);

  if (!hayNueva) return null;
  return (
    <div
      role="status"
      style={{
        position: 'fixed', left: 12, right: 12, bottom: 'calc(92px + env(safe-area-inset-bottom, 0px))', zIndex: 50,
        maxWidth: 520, marginLeft: 'auto', marginRight: 'auto', flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: Radius.lg, padding: '6px 6px 6px 16px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)', color: C.verde,
      }}
    >
      <Icono nombre="actualizar" tamano={18} />
      <span style={{ color: C.text, fontSize: 14, flex: 1 }}>Hay una versión nueva de Centinela.</span>
      <Tocable
        estilo={{ minHeight: TOQUE, paddingHorizontal: 16, borderRadius: Radius.md, backgroundColor: C.primary, justifyContent: 'center' }}
        onPress={() => window.location.reload()}
      >
        <span style={{ color: C.sobrePrimary, fontSize: 14, fontWeight: FontWeights.semibold }}>Actualizar</span>
      </Tocable>
    </div>
  );
}

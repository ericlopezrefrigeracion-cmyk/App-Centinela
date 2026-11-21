// Íconos SVG de trazo (24×24, toman el color del texto con currentColor). Reemplazan a los emojis.
import type { CSSProperties, ReactNode } from 'react';

const TRAZOS = {
  grafico: <><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></>,
  ajustes: <><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>,
  salir: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
  mas: <path d="M12 5v14M5 12h14" />,
  termometro: <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />,
  campana: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
  campanaApagada: <><path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5" /><path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /><path d="M2 2l20 20" /></>,
  barras: <path d="M12 20V10M18 20V4M6 20v-4" />,
  persona: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  volver: <path d="M15 18l-6-6 6-6" />,
  siguiente: <path d="M9 18l6-6-6-6" />,
  ojo: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  ojoTachado: <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><path d="M2 2l20 20" /></>,
  documento: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h5" /></>,
  descarga: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>,
  check: <path d="M20 6L9 17l-5-5" />,
  cerrar: <path d="M18 6L6 18M6 6l12 12" />,
  checkCirculo: <><circle cx="12" cy="12" r="10" /><path d="M16 9l-5.5 6L8 12.5" /></>,
  alerta: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4M12 17h.01" /></>,
  wifi: <><path d="M2 9a14 14 0 0 1 20 0" /><path d="M5 12.5a10 10 0 0 1 14 0" /><path d="M8.5 16a5 5 0 0 1 7 0" /><path d="M12 19.5h.01" /></>,
  wifiApagado: <><path d="M12 19.5h.01" /><path d="M8.5 16a5 5 0 0 1 7 0" /><path d="M5 12.5a10 10 0 0 1 5.2-2.7" /><path d="M19 12.5a10 10 0 0 0-2-1.5" /><path d="M2 9a14 14 0 0 1 4.2-2.6" /><path d="M22 9a14 14 0 0 0-11.3-3.8" /><path d="M2 2l20 20" /></>,
  mensaje: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
  globo: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>,
  actualizar: <><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></>,
  sol: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></>,
  monitor: <><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></>,
  luna: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
  basura: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
} satisfies Record<string, ReactNode>;

export type NombreIcono = keyof typeof TRAZOS;

export function Icono({ nombre, tamano = 18, grosor = 2, color, estilo }: {
  nombre: NombreIcono;
  tamano?: number;
  grosor?: number;
  color?: string;
  estilo?: CSSProperties;
}) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0, color, ...estilo }}
    >
      {TRAZOS[nombre]}
    </svg>
  );
}

/** Señal WiFi: se encienden tantos arcos como el nivel (1 baja, 2 normal, 3 buena). */
export function IconoSenal({ nivel, color, tamano = 16 }: { nivel: 1 | 2 | 3; color: string; tamano?: number }) {
  const arco = (encendido: boolean) => ({ opacity: encendido ? 1 : 0.28 });
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true" style={{ display: 'block', flexShrink: 0, color }}>
      <path d="M2 9a14 14 0 0 1 20 0" style={arco(nivel >= 3)} />
      <path d="M5 12.5a10 10 0 0 1 14 0" style={arco(nivel >= 2)} />
      <path d="M8.5 16a5 5 0 0 1 7 0" />
      <path d="M12 19.5h.01" />
    </svg>
  );
}

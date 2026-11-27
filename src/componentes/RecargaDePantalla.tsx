// Registra la recarga de datos de una pestaña para el "tirar para actualizar" (ESTANDARES D6) solo mientras esa
// pestaña es la que se ve: las pestañas quedan montadas (ocultas) al cambiar de una a otra, y sin este filtro un
// tirón en Perfil o en el detalle de un equipo recargaría Equipos y Alertas en vez de la pantalla visible.
import { useLocation } from 'react-router';
import { useRecargaDePantalla } from './TirarParaActualizar';

function Registro({ recargar }: { recargar: () => unknown }) {
  useRecargaDePantalla(recargar);
  return null;
}

export function RecargaDePantalla({ ruta, recargar }: { ruta: string; recargar: () => unknown }) {
  const { pathname } = useLocation();
  return pathname === ruta ? <Registro recargar={recargar} /> : null;
}

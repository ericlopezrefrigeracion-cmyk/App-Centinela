// Navegación de la app. Mismas direcciones que la versión anterior:
//   sin sesión: /login, /registro, /verificar-email
//   con sesión: / (equipos), /alertas, /historicos, /perfil,
//               /equipo/agregar, /equipo/:id, /equipo/configurar/:id
//
// Igual que antes, las pestañas quedan abiertas debajo de las pantallas de equipo (al volver no
// se recargan) y cada pestaña conserva su estado al cambiar de una a otra.
import { useRef, type ReactNode } from 'react';
import { Navigate, matchPath, useLocation } from 'react-router';
import { BarraPestanas, Encabezado, PESTANAS, type Pestana } from './componentes/navegacion';
import { useAuth } from './contexto/AuthContext';
import { C } from './lib/tema';
import Alertas from './pantallas/Alertas';
import EquipoAgregar from './pantallas/EquipoAgregar';
import EquipoConfigurar from './pantallas/EquipoConfigurar';
import EquipoDetalle from './pantallas/EquipoDetalle';
import Equipos from './pantallas/Equipos';
import Historicos from './pantallas/Historicos';
import Login from './pantallas/Login';
import Perfil from './pantallas/Perfil';
import Registro from './pantallas/Registro';
import VerificarEmail from './pantallas/VerificarEmail';

const RUTAS_ACCESO = ['/login', '/registro', '/verificar-email'];

/** Pantalla apilada: ocupa todo encima de lo que haya debajo, con su encabezado. */
function Apilada({ titulo, inicio, children }: { titulo?: string; inicio?: string; children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, backgroundColor: C.background, zIndex: 1 }}>
      {titulo && <Encabezado titulo={titulo} inicio={inicio} />}
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function pestanaDeRuta(ruta: string): Pestana | null {
  return PESTANAS.find((p) => p.ruta === ruta)?.clave ?? null;
}

function PantallasConSesion() {
  const { pathname } = useLocation();
  const actual = pestanaDeRuta(pathname);

  // Última pestaña mostrada: queda debajo de las pantallas de equipo
  const ultima = useRef<Pestana>('equipos');
  if (actual) ultima.current = actual;
  // Pestañas ya abiertas (se montan la primera vez que se visitan y no se desmontan)
  const abiertas = useRef(new Set<Pestana>());
  abiertas.current.add(ultima.current);

  const agregar = matchPath('/equipo/agregar', pathname);
  const configurar = matchPath('/equipo/configurar/:id', pathname);
  const detalle = !agregar && !configurar ? matchPath('/equipo/:id', pathname) : null;
  const apilada = agregar ? (
    <Apilada titulo="Agregar equipo"><EquipoAgregar /></Apilada>
  ) : configurar ? (
    <Apilada titulo="Configurar equipo"><EquipoConfigurar key={configurar.params.id} id={configurar.params.id!} /></Apilada>
  ) : detalle ? (
    <Apilada titulo="Datos del equipo"><EquipoDetalle key={detalle.params.id} id={detalle.params.id!} /></Apilada>
  ) : null;

  // Cualquier otra dirección vuelve al inicio
  if (!actual && !apilada) return <Navigate to="/" replace />;

  const pantallas: Record<Pestana, ReactNode> = {
    equipos: <Equipos />,
    alertas: <Alertas />,
    historicos: <Historicos />,
    perfil: <Perfil />,
  };

  return (
    <div style={{ flex: 1, backgroundColor: C.background }}>
      <div style={{ flex: 1 }}>
        {PESTANAS.filter((p) => abiertas.current.has(p.clave)).map((p) => (
          <div key={p.clave} style={{ flex: 1, display: p.clave === ultima.current ? 'flex' : 'none' }}>
            {pantallas[p.clave]}
          </div>
        ))}
      </div>
      <BarraPestanas activa={ultima.current} />
      {apilada}
    </div>
  );
}

function PantallasSinSesion() {
  const { pathname } = useLocation();
  return (
    <div style={{ flex: 1, backgroundColor: C.background }}>
      {/* El inicio de sesión queda debajo, como antes */}
      <Login />
      {pathname === '/registro' && <Apilada titulo="Registro" inicio="/login"><Registro /></Apilada>}
      {pathname === '/verificar-email' && <Apilada titulo="Verificar email" inicio="/login"><VerificarEmail /></Apilada>}
    </div>
  );
}

export default function App() {
  const { estaLogueado } = useAuth();
  const location = useLocation();
  const enAcceso = RUTAS_ACCESO.includes(location.pathname);

  if (estaLogueado) {
    if (enAcceso) {
      // Recién entró: vuelve a la dirección que quería abrir (por ejemplo, un enlace a un equipo)
      const desde = (location.state as { desde?: string } | null)?.desde;
      return <Navigate to={desde && !RUTAS_ACCESO.includes(desde) ? desde : '/'} replace />;
    }
    return <PantallasConSesion />;
  }

  if (!enAcceso) {
    const desde = location.pathname === '/' ? undefined : location.pathname + location.search;
    return <Navigate to="/login" replace state={desde ? { desde } : undefined} />;
  }
  return <PantallasSinSesion />;
}

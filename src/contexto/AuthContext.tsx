import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { registrarCierreSesion } from '../lib/api';
import { CLAVES, borrarSesion, guardar, leer } from '../lib/almacenamiento';
import { authService } from '../lib/servicios';

export interface Usuario {
  mail: string;
  nombre: string;
  tipo: string;
}

interface Resultado { ok: boolean; mensaje?: string }

interface ValorAuth {
  usuario: Usuario | null;
  token: string | null;
  cargando: boolean;
  estaLogueado: boolean;
  login: (mail: string, password: string) => Promise<Resultado>;
  logout: () => Promise<void>;
  registro: (datos: Parameters<typeof authService.registro>[0]) => Promise<Resultado>;
  verificarEmail: (mail: string, codigo: string) => Promise<Resultado>;
  reenviarVerificacion: (mail: string) => Promise<Resultado>;
}

const AuthContext = createContext<ValorAuth | null>(null);

/** Sesión guardada en el navegador (mismas claves que la versión anterior). */
function sesionGuardada(): { token: string | null; usuario: Usuario | null } {
  try {
    const t = leer(CLAVES.token);
    const u = leer(CLAVES.usuario);
    if (t && u) return { token: t, usuario: JSON.parse(u) };
  } catch (e) {
    console.log('Error verificando sesión:', e);
  }
  return { token: null, usuario: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // localStorage se lee de forma sincrónica: la sesión está disponible desde el primer render
  const [inicial] = useState(sesionGuardada);
  const [usuario, setUsuario] = useState<Usuario | null>(inicial.usuario);
  const [token, setToken] = useState<string | null>(inicial.token);

  async function login(mail: string, password: string): Promise<Resultado> {
    try {
      const res = await authService.login(mail, password);
      guardar(CLAVES.token, res.accessToken);
      guardar(CLAVES.refresh, res.refreshToken);
      guardar(CLAVES.usuario, JSON.stringify(res.usuario));
      setToken(res.accessToken);
      setUsuario(res.usuario);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, mensaje: e.response?.data?.detail || 'Credenciales incorrectas' };
    }
  }

  async function registro(datos: Parameters<typeof authService.registro>[0]): Promise<Resultado> {
    try {
      await authService.registro(datos);
      return { ok: true };
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      let msg = 'Error al registrarse';
      if (typeof detail === 'string') msg = detail;
      else if (Array.isArray(detail)) msg = detail.map((d: any) => d.msg).join(', ');
      else if (detail) msg = JSON.stringify(detail);
      return { ok: false, mensaje: msg };
    }
  }

  async function verificarEmail(mail: string, codigo: string): Promise<Resultado> {
    try {
      await authService.verificarEmail(mail, codigo);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, mensaje: e.response?.data?.detail || 'Código incorrecto' };
    }
  }

  async function reenviarVerificacion(mail: string): Promise<Resultado> {
    try {
      await authService.reenviarVerificacion(mail);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  const logout = useCallback(async () => {
    const refreshToken = leer(CLAVES.refresh);
    if (refreshToken) await authService.cerrarSesion(refreshToken);
    borrarSesion();
    setToken(null);
    setUsuario(null);
  }, []);

  // Si el interceptor de la API no puede renovar la sesión, la cierra acá
  useEffect(() => {
    registrarCierreSesion(() => { void logout(); });
    return () => registrarCierreSesion(null);
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        usuario, token, cargando: false,
        estaLogueado: !!token,
        login, logout, registro, verificarEmail, reenviarVerificacion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

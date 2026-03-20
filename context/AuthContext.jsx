import { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authService } from '../services/services';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario]   = useState(null);
  const [token, setToken]       = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => { verificarSesion(); }, []);

  async function verificarSesion() {
    try {
      const t = await SecureStore.getItemAsync('centinela_token');
      const u = await SecureStore.getItemAsync('centinela_usuario');
      if (t && u) {
        setToken(t);
        setUsuario(JSON.parse(u));
      }
    } catch (e) {
      console.log('Error verificando sesión:', e);
    } finally {
      setCargando(false);
    }
  }

  async function login(mail, password) {
    try {
      const res = await authService.login(mail, password);
      await SecureStore.setItemAsync('centinela_token', res.token);
      await SecureStore.setItemAsync('centinela_usuario', JSON.stringify(res.usuario));
      setToken(res.token);
      setUsuario(res.usuario);
      return { ok: true };
    } catch (e) {
      const msg = e.response?.data?.detail || 'Credenciales incorrectas';
      return { ok: false, mensaje: msg };
    }
  }

  async function registro(datos) {
    try {
      await authService.registro(datos);
      return { ok: true };
    } catch (e) {
      console.log('Registro error:', JSON.stringify(e.response?.data));
      const detail = e.response?.data?.detail;
      let msg = 'Error al registrarse';
      if (typeof detail === 'string') msg = detail;
      else if (Array.isArray(detail)) msg = detail.map(d => d.msg).join(', ');
      else if (detail) msg = JSON.stringify(detail);
      return { ok: false, mensaje: msg };
    }
  }

  async function verificarEmail(mail, codigo) {
    try {
      await authService.verificarEmail(mail, codigo);
      return { ok: true };
    } catch (e) {
      const msg = e.response?.data?.detail || 'Código incorrecto';
      return { ok: false, mensaje: msg };
    }
  }

  async function reenviarVerificacion(mail) {
    try {
      await authService.reenviarVerificacion(mail);
      return { ok: true };
    } catch (e) {
      return { ok: false };
    }
  }

  async function logout() {
    await SecureStore.deleteItemAsync('centinela_token');
    await SecureStore.deleteItemAsync('centinela_usuario');
    setToken(null);
    setUsuario(null);
  }

  // Registrar logout en api para que el interceptor 401 lo pueda llamar
  useEffect(() => {
    if (typeof global !== 'undefined') {
      global._centinelaLogout = logout;
    }
  }, [logout]);

  return (
    <AuthContext.Provider value={{
      usuario, token, cargando,
      estaLogueado: !!token,
      login, logout, registro, verificarEmail, reenviarVerificacion,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

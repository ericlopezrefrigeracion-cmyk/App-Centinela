import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { CLAVES, borrarSesion, guardar, leer } from './almacenamiento';

export const BASE_URL = 'https://api.telemet.com.ar';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Lo registra AuthContext: cuando no se puede renovar la sesión, la cierra en pantalla.
let alCerrarSesion: (() => void) | null = null;
export function registrarCierreSesion(fn: (() => void) | null) {
  alCerrarSesion = fn;
}

api.interceptors.request.use((config) => {
  const token = leer(CLAVES.token);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Mutex para no pedir varios refresh a la vez: los pedidos que reciben 401 mientras hay un
//    refresh en curso esperan en la cola y se reintentan con el token nuevo. ──
let renovando = false;
let cola: { resolve: (token: string) => void; reject: (e: unknown) => void }[] = [];

function resolverCola(token: string) {
  cola.forEach(({ resolve }) => resolve(token));
  cola = [];
}

function rechazarCola(error: unknown) {
  cola.forEach(({ reject }) => reject(error));
  cola = [];
}

type ConfigConReintento = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const orig = error.config as ConfigConReintento | undefined;

    if (error.response?.status === 401 && orig && !orig._retry) {
      // Si ya hay un refresh en curso, encolar este pedido
      if (renovando) {
        return new Promise<string>((resolve, reject) => {
          cola.push({ resolve, reject });
        }).then((tokenNuevo) => {
          orig.headers.Authorization = `Bearer ${tokenNuevo}`;
          return api(orig);
        });
      }

      orig._retry = true;
      renovando = true;

      try {
        const refreshToken = leer(CLAVES.refresh);
        if (!refreshToken) throw new Error('no refresh token');

        // axios directo (sin la instancia) para no volver a pasar por este interceptor
        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken });

        // Acepta las dos formas de respuesta:
        // { token: { access_token, refresh_token } }  ← igual que el login
        // { access_token, refresh_token }             ← respuesta directa
        const accesoNuevo = res.data.token?.access_token ?? res.data.access_token;
        const refreshNuevo = res.data.token?.refresh_token ?? res.data.refresh_token;

        guardar(CLAVES.token, accesoNuevo);
        guardar(CLAVES.refresh, refreshNuevo);

        resolverCola(accesoNuevo);
        orig.headers.Authorization = `Bearer ${accesoNuevo}`;
        return api(orig);
      } catch (errorRefresh) {
        rechazarCola(errorRefresh);
        borrarSesion();
        alCerrarSesion?.();
        return Promise.reject(errorRefresh);
      } finally {
        renovando = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;

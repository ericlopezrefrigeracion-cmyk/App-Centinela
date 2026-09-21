import axios from 'axios';
import * as storage from './storage';

export const BASE_URL = 'https://api.telemet.com.ar';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItemAsync('centinela_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (e) {}
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Mutex para evitar múltiples refresh simultáneos ──────
let isRefreshing = false;
let refreshQueue = [];

function resolveQueue(token) {
  refreshQueue.forEach(({ resolve }) => resolve(token));
  refreshQueue = [];
}

function rejectQueue(error) {
  refreshQueue.forEach(({ reject }) => reject(error));
  refreshQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const orig = error.config;

    if (error.response?.status === 401 && !orig._retry) {
      // Si ya hay un refresh en curso, encolar este request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((newToken) => {
          orig.headers.Authorization = `Bearer ${newToken}`;
          return api(orig);
        });
      }

      orig._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await storage.getItemAsync('centinela_refresh_token');
        if (!refreshToken) throw new Error('no refresh token');

        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken });

        // Soporte para ambas estructuras de respuesta:
        // { token: { access_token, refresh_token } }  ← igual que login
        // { access_token, refresh_token }             ← respuesta directa
        const newAccessToken  = res.data.token?.access_token  ?? res.data.access_token;
        const newRefreshToken = res.data.token?.refresh_token ?? res.data.refresh_token;

        await storage.setItemAsync('centinela_token', newAccessToken);
        await storage.setItemAsync('centinela_refresh_token', newRefreshToken);

        resolveQueue(newAccessToken);
        orig.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(orig);
      } catch (refreshError) {
        rejectQueue(refreshError);
        await storage.deleteItemAsync('centinela_token');
        await storage.deleteItemAsync('centinela_refresh_token');
        await storage.deleteItemAsync('centinela_usuario');
        if (typeof global !== 'undefined' && global._centinelaLogout) {
          global._centinelaLogout();
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

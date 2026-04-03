import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const BASE_URL = 'https://api.telemet.com.ar';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('centinela_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (e) {}
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('centinela_refresh_token');
        if (refreshToken) {
          // Usar axios directo para no gatillar este mismo interceptor
          const res = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
          const newAccessToken  = res.data.token.access_token;
          const newRefreshToken = res.data.token.refresh_token;
          await SecureStore.setItemAsync('centinela_token', newAccessToken);
          await SecureStore.setItemAsync('centinela_refresh_token', newRefreshToken);
          error.config.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(error.config);
        }
      } catch {
        // Refresh falló — cerrar sesión
      }
      await SecureStore.deleteItemAsync('centinela_token');
      await SecureStore.deleteItemAsync('centinela_refresh_token');
      await SecureStore.deleteItemAsync('centinela_usuario');
      if (typeof global !== 'undefined' && global._centinelaLogout) {
        global._centinelaLogout();
      }
    }
    return Promise.reject(error);
  }
);

export default api;

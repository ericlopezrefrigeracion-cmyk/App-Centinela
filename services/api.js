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
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('centinela_token');
      await SecureStore.deleteItemAsync('centinela_usuario');
      // Cerrar sesión automáticamente
      if (typeof global !== 'undefined' && global._centinelaLogout) {
        global._centinelaLogout();
      }
    }
    return Promise.reject(error);
  }
);

export default api;

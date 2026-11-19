// Endpoints de https://api.telemet.com.ar (los mismos de siempre).
import axios from 'axios';
import api, { BASE_URL } from './api';
import { mapearEquipos, type EquipoApi, type ItemEquipoApi } from './equipos';

// ── AUTH ──────────────────────────────────────────────
export const authService = {
  login: async (mail: string, password: string) => {
    const res = await api.post('/auth/login', { mail, password });
    // Responde: { token: { access_token, refresh_token, token_type }, sub, tipo, nombre }
    return {
      accessToken: res.data.token.access_token as string,
      refreshToken: res.data.token.refresh_token as string,
      usuario: {
        mail: res.data.sub as string,
        nombre: res.data.nombre as string,
        tipo: res.data.tipo as string,
      },
    };
  },

  refresh: async (refreshToken: string) => {
    // axios directo para no gatillar el interceptor de api.ts
    const res = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
    return {
      accessToken: res.data.token.access_token as string,
      refreshToken: res.data.token.refresh_token as string,
    };
  },

  cerrarSesion: async (refreshToken: string) => {
    try {
      await api.post('/auth/logout', { refresh_token: refreshToken });
    } catch {
      // Si falla el logout en el servidor igual se limpia localmente
    }
  },

  recuperarPassword: async (email: string) => {
    await api.post('/auth/recuperar', { email });
  },

  registro: async (datos: { mail: string; nombre: string; apellido: string; password: string; cuit?: string; telefono?: string }) => {
    const { mail, nombre, apellido, password, cuit, telefono } = datos;
    const res = await api.post('/auth/registro', { mail, nombre, apellido, password, cuit, telefono });
    return res.data;
  },

  verificarEmail: async (mail: string, codigo: string) => {
    const res = await api.post('/auth/verificar-email', { mail, codigo });
    return res.data;
  },

  reenviarVerificacion: async (mail: string) => {
    await api.post('/auth/reenviar-verificacion', { mail });
  },

  getPerfil: async () => {
    const res = await api.get('/app/perfil');
    return res.data;
  },

  updatePerfil: async (datos: Record<string, unknown>) => {
    const res = await api.patch('/app/perfil', datos);
    return res.data;
  },
};

// ── EQUIPOS ───────────────────────────────────────────
export const equipoService = {
  getMisEquipos: async (): Promise<EquipoApi[]> => {
    const res = await api.get<ItemEquipoApi[]>('/app/equipos');
    // Responde: [{ equipo, rol, ultimo_dato }]
    return mapearEquipos(res.data);
  },

  vincularEquipo: async (codigo: string) => {
    const res = await api.post('/app/equipos/vincular', { codigo });
    return res.data;
  },

  registrarEquipo: async (datos: { codigo: string; nombre: string; descripcion?: string; ubicacion?: string; modelo?: string }) => {
    const { codigo, nombre, descripcion, ubicacion, modelo } = datos;
    const res = await api.post('/app/equipos/registrar', { codigo, nombre, descripcion, ubicacion, modelo });
    return res.data;
  },

  editarInfo: async (id: string, datos: { nombre: string; descripcion: string; ubicacion: string }) => {
    const res = await api.patch(`/app/equipos/${id}/info`, datos);
    return res.data;
  },

  editarParametros: async (id: string, datos: Record<string, unknown>) => {
    // datos: { minima, maxima, calibracion, set_point, retardo, alertas_cliente, resumen_semanal }
    const res = await api.patch(`/app/equipos/${id}/parametros`, datos);
    return res.data;
  },

  desvincularEquipo: async (id: string) => {
    await api.delete(`/app/equipos/${id}`);
  },

  // Usuarios del equipo (el servidor ya lo permite; la app todavía no tiene pantalla)
  getUsuariosEquipo: async (id: string) => {
    const res = await api.get(`/app/equipos/${id}/usuarios`);
    return res.data;
  },

  agregarUsuarioEquipo: async (equipoId: string, mail: string, rol: string) => {
    const res = await api.post(`/app/equipos/${equipoId}/usuarios`, { mail, rol });
    return res.data;
  },

  cambiarRolUsuario: async (equipoId: string, mail: string, rol: string) => {
    const res = await api.patch(`/app/equipos/${equipoId}/usuarios/${mail}`, { rol });
    return res.data;
  },

  eliminarUsuarioEquipo: async (equipoId: string, mail: string) => {
    await api.delete(`/app/equipos/${equipoId}/usuarios/${mail}`);
  },
};

// ── DATOS ─────────────────────────────────────────────
export const datosService = {
  getRecientes: async (equipoId: string) => {
    const res = await api.get(`/app/datos/${equipoId}/recientes`);
    return res.data; // [{ id, equipo_id, temp, rssi, fecha }]
  },

  getHistorico: async (equipoId: string, desde: string, hasta: string, agrupacion = 'dia') => {
    const res = await api.get(`/app/datos/${equipoId}/historico`, { params: { desde, hasta, agrupacion } });
    return res.data; // { agrupados: [...], total_registros }
  },

  exportar: async (equipoId: string, desde: string, hasta: string, formato = 'xlsx') => {
    const res = await api.get(`/app/datos/${equipoId}/exportar`, { params: { desde, hasta, formato }, responseType: 'blob' });
    return res.data;
  },
};

// ── ALERTAS ───────────────────────────────────────────
export const alertaService = {
  getAlertas: async ({ soloNoLeidas = false, offset = 0, limit = 20 } = {}) => {
    const res = await api.get('/app/alertas', { params: { solo_no_leidas: soloNoLeidas, offset, limit } });
    return res.data; // { items, total, offset, limit }
  },

  marcarLeida: async (alertaId: number | string) => {
    const res = await api.patch(`/app/alertas/${alertaId}`);
    return res.data;
  },

  marcarTodasLeidas: async (equipoId: string) => {
    const res = await api.post(`/app/equipos/${equipoId}/alertas/marcar-leidas`);
    return res.data;
  },
};

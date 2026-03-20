// ─────────────────────────────────────────────────────
//  services/services.js — API REAL
//  Conectado a https://telemet.144.217.82.140.nip.io
// ─────────────────────────────────────────────────────
import api from './api';

// ── AUTH ──────────────────────────────────────────────
export const authService = {

  login: async (mail, password) => {
    const res = await api.post('/auth/login', { mail, password });
    // Responde: { token: { access_token, token_type }, sub, tipo, nombre }
    return {
      token:   res.data.token.access_token,
      usuario: {
        mail:   res.data.sub,
        nombre: res.data.nombre,
        tipo:   res.data.tipo,
      },
    };
  },

  registro: async ({ mail, nombre, apellido, password, cuit, telefono }) => {
    const res = await api.post('/auth/registro', { mail, nombre, apellido, password, cuit, telefono });
    return res.data; // UsuarioResponse
  },

  verificarEmail: async (mail, codigo) => {
    const res = await api.post('/auth/verificar-email', { mail, codigo });
    return res.data;
  },

  reenviarVerificacion: async (mail) => {
    await api.post('/auth/reenviar-verificacion', { mail });
  },

  getPerfil: async () => {
    const res = await api.get('/app/perfil');
    return res.data;
  },

  updatePerfil: async (datos) => {
    const res = await api.patch('/app/perfil', datos);
    return res.data;
  },

  registrarFcmToken: async (token) => {
    await api.post('/app/perfil/fcm-token', { token, plataforma: 'android' });
  },

  eliminarFcmToken: async (token) => {
    await api.delete('/app/perfil/fcm-token', { data: { token } });
  },
};

// ── EQUIPOS ───────────────────────────────────────────
export const equipoService = {

  getMisEquipos: async () => {
    const res = await api.get('/app/equipos');
    // Responde: [{ equipo, rol, ultimo_dato }]
    return res.data.map(item => ({
      ...item.equipo,
      rol:        item.rol,
      ultimo_dato: item.ultimo_dato,
      // Adaptar campos para la app
      temperatura:      item.ultimo_dato?.temp ?? null,
      rssi:             item.ultimo_dato?.rssi ?? null,
      ultimaConexion:   item.equipo.ultima_conexion,
      minima:           item.equipo.minima,
      maxima:           item.equipo.maxima,
      setpoint:         item.equipo.set_point,
      retardo:          item.equipo.retardo,
      alertasActivas:   item.equipo.alertas_cliente,
    }));
  },

  vincularEquipo: async (codigo) => {
    const res = await api.post('/app/equipos/vincular', { codigo });
    return res.data;
  },

  registrarEquipo: async ({ codigo, nombre, descripcion, ubicacion, modelo }) => {
    const res = await api.post('/app/equipos/registrar', { codigo, nombre, descripcion, ubicacion, modelo });
    return res.data; // EquipoConRolResponse
  },

  editarInfo: async (id, datos) => {
    const res = await api.patch(`/app/equipos/${id}/info`, datos);
    return res.data;
  },

  editarParametros: async (id, datos) => {
    // datos: { minima, maxima, calibracion, set_point, retardo }
    const res = await api.patch(`/app/equipos/${id}/parametros`, datos);
    return res.data;
  },

  desvincularEquipo: async (id) => {
    await api.delete(`/app/equipos/${id}`);
  },

  // Usuarios del equipo
  getUsuariosEquipo: async (id) => {
    const res = await api.get(`/app/equipos/${id}/usuarios`);
    return res.data;
  },

  agregarUsuarioEquipo: async (equipoId, mail, rol) => {
    const res = await api.post(`/app/equipos/${equipoId}/usuarios`, { mail, rol });
    return res.data;
  },

  cambiarRolUsuario: async (equipoId, mail, rol) => {
    const res = await api.patch(`/app/equipos/${equipoId}/usuarios/${mail}`, { rol });
    return res.data;
  },

  eliminarUsuarioEquipo: async (equipoId, mail) => {
    await api.delete(`/app/equipos/${equipoId}/usuarios/${mail}`);
  },
};

// ── DATOS ─────────────────────────────────────────────
export const datosService = {

  getRecientes: async (equipoId) => {
    const res = await api.get(`/app/datos/${equipoId}/recientes`);
    return res.data; // [{ id, equipo_id, temp, rssi, fecha }]
  },

  getHistorico: async (equipoId, desde, hasta, agrupacion = 'dia') => {
    const res = await api.get(`/app/datos/${equipoId}/historico`, {
      params: { desde, hasta, agrupacion },
    });
    return res.data; // { agrupados: [...], total_registros }
  },

  exportar: async (equipoId, desde, hasta, formato = 'xlsx') => {
    const res = await api.get(`/app/datos/${equipoId}/exportar`, {
      params: { desde, hasta, formato },
      responseType: 'blob',
    });
    return res.data;
  },
};

// ── ALERTAS ───────────────────────────────────────────
export const alertaService = {

  getAlertas: async ({ soloNoLeidas = false, offset = 0, limit = 20 } = {}) => {
    const res = await api.get('/app/alertas', {
      params: { solo_no_leidas: soloNoLeidas, offset, limit },
    });
    return res.data; // { items, total, offset, limit }
  },

  marcarLeida: async (alertaId) => {
    const res = await api.patch(`/app/alertas/${alertaId}`);
    return res.data;
  },

  marcarTodasLeidas: async (equipoId) => {
    const res = await api.post(`/app/equipos/${equipoId}/alertas/marcar-leidas`);
    return res.data;
  },
};

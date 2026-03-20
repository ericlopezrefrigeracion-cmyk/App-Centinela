// ─────────────────────────────────────────────────────
//  services/services.js
// ─────────────────────────────────────────────────────
import api from './api';

export const authService = {

  // POST /api/auth/login
  // Recibe: { email, password }
  // Devuelve: { token, usuario }
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },

  // POST /api/auth/recuperar
  // Envía email para recuperar contraseña
  recuperarPassword: async (email) => {
    const res = await api.post('/auth/recuperar', { email });
    return res.data;
  },

  // GET /api/auth/perfil
  // Trae los datos del usuario logueado
  getPerfil: async () => {
    const res = await api.get('/auth/perfil');
    return res.data;
  },

  // PUT /api/auth/perfil
  // Actualiza datos del perfil
  updatePerfil: async (datos) => {
    const res = await api.put('/auth/perfil', datos);
    return res.data;
  },
};


// ─────────────────────────────────────────────────────
//  services/equipoService.js
// ─────────────────────────────────────────────────────
export const equipoService = {

  // GET /api/equipos
  // Trae todos los equipos del usuario logueado
  getMisEquipos: async () => {
    const res = await api.get('/equipos');
    return res.data;
    // Devuelve array de:
    // { id, nombre, descripcion, ubicacion, temperatura, rssi,
    //   estado, minima, maxima, retardo, alertasActivas,
    //   setpoint, ultimaConexion }
  },

  // GET /api/equipos/:id
  // Trae un equipo específico con todos sus datos
  getEquipo: async (id) => {
    const res = await api.get(`/equipos/${id}`);
    return res.data;
  },

  // POST /api/equipos
  // Agrega un equipo nuevo al usuario
  // Recibe: { id, nombre, descripcion, ubicacion }
  agregarEquipo: async (datos) => {
    const res = await api.post('/equipos', datos);
    return res.data;
  },

  // PUT /api/equipos/:id
  // Edita la configuración de un equipo
  // Recibe: { nombre, descripcion, ubicacion, minima, maxima,
  //           retardo, alertasActivas, setpoint }
  editarEquipo: async (id, datos) => {
    const res = await api.put(`/equipos/${id}`, datos);
    return res.data;
  },

  // DELETE /api/equipos/:id
  // Elimina un equipo del usuario
  eliminarEquipo: async (id) => {
    const res = await api.delete(`/equipos/${id}`);
    return res.data;
  },
};


// ─────────────────────────────────────────────────────
//  services/alertaService.js
// ─────────────────────────────────────────────────────
export const alertaService = {

  // GET /api/alertas
  // Trae todas las alertas no vistas del usuario
  getAlertas: async () => {
    const res = await api.get('/alertas');
    return res.data;
    // Devuelve array de:
    // { id, fecha, equipo, tipo, descripcion, vista }
  },

  // GET /api/alertas/equipo/:id?horas=24
  // Trae las alertas de las últimas 24hs de un equipo
  getAlertasEquipo: async (equipoId, horas = 24) => {
    const res = await api.get(`/alertas/equipo/${equipoId}`, {
      params: { horas }
    });
    return res.data;
  },

  // PUT /api/alertas/:id/vista
  // Marca una alerta como vista
  marcarVista: async (id) => {
    const res = await api.put(`/alertas/${id}/vista`);
    return res.data;
  },

  // PUT /api/alertas/marcar-todas
  // Marca todas las alertas como vistas
  marcarTodasVistas: async () => {
    const res = await api.put('/alertas/marcar-todas');
    return res.data;
  },
};


// ─────────────────────────────────────────────────────
//  services/datosService.js
// ─────────────────────────────────────────────────────
export const datosService = {

  // GET /api/datos/:equipoId/24hs
  // Trae los datos de temperatura de las últimas 24hs
  getDatos24hs: async (equipoId) => {
    const res = await api.get(`/datos/${equipoId}/24hs`);
    return res.data;
    // Devuelve array de: { fecha, temp, rssi }
  },

  // GET /api/datos/:equipoId/historico?dias=7
  // Trae datos históricos de 7 o 30 días
  getHistorico: async (equipoId, dias = 7) => {
    const res = await api.get(`/datos/${equipoId}/historico`, {
      params: { dias }
    });
    return res.data;
  },

  // GET /api/datos/:equipoId/semana?fecha=2025-01-01
  // Trae datos de una semana específica para descarga
  getSemana: async (equipoId, fechaInicio) => {
    const res = await api.get(`/datos/${equipoId}/semana`, {
      params: { fecha: fechaInicio }
    });
    return res.data;
  },
};
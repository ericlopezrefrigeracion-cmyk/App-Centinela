// Validaciones de los formularios (mismas reglas y mensajes que antes).

export interface FormConfiguracion {
  nombre: string;
  descripcion: string;
  ubicacion: string;
  minima: string;
  maxima: string;
  setpoint: string;
  calibracion: string;
  retardo: string;
  alertasActivas: boolean;
  reportesSemanales: boolean;
}

export type Errores = Record<string, string>;

export function validarConfiguracion(form: FormConfiguracion): Errores {
  const nuevos: Errores = {};

  // Nombre
  if (!form.nombre.trim()) nuevos.nombre = 'El nombre es requerido';
  else if (form.nombre.trim().length > 30) nuevos.nombre = 'Máximo 30 caracteres';

  // Descripción
  if (form.descripcion.length > 50) nuevos.descripcion = 'Máximo 50 caracteres';

  // Ubicación
  if (form.ubicacion.length > 40) nuevos.ubicacion = 'Máximo 40 caracteres';

  // Mínima
  if (!form.minima.trim()) nuevos.minima = 'La temperatura mínima es requerida';
  else if (isNaN(Number(form.minima))) nuevos.minima = 'Debe ser un número';
  else if (Number(form.minima) < -50 || Number(form.minima) > 100) nuevos.minima = 'Debe estar entre -50 y +100°C';

  // Máxima
  if (!form.maxima.trim()) nuevos.maxima = 'La temperatura máxima es requerida';
  else if (isNaN(Number(form.maxima))) nuevos.maxima = 'Debe ser un número';
  else if (Number(form.maxima) < -50 || Number(form.maxima) > 100) nuevos.maxima = 'Debe estar entre -50 y +100°C';
  else if (form.minima && !nuevos.minima && Number(form.maxima) <= Number(form.minima)) nuevos.maxima = 'Debe ser mayor que la mínima';

  // Temperatura deseada (setpoint)
  if (!form.setpoint.trim()) nuevos.setpoint = 'La temperatura deseada es requerida';
  else if (isNaN(Number(form.setpoint))) nuevos.setpoint = 'Debe ser un número';
  else if (form.minima && form.maxima && !nuevos.minima && !nuevos.maxima) {
    if (Number(form.setpoint) < Number(form.minima) || Number(form.setpoint) > Number(form.maxima))
      nuevos.setpoint = `Debe estar entre ${form.minima} y ${form.maxima}°C`;
  }

  // Calibración (opcional)
  if (form.calibracion.trim()) {
    if (isNaN(Number(form.calibracion))) nuevos.calibracion = 'Debe ser un número';
    else if (Number(form.calibracion) < -5 || Number(form.calibracion) > 5) nuevos.calibracion = 'Debe estar entre -5 y +5';
  }

  // Retardo (opcional)
  if (form.retardo.trim()) {
    const r = Number(form.retardo);
    if (isNaN(r) || !Number.isInteger(r)) nuevos.retardo = 'Debe ser un número entero';
    else if (r < 5 || r > 180) nuevos.retardo = 'Debe estar entre 5 y 180 minutos';
  }

  return nuevos;
}

/** Cuerpo de PATCH /app/equipos/:id/parametros (calibración 0 y retardo 5 si quedan vacíos). */
export function parametrosParaGuardar(form: FormConfiguracion) {
  return {
    minima: Number(form.minima),
    maxima: Number(form.maxima),
    set_point: Number(form.setpoint),
    calibracion: form.calibracion.trim() ? Number(form.calibracion) : 0,
    retardo: form.retardo.trim() ? Number(form.retardo) : 5,
    alertas_cliente: form.alertasActivas,
    resumen_semanal: form.reportesSemanales,
  };
}

/** Formulario de configuración a partir del equipo que devuelve la API. */
export function formDesdeEquipo(data: Record<string, any>): FormConfiguracion {
  return {
    nombre: data.nombre ?? '',
    descripcion: data.descripcion ?? '',
    ubicacion: data.ubicacion ?? '',
    minima: String(data.minima ?? ''),
    maxima: String(data.maxima ?? ''),
    setpoint: String(data.set_point ?? data.setpoint ?? ''),
    calibracion: String(data.calibracion ?? ''),
    retardo: String(data.retardo ?? ''),
    alertasActivas: data.alertas_cliente ?? data.alertasActivas ?? true,
    reportesSemanales: data.resumen_semanal ?? false,
  };
}

export function validarLogin(email: string, password: string): { email?: string; password?: string } {
  const nuevos: { email?: string; password?: string } = {};
  if (!email.trim()) nuevos.email = 'El email es requerido';
  else if (!/\S+@\S+\.\S+/.test(email)) nuevos.email = 'El email no es válido';
  if (!password) nuevos.password = 'La contraseña es requerida';
  else if (password.length < 6) nuevos.password = 'Mínimo 6 caracteres';
  return nuevos;
}

export function validarAgregar(form: { id: string; nombre: string }): Errores {
  const nuevos: Errores = {};
  if (!form.id.trim()) nuevos.id = 'El ID del equipo es requerido';
  if (!form.nombre.trim()) nuevos.nombre = 'El nombre es requerido';
  return nuevos;
}

/** Devuelve el aviso a mostrar (título y mensaje) o null si el registro se puede enviar. */
export function validarRegistro(form: { nombre: string; apellido: string; mail: string; password: string; confirmar: string }): { titulo: string; mensaje: string } | null {
  if (!form.nombre || !form.apellido || !form.mail || !form.password)
    return { titulo: 'Campos requeridos', mensaje: 'Completá nombre, apellido, email y contraseña.' };
  if (form.password !== form.confirmar) return { titulo: 'Error', mensaje: 'Las contraseñas no coinciden.' };
  if (form.password.length < 6) return { titulo: 'Error', mensaje: 'La contraseña debe tener al menos 6 caracteres.' };
  return null;
}

/** Mensaje de error de la API (FastAPI manda detail como texto o como lista de errores). */
export function mensajeDeError(err: any, porDefecto: string): string {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join(', ');
  return porDefecto;
}

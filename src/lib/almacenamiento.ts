// Sesión guardada en localStorage, con las mismas claves de siempre (centinela_token,
// centinela_refresh_token, centinela_usuario) para que nadie tenga que volver a entrar.
//
// Deuda aceptada: localStorage es más vulnerable a robo de token por XSS que una cookie httpOnly,
// pero cambiarlo requiere tocar api.telemet.com.ar, que es infraestructura externa.

export const CLAVES = {
  token: 'centinela_token',
  refresh: 'centinela_refresh_token',
  usuario: 'centinela_usuario',
} as const;

export function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

export function guardar(clave: string, valor: string): void {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    // En modo privado con la cuota agotada puede fallar: la sesión no persiste, pero no es fatal.
  }
}

export function borrar(clave: string): void {
  try {
    localStorage.removeItem(clave);
  } catch {
    // ver guardar()
  }
}

export function borrarSesion(): void {
  borrar(CLAVES.token);
  borrar(CLAVES.refresh);
  borrar(CLAVES.usuario);
}

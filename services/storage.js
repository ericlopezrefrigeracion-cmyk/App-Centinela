// Wrapper de sesión para web -- reemplaza expo-secure-store (no existe en web, no hay
// Keychain/Keystore del navegador) por localStorage. Misma API async que SecureStore
// (getItemAsync/setItemAsync/deleteItemAsync) para no tener que tocar más de lo necesario
// en los call sites.
//
// Caveat conocido: localStorage es más vulnerable a robo de token vía XSS que una cookie
// httpOnly. No se migró a cookies de sesión porque el backend (api.telemet.com.ar) es
// infraestructura externa, fuera de nuestro control -- queda como deuda técnica aceptada
// para esta herramienta interna.

export async function getItemAsync(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setItemAsync(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage puede fallar en modo privado con cuota agotada -- no es fatal,
    // la sesión simplemente no persiste entre recargas.
  }
}

export async function deleteItemAsync(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ver comentario en setItemAsync
  }
}

// Renovación del token: con varios pedidos a la vez que reciben 401, se pide UN solo refresh y
// todos se reintentan con el token nuevo.
import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Manejador = (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;

function respuesta(config: InternalAxiosRequestConfig, status: number, data: unknown): AxiosResponse {
  return { data, status, statusText: String(status), headers: {}, config };
}

function rechazo(config: InternalAxiosRequestConfig, status: number): Promise<never> {
  return Promise.reject(new AxiosError(`HTTP ${status}`, 'ERR_BAD_REQUEST', config, null, respuesta(config, status, {})));
}

let manejador: Manejador;

async function cargarApi() {
  vi.resetModules();
  // El adaptador falso tiene que estar antes de crear la instancia (api.ts copia los valores por defecto)
  axios.defaults.adapter = (config) => manejador(config);
  return (await import('./api')).default;
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('centinela_token', 'viejo');
  localStorage.setItem('centinela_refresh_token', 'refresh-viejo');
  localStorage.setItem('centinela_usuario', '{"mail":"a@b.com","nombre":"Ana","tipo":"cliente"}');
});

afterEach(() => {
  axios.defaults.adapter = undefined;
});

describe('renovación del token', () => {
  it('tres pedidos con 401 a la vez hacen un solo refresh y se reintentan con el token nuevo', async () => {
    const refrescos: unknown[] = [];
    const vistos: string[] = [];
    let soltarRefresh!: () => void;
    const refreshListo = new Promise<void>((r) => { soltarRefresh = r; });

    manejador = async (config) => {
      if (config.url?.endsWith('/auth/refresh')) {
        refrescos.push(JSON.parse(config.data));
        await refreshListo; // el refresh tarda: los otros 401 llegan mientras tanto
        return respuesta(config, 200, { token: { access_token: 'nuevo', refresh_token: 'refresh-nuevo' } });
      }
      const auth = String(config.headers.Authorization);
      vistos.push(`${config.url} ${auth}`);
      if (auth === 'Bearer viejo') return rechazo(config, 401);
      return respuesta(config, 200, { url: config.url });
    };

    const api = await cargarApi();
    const pedidos = Promise.all([api.get('/app/equipos'), api.get('/app/alertas'), api.get('/app/perfil')]);
    // Dejar que los tres reciban su 401 antes de terminar el refresh
    await new Promise((r) => setTimeout(r, 20));
    soltarRefresh();
    const res = await pedidos;

    expect(refrescos).toEqual([{ refresh_token: 'refresh-viejo' }]);
    expect(res.map((r) => r.data.url)).toEqual(['/app/equipos', '/app/alertas', '/app/perfil']);
    expect(vistos.filter((v) => v.endsWith('Bearer nuevo')).sort()).toEqual([
      '/app/alertas Bearer nuevo', '/app/equipos Bearer nuevo', '/app/perfil Bearer nuevo',
    ]);
    expect(localStorage.getItem('centinela_token')).toBe('nuevo');
    expect(localStorage.getItem('centinela_refresh_token')).toBe('refresh-nuevo');
  });

  it('acepta la respuesta del refresh sin el objeto token', async () => {
    manejador = async (config) => {
      if (config.url?.endsWith('/auth/refresh')) return respuesta(config, 200, { access_token: 'n2', refresh_token: 'r2' });
      return config.headers.Authorization === 'Bearer n2' ? respuesta(config, 200, 'ok') : rechazo(config, 401);
    };
    const api = await cargarApi();
    expect((await api.get('/app/equipos')).data).toBe('ok');
    expect(localStorage.getItem('centinela_refresh_token')).toBe('r2');
  });

  it('si el refresh falla, rechaza todos los pedidos, borra la sesión y avisa una sola vez', async () => {
    manejador = async (config) => {
      if (config.url?.endsWith('/auth/refresh')) {
        // El refresh tarda un poco: el segundo 401 llega mientras tanto y queda en la cola
        await new Promise((r) => setTimeout(r, 20));
      }
      return rechazo(config, 401);
    };
    const api = await cargarApi();
    const { registrarCierreSesion } = await import('./api');
    const cierre = vi.fn();
    registrarCierreSesion(cierre);

    const resultados = await Promise.allSettled([api.get('/a'), api.get('/b')]);

    expect(resultados.map((r) => r.status)).toEqual(['rejected', 'rejected']);
    expect(cierre).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('centinela_token')).toBeNull();
    expect(localStorage.getItem('centinela_refresh_token')).toBeNull();
    expect(localStorage.getItem('centinela_usuario')).toBeNull();
  });

  it('un error que no es 401 no dispara el refresh', async () => {
    const urls: string[] = [];
    manejador = async (config) => {
      urls.push(config.url!);
      return rechazo(config, 500);
    };
    const api = await cargarApi();
    await expect(api.get('/app/equipos')).rejects.toThrow('HTTP 500');
    expect(urls).toEqual(['/app/equipos']);
    expect(localStorage.getItem('centinela_token')).toBe('viejo');
  });

  it('manda el token guardado en cada pedido', async () => {
    let auth = '';
    manejador = async (config) => {
      auth = String(config.headers.Authorization);
      return respuesta(config, 200, {});
    };
    const api = await cargarApi();
    await api.get('/app/perfil');
    expect(auth).toBe('Bearer viejo');
  });
});

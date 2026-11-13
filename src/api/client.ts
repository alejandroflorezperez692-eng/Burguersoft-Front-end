import axios, { type AxiosResponse } from 'axios';
import { API_URL } from './config';
import {
  MENSAJE_DESCONOCIDO,
  MENSAJE_SERVIDOR,
  mensajeSeguro,
} from '../utils/errores';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 50000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Deja cualquier mensaje del backend listo para mostrarse (siempre en español). */
const sanitizar = (mensaje: unknown, status?: number): string => {
  const seguro = mensajeSeguro(mensaje, status);
  if (seguro) return seguro;
  return status && status >= 500 ? MENSAJE_SERVIDOR : MENSAJE_DESCONOCIDO;
};

apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const token = sessionStorage.getItem('token');
    const esLogin = error.config?.url?.includes('/login');

    if (error.response?.status === 401 && token && !esLogin) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.setItem('aviso_login', 'sesion_expirada');
      window.location.href = '/login';
    }

    const status: number | undefined = error.response?.status;

    if (!error.response) {
      const msg = String(error.message ?? '');
      if (error.code === 'ECONNABORTED' || /timeout|timed out/i.test(msg)) {
        error.message = 'El servidor tardó demasiado en responder. Intenta de nuevo.';
      } else if (/network error|failed to fetch/i.test(msg)) {
        error.message = 'No se pudo conectar con el servidor. Revisa tu conexión.';
      }
    }

    if (error.response?.data) {
      const data = error.response.data;
      const originales: string[] = [];
      const guardar = (v: unknown) => {
        if (typeof v === 'string' && v) originales.push(v);
      };

      if (typeof data === 'string') {
        guardar(data);
        error.response.data = sanitizar(data, status);
      } else if (typeof data === 'object') {
        if (typeof data.message === 'string') {
          guardar(data.message);
          data.message = sanitizar(data.message, status);
        }
        if (typeof data.error === 'string') {
          guardar(data.error);
          data.error = sanitizar(data.error, status);
        }
        if (data.errors && typeof data.errors === 'object') {
          Object.keys(data.errors).forEach((key) => {
            const val = data.errors[key];
            if (Array.isArray(val)) {
              data.errors[key] = val.map((v) => (typeof v === 'string' ? sanitizar(v, status) : v));
              val.forEach(guardar);
            } else if (typeof val === 'string') {
              guardar(val);
              data.errors[key] = sanitizar(val, status);
            }
          });
        }
        if (originales.length) {
          try {
            Object.defineProperty(data, '__crudo', {
              value: originales.join(' '),
              enumerable: false,
              configurable: true,
            });
          } catch {
          }
        }
      }
    }

    return Promise.reject(error);
  }
);

const TTL_CATALOGO_MS = 15_000;
const CATALOGO = ['/productos', '/promociones', '/marcas', '/materias-primas'];
const COMPARTIR = [...CATALOGO, '/me', '/mesas']; // /me y /mesas: solo se unen las simultáneas

type Entrada = { promesa: Promise<AxiosResponse>; expira: number };
const memoria = new Map<string, Entrada>();
const adaptadorReal = axios.getAdapter(apiClient.defaults.adapter);
const clonar = (r: AxiosResponse): AxiosResponse => ({ ...r, data: structuredClone(r.data) });

apiClient.defaults.adapter = (config) => {
  const metodo = (config.method ?? 'get').toLowerCase();
  if (metodo !== 'get') {
    memoria.clear();
    return adaptadorReal(config);
  }

  const url = config.url ?? '';
  const ruta = url.split('?')[0];
  if (!COMPARTIR.includes(ruta) || config.responseType === 'blob') {
    return adaptadorReal(config);
  }

  const clave = `${String(config.headers?.Authorization ?? '')}|${url}|${JSON.stringify(config.params ?? {})}`;
  const previa = memoria.get(clave);
  if (previa && previa.expira > Date.now()) return previa.promesa.then(clonar);

  const ttl = CATALOGO.includes(ruta) ? TTL_CATALOGO_MS : 0;
  const promesa = adaptadorReal(config) as Promise<AxiosResponse>;
  const entrada: Entrada = { promesa, expira: Infinity };
  memoria.set(clave, entrada);
  promesa.then(
    () => {
      if (ttl) entrada.expira = Date.now() + ttl;
      else memoria.delete(clave);
    },
    () => memoria.delete(clave),
  );
  return promesa.then(clonar);
};

export default apiClient;

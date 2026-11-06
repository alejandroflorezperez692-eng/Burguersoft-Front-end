import axios from 'axios';
import {
  MENSAJE_DESCONOCIDO,
  MENSAJE_SERVIDOR,
  mensajeSeguro,
} from '../utils/errores';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
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
    console.log('[API ERROR]', error.config?.url, error.code, error.message);
    const token = sessionStorage.getItem('token');
    const esLogin = error.config?.url?.includes('/login');
    const esDemo = token === 'demo-token-sin-backend';

    if (error.response?.status === 401 && token && !esLogin && !esDemo) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      // Se avisa en el login que la sesión expiró (en vez de redirigir en silencio).
      sessionStorage.setItem('aviso_login', 'sesion_expirada');
      window.location.href = '/login';
    }

    const status: number | undefined = error.response?.status;

    // Errores de red / tiempo de espera: se traducen para que nunca salgan en inglés.
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
      // Se guarda el texto original (sin sanear) por si alguna pantalla
      // necesita detectar casos concretos (p. ej. llaves foráneas de Postgres).
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
            // Si no se puede definir, no es crítico.
          }
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

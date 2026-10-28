import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 50000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const traducirMensaje = (mensajeOriginal: string): string => {
  if (!mensajeOriginal) return mensajeOriginal;
  // Laravel agrega "(and 1 more error)" / "(y 2 errores más)" al mensaje de validación: se quita.
  const mensaje = mensajeOriginal
    .replace(/\s*\((?:and\s+\d+\s+more\s+errors?|y\s+\d+\s+errores?\s+más)\)\.?/gi, '')
    .trim();
  const m = mensaje.toLowerCase();
  if (m.includes('the correo field must be a valid email address')) return 'El campo correo debe ser una dirección de correo válida.';
  if (m.includes('correo field') && m.includes('valid email')) return 'El campo correo debe ser una dirección de correo válida.';
  if (m.includes('email field') && m.includes('valid')) return 'El campo correo debe ser una dirección de correo válida.';
  if (m.includes('must be a valid email')) return 'Debe ser una dirección de correo válida.';
  if (m.includes('invalid email')) return 'Correo electrónico inválido.';
  if (m.includes('password') && m.includes('required')) return 'La contraseña es obligatoria.';
  if (m.includes('correo') && m.includes('required')) return 'El correo es obligatorio.';
  if (m.includes('email') && m.includes('required')) return 'El correo es obligatorio.';
  if (m.includes('unauthenticated') || m.includes('invalid credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('these credentials do not match')) return 'Correo o contraseña incorrectos.';
  if (m.includes('too many attempts')) return 'Demasiados intentos. Por favor, inténtalo más tarde.';
  return mensaje;
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
      window.location.href = '/login';
    }

    if (error.response?.data) {
      const data = error.response.data;
      if (typeof data === 'string') {
        error.response.data = traducirMensaje(data);
      } else if (typeof data === 'object') {
        if (typeof data.message === 'string') {
          data.message = traducirMensaje(data.message);
        }
        if (typeof data.error === 'string') {
          data.error = traducirMensaje(data.error);
        }
        if (data.errors && typeof data.errors === 'object') {
          Object.keys(data.errors).forEach((key) => {
            const val = data.errors[key];
            if (Array.isArray(val)) {
              data.errors[key] = val.map((v) => (typeof v === 'string' ? traducirMensaje(v) : v));
            } else if (typeof val === 'string') {
              data.errors[key] = traducirMensaje(val);
            }
          });
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
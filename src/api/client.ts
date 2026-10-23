import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const traducirMensaje = (mensaje: string): string => {
  if (!mensaje) return mensaje;
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
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const token = localStorage.getItem('token');
    const esLogin = error.config?.url?.includes('/login');
    const esDemo = token === 'demo-token-sin-backend';

    if (error.response?.status === 401 && token && !esLogin && !esDemo) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
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

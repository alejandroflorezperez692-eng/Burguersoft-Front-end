import apiClient from './client';
import type { Usuario } from '../types/Usuario';

interface LoginResponse {
  usuario: Usuario;
  token: string;
}

export async function login(correo: string, contrasena: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/login', { correo, contrasena });
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/logout');
}

export async function obtenerUsuarioActual(): Promise<Usuario> {
  const { data } = await apiClient.get<Usuario>('/me');
  return data;
}

// --- Verificación de correo para registro ---
// Intenta endpoints del backend en orden. Si el backend aún no tiene
// endpoints dedicados de registro, reutiliza los de recuperación
// (/recuperar-contrasena y /verificar-codigo) que ya existen.

const RUTAS_ENVIAR = [
  '/registro/enviar-codigo',
  '/enviar-codigo-registro',
  '/recuperar-contrasena',
];

const RUTAS_VERIFICAR = [
  '/registro/verificar-codigo',
  '/verificar-codigo-registro',
  '/verificar-codigo',
];

export async function enviarCodigoRegistro(correo: string): Promise<{ modoMock: boolean }> {
  const email = correo.trim().toLowerCase();
  let notFoundCount = 0;
  for (const ruta of RUTAS_ENVIAR) {
    try {
      await apiClient.post(ruta, { email, correo: email });
      return { modoMock: false };
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        notFoundCount += 1;
        continue; // prueba la siguiente ruta
      }
      throw err; // otro error (429, 500, red...) se propaga
    }
  }
  if (notFoundCount === RUTAS_ENVIAR.length) {
    throw Object.assign(new Error('MOCK'), { code: 'SIN_BACKEND' });
  }
  throw new Error('No fue posible enviar el código.');
}

export async function verificarCodigoRegistro(correo: string, codigo: string): Promise<void> {
  const email = correo.trim().toLowerCase();
  let notFoundCount = 0;
  for (const ruta of RUTAS_VERIFICAR) {
    try {
      await apiClient.post(ruta, { email, correo: email, codigo });
      return;
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        notFoundCount += 1;
        continue;
      }
      throw err;
    }
  }
  if (notFoundCount === RUTAS_VERIFICAR.length) {
    throw Object.assign(new Error('MOCK'), { code: 'SIN_BACKEND' });
  }
}
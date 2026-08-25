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
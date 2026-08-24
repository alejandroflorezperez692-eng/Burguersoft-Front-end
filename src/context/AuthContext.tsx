import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Usuario } from '../types/Usuario';
import {
  login as loginApi,
  logout as logoutApi,
  obtenerUsuarioActual,
} from '../api/auth';

interface AuthContextType {
  usuario: Usuario | null;
  cargando: boolean;
  login: (correo: string, contrasena: string) => Promise<Usuario>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setCargando(false);
      return;
    }

    obtenerUsuarioActual()
      .then(setUsuario)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setCargando(false));
  }, []);

  async function login(correo: string, contrasena: string): Promise<Usuario> {
    const { usuario, token } = await loginApi(correo, contrasena);
    localStorage.setItem('token', token);
    setUsuario(usuario);
    return usuario;
  }

  async function logout() {
    try {
      await logoutApi();
    } finally {
      localStorage.removeItem('token');
      setUsuario(null);
    }
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
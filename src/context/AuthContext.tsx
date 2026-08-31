
import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import apiClient from '../api/client';

export type User = {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
};

type UsuarioApi = {
  id_Usuario?: number; id?: number;
  nombre_usuario?: string; nombre?: string;
  apellido_usuario?: string; apellido?: string;
  correo_personal?: string; correo?: string; email?: string;
};
type LoginResponse = {
  token?: string;
  usuario?: UsuarioApi;
};

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    nombre: string,
    apellido: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export { AuthContext };

function readStoredUser(): User | null {
  const stored = localStorage.getItem('user');
  if (!stored) return null;
  try {
    return JSON.parse(stored) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const token = localStorage.getItem('token');
    return token ? readStoredUser() : null;
  });

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await apiClient.post<LoginResponse>('/login', {
      correo: email,
      contrasena: password,
    });

    if (!data.token) {
      throw new Error('El servidor no devolvió un token válido.');
    }

    const u = data.usuario;

    const nextUser: User = {
    id: u?.id_Usuario ?? u?.id,
    name: [u?.nombre_usuario ?? u?.nombre, u?.apellido_usuario ?? u?.apellido].filter(Boolean).join(' ') || undefined,
    email: u?.correo_personal ?? u?.correo ?? u?.email ?? email,
  };

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const register = useCallback(
    async (nombre: string, apellido: string, email: string, password: string) => {
      await apiClient.post('/registro', {
        nombre,
        apellido,
        email,
        password,
      });
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      login,
      register,
      logout,
    }),
    [user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

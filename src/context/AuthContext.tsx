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
  rol?: string; rol_id?: number;
};
type LoginResponse = {
  token?: string;
  usuario?: UsuarioApi;
  user?: UsuarioApi;
};

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  register: (
    nombre: string,
    apellido: string,
    email: string,
    password: string,
    tipoDocumento?: string,
    numeroDocumento?: string,
  ) => Promise<void>;
  logout: () => void;
  demoLogin: (role?: string) => void;
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

function mapUsuarioApi(u: UsuarioApi | undefined, fallbackEmail?: string): User {
  return {
    id: u?.id_Usuario ?? u?.id,
    name:
      [u?.nombre_usuario ?? u?.nombre, u?.apellido_usuario ?? u?.apellido]
        .filter(Boolean)
        .join(' ') || undefined,
    email: u?.correo_personal ?? u?.correo ?? u?.email ?? fallbackEmail,
    role: u?.rol,
  };
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

    const nextUser = mapUsuarioApi(data.usuario ?? data.user, email);

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  // Usado por el login social (Google/Facebook): ya tenemos el token
  // (viene en la URL tras el redirect de Laravel), así que solo hay que
  // guardarlo y pedir los datos del usuario a /me para completar la sesión.
  const loginWithToken = useCallback(async (token: string) => {
    localStorage.setItem('token', token);

    try {
      const { data } = await apiClient.get<UsuarioApi>('/me');
      const nextUser = mapUsuarioApi(data);
      localStorage.setItem('user', JSON.stringify(nextUser));
      setUser(nextUser);
    } catch (err) {
      localStorage.removeItem('token');
      throw err;
    }
  }, []);

  const register = useCallback(
    async (
      nombre: string,
      apellido: string,
      email: string,
      password: string,
      tipoDocumento?: string,
      numeroDocumento?: string,
    ) => {
      await apiClient.post('/registro', {
        nombre,
        apellido,
        email,
        password,
        tipo_documento: tipoDocumento,
        numero_documento: numeroDocumento,
      });
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const demoLogin = useCallback((role?: string) => {
    const esAdmin = role === 'admin';
    const demoUser: User = {
      id: 0,
      name: esAdmin ? 'Administrador Demo' : 'Cliente Demo',
      email: esAdmin ? 'admin@demo.com' : 'cliente@demo.com',
      role: esAdmin ? 'admin' : 'cliente',
    };
    localStorage.setItem('token', 'demo-token-sin-backend');
    localStorage.setItem('user', JSON.stringify(demoUser));
    setUser(demoUser);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      login,
      loginWithToken,
      register,
      logout,
      demoLogin,
    }),
    [user, login, loginWithToken, register, logout, demoLogin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
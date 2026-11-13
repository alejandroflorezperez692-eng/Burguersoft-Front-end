import {
  createContext,
  useCallback,
  useEffect,
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

type RolBackend = string | { id?: number; nombre?: string };
type UsuarioApi = {
  id_Usuario?: number; id?: number;
  nombre_usuario?: string; nombre?: string;
  apellido_usuario?: string; apellido?: string;
  correo_personal?: string; correo?: string; email?: string;
  rol?: RolBackend; rol_id?: number;
  estado?: string;
};
type LoginResponse = {
  token?: string;
  usuario?: UsuarioApi;
  user?: UsuarioApi;
};

const estadoEsInactivo = (estado?: string | null) =>
  String(estado ?? '').trim().toLowerCase() === 'inactivo';

const MSG_INACTIVO = 'Tu cuenta está inactiva. Contacta al administrador.';


async function verificarEstadoCuenta(id?: number, permitirUsuarios = false): Promise<void> {
  let idActual = id;
  let estado: string | undefined;

  try {
    const { data } = await apiClient.get<UsuarioApi>('/me');
    estado = data?.estado;
    idActual = idActual ?? data?.id_Usuario ?? data?.id;
  } catch {
   
  }

  if (!estado && permitirUsuarios) {
    try {
      const { data: lista } = await apiClient.get<UsuarioApi[]>('/usuarios');
      const crudo = Array.isArray(lista)
        ? lista
        : ((lista as { data?: unknown })?.data as UsuarioApi[]) ?? [];
      const actual = crudo.find(
        (x) => Number(x.id_Usuario ?? x.id) === Number(idActual),
      );
      estado = actual?.estado;
    } catch {
      
    }
  }

  if (estadoEsInactivo(estado)) throw new Error(MSG_INACTIVO);
}

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string, turnstileToken: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  register: (
    nombre: string,
    apellido: string,
    email: string,
    password: string,
    tipoDocumento?: string,
    numeroDocumento?: string,
    recaptchaToken?: string,
  ) => Promise<void>;
  logout: () => void;
  updateUser: (partial: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export { AuthContext };

function readStoredUser(): User | null {
  const stored = sessionStorage.getItem('user');
  if (!stored) return null;
  try {
    return JSON.parse(stored) as User;
  } catch {
    return null;
  }
}

function extraerRol(rol?: RolBackend): string | undefined {
  if (typeof rol === 'string') return rol;
  if (rol && typeof rol === 'object') return rol.nombre;
  return undefined;
}

function mapUsuarioApi(u: UsuarioApi | undefined, fallbackEmail?: string): User {
  return {
    id: u?.id_Usuario ?? u?.id,
    name:
      [u?.nombre_usuario ?? u?.nombre, u?.apellido_usuario ?? u?.apellido]
        .filter(Boolean)
        .join(' ') || undefined,
    email: u?.correo_personal ?? u?.correo ?? u?.email ?? fallbackEmail,
    role: extraerRol(u?.rol),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const token = sessionStorage.getItem('token');
    return token ? readStoredUser() : null;
  });
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    if (!sessionStorage.getItem('token')) return;
    let vivo = true;
    apiClient
      .get<UsuarioApi>('/me')
      .then(({ data }) => {
        if (vivo && estadoEsInactivo(data?.estado)) {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          setUser(null);
        }
      })
      .catch(() => {
     
      });
    return () => {
      vivo = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string, turnstileToken: string) => {
    setLoading(true);
    try {
      const { data } = await apiClient.post<LoginResponse>('/login', {
        correo: email,
        contrasena: password,
        turnstileToken,
      });
      if (!data.token) {
        throw new Error('El servidor no devolvió un token válido.');
      }

      const u = data.usuario ?? data.user;

      
      if (estadoEsInactivo(u?.estado)) {
        throw new Error(MSG_INACTIVO);
      }

      const nextUser: User = {
        id: u?.id_Usuario ?? u?.id,
        name: [u?.nombre_usuario ?? u?.nombre, u?.apellido_usuario ?? u?.apellido].filter(Boolean).join(' ') || undefined,
        email: u?.correo_personal ?? u?.correo ?? u?.email ?? email,
        role: extraerRol(u?.rol),
      };

      sessionStorage.setItem('token', data.token);
      try {
       
        await verificarEstadoCuenta(nextUser.id, !nextUser.role || nextUser.role !== 'cliente');
      } catch (e) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        throw e;
      }
      sessionStorage.setItem('user', JSON.stringify(nextUser));
      setUser(nextUser);
    } finally {
      setLoading(false);
    }
  }, []);

  
  const loginWithToken = useCallback(async (token: string) => {
    sessionStorage.setItem('token', token);

    try {
      const { data } = await apiClient.get<UsuarioApi>('/me');
      
      if (estadoEsInactivo(data?.estado)) {
        sessionStorage.removeItem('token');
        throw new Error(MSG_INACTIVO);
      }
      const nextUser = mapUsuarioApi(data);
      sessionStorage.setItem('user', JSON.stringify(nextUser));
      setUser(nextUser);
    } catch (err) {
      sessionStorage.removeItem('token');
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
      recaptchaToken?: string,
    ) => {
      await apiClient.post('/registro', {
        nombre,
        apellido,
        email,
        password,
        tipo_documento: tipoDocumento,
        numero_documento: numeroDocumento,
        recaptcha_token: recaptchaToken,
      });
    },
    [],
  );

  const logout = useCallback(() => {
    const token = sessionStorage.getItem('token');
    if (token && token !== 'demo-token-sin-backend') {
      apiClient.post('/logout').catch(() => {});
    }
    setLoading(true);
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
    setLoading(false);
  }, []);

  const updateUser = useCallback((partial: Partial<User>) => {
    setUser((prev) => {
      const next = { ...(prev ?? {}), ...partial };
      sessionStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      loading,
      login,
      loginWithToken,
      register,
      logout,
      updateUser,
    }),

    [user, loading, login, register, logout],

  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
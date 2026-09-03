import { useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import { useAuth } from '../hooks/useAuth';
import '../styles/social-login.css';

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: string }
      | undefined;
    return data?.message ?? data?.error ?? 'Credenciales incorrectas.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ocurrió un error inesperado.';
}

const SOCIAL_PROVIDERS = [
  {
    id: 'phone',
    label: 'Continuar con número de teléfono',
    url: '/api/auth/phone',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="currentColor"
          d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2Z"
        />
      </svg>
    ),
  },
  {
    id: 'google',
    label: 'Continuar con Google',
    url: 'http://127.0.0.1:8000/api/auth/google', 
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11C3.25 21.3 7.28 24 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.27a12 12 0 0 0 0 10.76l4-3.11Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.28 0 3.25 2.7 1.27 6.62l4 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
        />
      </svg>
    ),
  },
  {
    id: 'facebook',
    label: 'Continuar con Facebook',
    url: '/api/auth/facebook',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="#1877F2"
          d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07Z"
        />
      </svg>
    ),
  },
  {
    id: 'apple',
    label: 'Continuar con Apple',
    url: '/api/auth/apple',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="currentColor"
          d="M16.36 1.05c.1 1.06-.32 2.12-.94 2.87-.64.77-1.68 1.37-2.69 1.29-.12-1.02.36-2.1.98-2.83.68-.79 1.83-1.4 2.65-1.33Zm2.9 17.6c-.55 1.24-.81 1.8-1.5 2.9-.98 1.53-2.36 3.43-4.07 3.44-1.52.02-1.91-.99-3.97-.98-2.06.01-2.49 1-4.01.98-1.71-.02-3.02-1.74-4-3.27C-1.05 17.7-.4 11.36 2.45 8.98c1.32-1.11 2.76-1.72 4.12-1.72 1.48 0 2.41.98 3.64.98 1.19 0 1.9-.98 3.64-.98 1.19 0 2.45.64 3.65 1.76-3.21 1.76-2.69 6.34.76 8.63Z"
        />
      </svg>
    ),
  },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to={user?.role === 'Cliente' ? '/' : '/inicio'} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      const stored = localStorage.getItem('user');
      const rol = stored ? JSON.parse(stored).role : null;
      navigate(rol === 'Cliente' ? '/' : '/inicio', { replace: true, state: { toast: 'login_ok' } });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (url: string) => {
    window.location.href = url;
  };

  return (
    <AuthLayout>
      <div className="header-bar">INICIAR SESIÓN</div>
      <div className="card">
        <form onSubmit={handleSubmit} noValidate>
          <h2>CORREO*</h2>
          <input
            type="email"
            id="email"
            className="input"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <h2>CONTRASEÑA*</h2>
          <div className="campo-password">
            <input
              type={mostrarPassword ? 'text' : 'password'}
              id="password"
              className="input"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="boton-mostrar-password"
              onClick={() => setMostrarPassword((visible) => !visible)}
              aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              title={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            </button>
          </div>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primario" disabled={loading}>
            {loading ? 'INGRESANDO…' : 'INICIAR SESIÓN'}
          </button>

          <Link to="/recuperar-contrasena" className="link">
            ¿Recuperar tu contraseña?
          </Link>

          <div className="separador-contenedor">
            <div className="linea" />
            <span className="circulo">o continúa con</span>
            <div className="linea" />
          </div>

          <div className="botones-sociales">
            {SOCIAL_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                type="button"
                className={`btn-social ${provider.id === 'phone' ? 'btn-social-phone' : `btn-social-${provider.id}`}`}
                onClick={() => handleSocialLogin(provider.url)}
              >
                {provider.icon}
                <span>{provider.label}</span>
              </button>
            ))}
          </div>

          <div className="separador-contenedor">
            <div className="linea" />
            <span className="circulo">o</span>
            <div className="linea" />
          </div>

          <div className="enlace-externo">
            ¿No tienes una cuenta?
            <Link to="/registro">Crear cuenta</Link>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}

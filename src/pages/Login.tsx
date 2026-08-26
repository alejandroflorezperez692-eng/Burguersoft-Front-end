
import { useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import { useAuth } from '../hooks/useAuth';

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

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/inicio" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/inicio', { replace: true, state: { toast: 'login_ok' } });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="header-bar">INICIAR SESIÓN</div>
      <div className="card">
        <form onSubmit={handleSubmit} noValidate>
          <h2>CORREO</h2>
          <input
            type="email"
            id="email"
            className="input"
            placeholder="Correo electrónico (obligatorio)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <h2>CONTRASEÑA</h2>
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

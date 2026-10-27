import { useEffect, useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import { useAuth } from '../hooks/useAuth';
import AdminLoading from '../components/AdminLoading';
import { IconoToast, useToast } from '../components/Toast';
import '../styles/social-login.css';
import { rutaInicio } from '../utils/roles';


function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return 'No se pudo conectar con el servidor.';
    }
    const data = error.response.data;
    if (typeof data === 'string') {
      return `Error del servidor (${error.response.status}).`;
    }
    // Si el backend manda el detalle por campo, se muestran TODOS los errores indicando qué campo falla.
    const errores = (data as { errors?: Record<string, unknown> })?.errors;
    if (errores && typeof errores === 'object') {
      const etiquetas: Record<string, string> = { correo: 'correo electrónico', email: 'correo electrónico', contrasena: 'contraseña', password: 'contraseña' };
      const lista: string[] = [];
      Object.entries(errores).forEach(([campo, val]) => {
        const texto = Array.isArray(val) ? String(val[0] ?? '') : String(val ?? '');
        if (!texto) return;
        const etiqueta = etiquetas[campo] ?? campo;
        lista.push(/obligatori|required/i.test(texto) ? `El campo ${etiqueta} es obligatorio.` : texto);
      });
      const unicos = Array.from(new Set(lista));
      if (unicos.length > 0) return unicos.join(' ');
    }
    const msg = (data as Record<string, unknown>)?.message ?? (data as Record<string, unknown>)?.error;
    if (typeof msg === 'string') return msg;
    return `Error inesperado (${error.response.status}).`;
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

  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const tipoToast = (location.state as { toast?: string } | null)?.toast ?? '';


  // Aviso flotante (estilo toast) en el login: contraseña cambiada o sesión cerrada
  const MENSAJE_AVISO: Record<string, string> = {
    password_ok: 'Contraseña cambiada correctamente. Inicia sesión con tu nueva contraseña.',
    logout_ok: 'Has cerrado sesión correctamente.',
  };
  const [aviso, setAviso] = useState<string | null>(MENSAJE_AVISO[tipoToast] ?? null);
  useEffect(() => {
    if (!tipoToast) return;
    setAviso(MENSAJE_AVISO[tipoToast] ?? null);
    const t = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoToast]);

  if (isAuthenticated) {
    return <Navigate to={rutaInicio(user?.role)} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      const stored = sessionStorage.getItem('user');
      const rol = stored ? JSON.parse(stored).role : null;
      navigate(rutaInicio(rol), { replace: true, state: { toast: 'login_ok' } });
    } catch (err) {
      showToast(getErrorMessage(err), true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <AdminLoading texto="Iniciando sesión" subtexto="Verificando tus credenciales" />;
  }
  const handleGoogleLogin = () => {
    window.location.href = 'http://127.0.0.1:8000/api/auth/google';
  };


  return (
    <AuthLayout regresarA="/">
      {aviso && (
        <div
          role="status"
          style={{
            position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#1e3b1e', color: '#7ddc82', border: '2.5px solid #2e7d32',
            padding: '16px 26px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            zIndex: 99999, maxWidth: '90%', textAlign: 'center',
            boxShadow: '0 8px 20px rgba(0,0,0,.25)',
          }}
        >
          <IconoToast tipo="exito" />
          <span>{aviso}</span>
        </div>
      )}
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
              {mostrarPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>



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
            <button
              type="button"
              className="btn-social btn-social-google"
              onClick={handleGoogleLogin}
            >
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
              <span>Continuar con Google</span>
            </button>
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
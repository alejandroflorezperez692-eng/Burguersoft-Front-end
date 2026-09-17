import { useEffect, useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import apiClient from '../api/client';
import iconoBloqueo from '../assets/img/bloquear.png';

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return 'No se pudo conectar con el servidor.';
    const data = error.response?.data as { message?: string; segundos?: number } | undefined;
    return data?.message ?? `Error inesperado (${error.response.status}).`;
  }
  return 'Ocurrió un error inesperado.';
}

function segundosRestantesBloqueo(): number {
  const hasta = Number(sessionStorage.getItem('bloqueo_correo_hasta') ?? '0');
  if (!hasta) return 0;
  return Math.max(0, Math.ceil((hasta - Date.now()) / 1000));
}

export default function RecuperarContrasena() {
  const [correo, setCorreo] = useState(() => sessionStorage.getItem('correo_recuperacion') ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bloqueo, setBloqueo] = useState(() => segundosRestantesBloqueo());
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const castigado = searchParams.get('castigo') === '1';

  useEffect(() => {
    setBloqueo(segundosRestantesBloqueo());
  }, [castigado]);

  useEffect(() => {
    if (bloqueo <= 0) return;
    const t = setInterval(() => {
      const rest = segundosRestantesBloqueo();
      setBloqueo(rest);
      if (rest <= 0) {
        sessionStorage.removeItem('bloqueo_correo_hasta');
        clearInterval(t);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [bloqueo]);

  const bloqueado = bloqueo > 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (bloqueado) return;
    const emailLimpio = correo.trim().toLowerCase();
    if (!emailLimpio) {
      setError('Por favor ingresa un correo válido.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/recuperar-contrasena', { email: emailLimpio, correo: emailLimpio });
      sessionStorage.setItem('correo_recuperacion', emailLimpio);
      // Pasa directo sin mensaje intermedio.
      navigate('/verificar-codigo');
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 429) {
        const data = err.response.data as { segundos?: number } | undefined;
        const seg = data?.segundos ?? 60;
        sessionStorage.setItem('bloqueo_correo_hasta', String(Date.now() + seg * 1000));
        setBloqueo(seg);
      }
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout regresarA="/login">
      <div className="header-bar">¿TIENES PROBLEMAS?</div>
      <div className="card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="icono-card">
            <img src={iconoBloqueo} alt="Imagen Bloqueo" />
          </div>
          <p className="descripcion descripcion-recuperacion">
            Ingresa tu correo electrónico registrado para recibir el código de recuperación.
          </p>
          {castigado && bloqueado && (
            <p className="error-bloqueo" role="alert">
              Pusiste 3 veces el código mal. Espera <span>{bloqueo}</span> segundo(s) para pedir otro.
            </p>
          )}
          <input
            id="rec-email"
            type="email"
            className="input"
            placeholder="Correo electrónico (obligatorio)"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            disabled={bloqueado}
          />
          {error && (
            <p className={bloqueado ? 'error-bloqueo' : 'auth-error'} role="alert">
              {bloqueado ? (
                <>
                  Debes esperar <span>{bloqueo}</span> segundo(s) antes de intentarlo de nuevo.
                </>
              ) : (
                error
              )}
            </p>
          )}
          <button type="submit" className="btn-primario" disabled={loading || bloqueado}>
            {bloqueado ? `ESPERA ${bloqueo}s` : loading ? 'ENVIANDO…' : 'Enviar código de recuperación'}
          </button>
          <p className="descripcion-recuperacion">¿No puedes cambiar la contraseña?</p>
          <div className="separador-contenedor">
            <div className="linea" />
            <span className="circulo">Entonces...</span>
            <div className="linea" />
          </div>
          <Link to="/registro" className="btn-secundario">
            Crear cuenta nueva
          </Link>
        </form>
      </div>
    </AuthLayout>
  );
}

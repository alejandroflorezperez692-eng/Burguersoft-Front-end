import { useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import apiClient from '../api/client';
import iconoBloqueo from '../assets/img/bloquear.png';

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: string }
      | undefined;
    return data?.message ?? data?.error ?? 'No fue posible enviar el código.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ocurrió un error inesperado.';
}

export default function RecuperarContrasena() {
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiClient.post('/recuperar-contrasena', { email: correo });
      setEnviado(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="header-bar">¿TIENES PROBLEMAS?</div>

      <div className="card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="icono-card">
            <img src={iconoBloqueo} alt="Imagen Bloqueo" />
          </div>

          <p className="descripcion">
            Ingresa tu correo electrónico registrado para recibir el código de
            recuperación.
          </p>

          <input
            id="rec-email"
            type="email"
            className="input"
            placeholder="Correo electrónico (obligatorio)"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
          />

          {enviado && (
            <p className="descripcion" role="status">
              Si el correo está registrado, recibirás el código en unos minutos.
            </p>
          )}

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primario" disabled={loading}>
            {loading ? 'ENVIANDO…' : 'Enviar código de recuperación'}
          </button>

          <p style={{ color: '#2c1810' }}>¿No puedes cambiar la contraseña?</p>

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

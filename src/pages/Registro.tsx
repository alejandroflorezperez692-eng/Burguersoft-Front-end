import { useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import { useAuth } from '../hooks/useAuth';

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: string }
      | undefined;
    return data?.message ?? data?.error ?? 'No fue posible completar el registro.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ocurrió un error inesperado.';
}

export default function Registro() {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      await register(nombre, apellido, correo, password);
      navigate('/login', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form id="registroForm" onSubmit={handleSubmit} noValidate>
        <div className="contenedor-registro">
          <div className="encabezado">
            <h2>CREAR UNA CUENTA</h2>
            <p>Crea tu cuenta en el Sistema.</p>
          </div>

          <p className="descripcion-registro">
            Llena cada uno de los siguientes campos para tu Registro
          </p>

          <div className="fila">
            <div className="campo">
              <label htmlFor="nombre">Nombre</label>
              <input
                type="text"
                id="nombre"
                placeholder="Digite su nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
            <div className="campo">
              <label htmlFor="apellido">Apellido</label>
              <input
                type="text"
                id="apellido"
                placeholder="Digite su apellido"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="fila">
            <div className="campo">
              <label htmlFor="correo">Correo</label>
              <input
                type="email"
                id="correo"
                placeholder="Digite su correo (@gmail.com)"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="fila">
            <div className="campo">
              <label htmlFor="password">Contraseña</label>
              <input
                type="password"
                id="password"
                placeholder="Digite una contraseña segura"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="campo">
              <label htmlFor="confirmPassword">Confirmar Contraseña</label>
              <input
                type="password"
                id="confirmPassword"
                placeholder="Confirme su contraseña segura"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <p className="auth-error" role="alert" style={{ marginTop: '20px' }}>
              {error}
            </p>
          )}

          <button type="submit" className="boton-registro" disabled={loading}>
            {loading ? 'REGISTRANDO…' : 'Registrarse'}
          </button>
        </div>
      </form>

      <div className="enlace-externo">
        ¿Ya tienes una cuenta?
        <Link to="/login">Inicio sesión</Link>
      </div>
    </AuthLayout>
  );
}

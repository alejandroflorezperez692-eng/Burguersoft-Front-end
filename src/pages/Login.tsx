import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';

// Mensajes de aviso equivalentes a $avisos_login en el PHP original
const AVISOS_LOGIN: Record<string, string> = {
  promo: 'Debes iniciar sesión para comprar una promoción.',
  producto: 'Debes iniciar sesión para comprar un producto.',
};

export default function Login() {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const toastRef = useRef<HTMLDivElement>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Muestra el toast si venimos con ?aviso=promo o ?aviso=producto,
  // igual que hacía el PHP con $mensaje_aviso
  useEffect(() => {
    const aviso = searchParams.get('aviso');
    if (aviso && AVISOS_LOGIN[aviso]) {
      mostrarToastBienvenida(AVISOS_LOGIN[aviso]);
    }
  }, [searchParams]);

  function mostrarToastBienvenida(mensaje: string) {
    const toast = toastRef.current;
    if (!toast) return;
    toast.textContent = mensaje;
    toast.classList.add('mostrar');
    setTimeout(() => toast.classList.remove('mostrar'), 3500);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!correo || !contrasena) {
      setError('Por favor completa todos los campos.');
      return;
    }

    setCargando(true);
    try {
      const usuario = await login(correo, contrasena);
      mostrarToastBienvenida(`¡Bienvenido, ${usuario.nombre}!`);

      // Redirección según rol, igual que hacía login.php
      if (usuario.rol?.nombre === 'Administrador') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      // El backend responde con distintos mensajes (credenciales inválidas,
      // usuario inactivo, bloqueo por intentos) — se los mostramos tal cual.
      const mensaje = err.response?.data?.message || 'Correo o contraseña incorrectos.';
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <div className="navbar">
        <img src="/estilos/img/icono1-oscuro.png" className="logo" alt="Logo" />
        <Link to="/" className="btn-regresar">Regresar</Link>
      </div>

      <div className="contenedor-login">
        <div className="header-bar">INICIAR SESIÓN</div>
        <div className="card">
          {error && <p className="error-normal">{error}</p>}

          <form id="loginForm" onSubmit={handleSubmit}>
            <h2>CORREO*</h2>
            <input
              type="email"
              id="email"
              className="input"
              placeholder="ejemplo@gmail.com"
              required
              autoComplete="off"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
            />

            <h2>CONTRASEÑA*</h2>
            <div className="input-password-wrapper">
              <input
                type={mostrarPassword ? 'text' : 'password'}
                id="password"
                className="input"
                placeholder="Ingresa tu contraseña"
                required
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
              />
              <button
                type="button"
                id="btnToggle"
                className="btn-toggle-password"
                onClick={() => setMostrarPassword((v) => !v)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#E8821A',
                }}
              >
                {mostrarPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            <button type="submit" id="botonEntrar" className="btn-primario" disabled={cargando}>
              {cargando ? 'INGRESANDO...' : 'INICIAR SESIÓN'}
            </button>

            <Link to="/recuperar-contrasena" className="link">¿Recuperar tu contraseña?</Link>

            <div className="separador-contenedor">
              <div className="linea" />
              <span className="circulo">o</span>
              <div className="linea" />
            </div>

            <div className="enlace-externo">
              ¿No tienes una cuenta?{' '}
              <Link to="/registro">Crear cuenta</Link>
            </div>
          </form>
        </div>
      </div>

      <div className="toast-bienvenida" ref={toastRef} />

      <Footer />
    </>
  );
}
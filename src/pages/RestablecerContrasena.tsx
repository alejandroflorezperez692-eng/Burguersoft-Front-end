import { useEffect, useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import apiClient from '../api/client';
import iconoBloqueo from '../assets/img/bloquear.png';

function Ojo({ abierto }: { abierto: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="2.5" />
      {!abierto && <line x1="4" y1="20" x2="20" y2="4" />}
    </svg>
  );
}

export default function RestablecerContrasena() {
  const navigate = useNavigate();
  const correo = sessionStorage.getItem('correo_recuperacion') ?? '';
  const codigo = sessionStorage.getItem('codigo_verificado') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!correo || !codigo) navigate('/recuperar-contrasena', { replace: true });
  }, [correo, codigo, navigate]);

  const reqs = [
    { id: 'longitud', texto: 'Mínimo 8 caracteres', ok: password.length >= 8 },
    { id: 'mayuscula', texto: 'Al menos una mayúscula', ok: /[A-Z]/.test(password) },
    { id: 'numero', texto: 'Al menos un número', ok: /\d/.test(password) },
    { id: 'especial', texto: 'Al menos un símbolo (@, #, $, etc.)', ok: /[^A-Za-z0-9\s]/.test(password) },
  ];
  const cumplidos = reqs.filter((r) => r.ok).length;
  const claseBarra = cumplidos === 4 ? 'verde' : cumplidos >= 2 ? 'amarillo' : 'rojo';
  const coinciden = confirm.length > 0 && password === confirm;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (cumplidos < 4) {
      setError('Por favor, cumple con todos los requisitos de seguridad.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/restablecer-contrasena', {
        email: correo,
        correo,
        codigo,
        password,
        password_confirmation: confirm,
      });
      sessionStorage.removeItem('correo_recuperacion');
      sessionStorage.removeItem('codigo_verificado');
      // Redirige al login apenas cambia, con aviso de éxito.
      navigate('/login', { replace: true, state: { toast: 'password_ok' } });
    } catch (err) {
      if (isAxiosError(err)) {
        const data = err.response?.data as { message?: string } | undefined;
        setError(data?.message ?? 'No se pudo cambiar la contraseña.');
      } else {
        setError('No se pudo cambiar la contraseña.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout regresarA="/recuperar-contrasena">
      <div className="header-bar">NUEVA CONTRASEÑA</div>
      <div className="card">
        <div className="icono-card">
          <img src={iconoBloqueo} alt="Candado" />
        </div>
        <p className="descripcion">Ingresa y confirma tu nueva contraseña.</p>
        <form onSubmit={handleSubmit} noValidate>
          <h2>NUEVA CONTRASEÑA*</h2>
          <div className="campo-password">
            <input
              type={show1 ? 'text' : 'password'}
              id="password"
              className="input"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="boton-mostrar-password"
              onClick={() => setShow1((v) => !v)}
              aria-label={show1 ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              title={show1 ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <Ojo abierto={show1} />
            </button>
          </div>

          <div className={`barra-contrasena ${claseBarra}`} role="progressbar" aria-valuemin={0} aria-valuemax={4} aria-valuenow={cumplidos}>
            <span className="barra-contrasena-fill" style={{ width: `${(cumplidos / 4) * 100}%` }} />
          </div>
          <ul className="requisitos">
            {reqs.map((r) => (
              <li key={r.id} className={`requisito${r.ok ? ' cumple' : ''}`}>
                <span aria-hidden="true">{r.ok ? '✅' : '❌'}</span>
                {r.texto}
              </li>
            ))}
          </ul>

          <h2 style={{ marginTop: 18 }}>CONFIRMAR CONTRASEÑA*</h2>
          <div className="campo-password">
            <input
              type={show2 ? 'text' : 'password'}
              id="confirmar-password"
              className="input"
              placeholder="Repite tu contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              style={confirm ? { borderColor: coinciden ? '#1e8e3e' : '#c8382a' } : undefined}
            />
            <button
              type="button"
              className="boton-mostrar-password"
              onClick={() => setShow2((v) => !v)}
              aria-label={show2 ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              title={show2 ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <Ojo abierto={show2} />
            </button>
          </div>
          {confirm && (
            <p className="descripcion" style={{ color: coinciden ? '#1e8e3e' : '#c8382a', fontWeight: 700, marginBottom: 12 }}>
              {coinciden ? '✅ Las contraseñas coinciden' : '❌ Las contraseñas no coinciden'}
            </p>
          )}

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primario" disabled={loading}>
            {loading ? 'GUARDANDO…' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}

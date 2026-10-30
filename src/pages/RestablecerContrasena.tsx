import { useEffect, useRef, useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import apiClient from '../api/client';
import { useToast } from '../components/Toast';
import { useAuth } from '../hooks/useAuth';
import iconoBloqueo from '../assets/img/bloquear.png';

export default function RestablecerContrasena() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { logout } = useAuth();
  const correo = sessionStorage.getItem('correo_recuperacion') ?? '';
  const codigo = sessionStorage.getItem('codigo_verificado') ?? '';
  const cambioCompletado = useRef(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cambioCompletado.current && (!correo || !codigo)) {
      navigate('/recuperar-contrasena', { replace: true });
    }
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
    if (cumplidos < 4) {
      showToast('Por favor, cumple con todos los requisitos de seguridad.', true);
      return;
    }
    if (password !== confirm) {
      showToast('Las contraseñas no coinciden.', true);
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
      cambioCompletado.current = true;
      sessionStorage.removeItem('correo_recuperacion');
      sessionStorage.removeItem('codigo_verificado');
      sessionStorage.setItem('login_toast', 'password_ok');
      logout();
      window.location.replace('/login');
    } catch (err) {
      if (isAxiosError(err)) {
        const data = err.response?.data as { message?: string } | undefined;
        showToast(data?.message ?? 'No se pudo cambiar la contraseña.', true);
      } else {
        showToast('No se pudo cambiar la contraseña.', true);
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
          <h2>NUEVA CONTRASEÑA<span className="required-marker">*</span></h2>
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
              {show1 ? 'Ocultar' : 'Mostrar'}
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

          <h2 style={{ marginTop: 18 }}>CONFIRMAR CONTRASEÑA<span className="required-marker">*</span></h2>
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
              {show2 ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {confirm && (
            <p className="descripcion" style={{ color: coinciden ? '#1e8e3e' : '#c8382a', fontWeight: 700, marginBottom: 12 }}>
              {coinciden ? '✅ Las contraseñas coinciden' : '❌ Las contraseñas no coinciden'}
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

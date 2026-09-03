import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function SocialCallback() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const yaProcesado = useRef(false);

  useEffect(() => {
    if (yaProcesado.current) return;
    yaProcesado.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    loginWithToken(token)
      .then(() => {
        const stored = localStorage.getItem('user');
        const rol = stored ? JSON.parse(stored).role : null;
        navigate(rol === 'Cliente' ? '/' : '/inicio', {
          replace: true,
          state: { toast: 'login_ok' },
        });
      })
      .catch(() => {
        navigate('/login', { replace: true });
      });
  }, [loginWithToken, navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Iniciando sesión…</p>
    </div>
  );
}
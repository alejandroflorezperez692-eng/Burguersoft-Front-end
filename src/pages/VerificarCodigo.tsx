import { useEffect, useRef, useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import apiClient from '../api/client';
import iconoBloqueo from '../assets/img/bloquear.png';

export default function VerificarCodigo() {
  const navigate = useNavigate();
  const correo = sessionStorage.getItem('correo_recuperacion') ?? '';
  const [digitos, setDigitos] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [bloqueado, setBloqueado] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [loading, setLoading] = useState(false);
  const [agitar, setAgitar] = useState(false);
  const [exito, setExito] = useState(false);
  const [fallos, setFallos] = useState(() => {
    const g = Number(sessionStorage.getItem(`fallos_${correo}`) ?? '0');
    return Number.isFinite(g) ? g : 0;
  });
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const expulsarAlCorreo = () => {
    const hasta = Date.now() + 60 * 1000;
    sessionStorage.setItem('bloqueo_correo_hasta', String(hasta));
    sessionStorage.setItem(`fallos_${correo}`, '0');
    sessionStorage.removeItem('codigo_verificado');
    navigate('/recuperar-contrasena?castigo=1', { replace: true });
  };

  const dispararAgitado = () => {
    // Reinicia la animación aunque ya esté activa
    setAgitar(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setAgitar(true));
    });
    setTimeout(() => setAgitar(false), 500);
  };

  const fallarConAnimacion = (mensaje: string) => {
    setError(mensaje);
    dispararAgitado();
    // Limpia los slots y enfoca el primero para reintentar
    setTimeout(() => {
      setDigitos(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    }, 450);
  };

  useEffect(() => {
    if (!correo) navigate('/recuperar-contrasena', { replace: true });
  }, [correo, navigate]);

  useEffect(() => {
    if (segundos <= 0) {
      setBloqueado(false);
      return;
    }
    setBloqueado(true);
    const t = setInterval(() => {
      setSegundos((s) => {
        if (s <= 1) {
          clearInterval(t);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [segundos]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const setDigito = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1);
    setDigitos((prev) => {
      const next = [...prev];
      next[i] = d;
      return next;
    });
    if (d && i < 5) inputsRef.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pegado = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pegado) return;
    setDigitos(() => {
      const next = ['', '', '', '', '', ''];
      pegado.split('').forEach((c, idx) => {
        if (idx < 6) next[idx] = c;
      });
      return next;
    });
    inputsRef.current[Math.min(pegado.length, 5)]?.focus();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (exito || loading) return;
    setError('');
    const codigo = digitos.join('');
    if (codigo.length !== 6) {
      setError('Ingresa los 6 dígitos del código.');
      dispararAgitado();
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/verificar-codigo', { email: correo, correo, codigo });
      sessionStorage.setItem('codigo_verificado', codigo);
      sessionStorage.setItem(`fallos_${correo}`, '0');
      setExito(true);
      setError('');
      // replace:true para que el botón Atrás del navegador no vuelva al código
      // después de verificar (igual que el botón REGRESAR).
      setTimeout(() => navigate('/restablecer-contrasena', { replace: true }), 1400);
    } catch (err) {
      if (isAxiosError(err)) {
        const data = err.response?.data as { message?: string; segundos?: number; expulsar?: boolean } | undefined;
        // Backend pide expulsar (3er fallo) → al correo + 1 min fijo.
        if (err.response?.status === 429) {
          expulsarAlCorreo();
          return;
        }
        const nuevosFallos = fallos + 1;
        setFallos(nuevosFallos);
        sessionStorage.setItem(`fallos_${correo}`, String(nuevosFallos));
        if (nuevosFallos >= 3) {
          expulsarAlCorreo();
          return;
        }
        fallarConAnimacion(data?.message ?? 'Código incorrecto o expirado.');
      } else {
        fallarConAnimacion('Código incorrecto o expirado.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout regresarA="/recuperar-contrasena">
      <div className="header-bar">INGRESA TU CÓDIGO</div>
      <div className="card">
        <div className="icono-card">
          <img src={iconoBloqueo} alt="Candado" />
        </div>
        <p className="descripcion">
          Te enviamos un código de 6 dígitos a<br />
          <strong>{correo}</strong>
        </p>
        {error && (
          <p className={bloqueado ? 'error-bloqueo' : 'auth-error'} role="alert">
            {bloqueado ? (
              <>
                Demasiados intentos fallidos. Espera <span>{segundos}</span> segundo(s).
              </>
            ) : (
              error
            )}
          </p>
        )}
        <div className={`otp-sello${loading ? ' otp-sello--visible' : ''}${exito ? ' otp-sello--verificado' : ''}`} aria-hidden={!loading && !exito}>
          {exito ? (
            <svg className="otp-check" viewBox="0 0 36 36">
              <circle className="otp-check__aro" cx="18" cy="18" r="15" />
              <path className="otp-check__marca" d="M11 18.5l5 5 9-11" />
            </svg>
          ) : (
            loading && <span className="otp-spinner" />
          )}
        </div>
        <form onSubmit={handleSubmit} className="otp-paso">
          <div className={`otp-slots${agitar ? ' otp-slots--agitar' : ''}`} onPaste={handlePaste}>
            {digitos.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                autoComplete="off"
                required
                disabled={bloqueado || loading || exito}
                value={d}
                className={`otp-slot${d ? ' otp-slot--lleno' : ''}${exito ? ' otp-slot--ok' : ''}`}
                onChange={(e) => setDigito(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !digitos[i] && i > 0) inputsRef.current[i - 1]?.focus();
                }}
              />
            ))}
          </div>
          <p className={`otp-estado${exito ? ' otp-estado--ok' : ''}`} role="status">
            {exito ? '¡Código correcto! Redirigiendo…' : loading ? 'Verificando…' : ''}
          </p>
          <button
            type="submit"
            className="btn-primario"
            disabled={bloqueado || loading || exito}
            style={bloqueado ? { opacity: 0.5 } : undefined}
          >
            {exito ? '¡VERIFICADO!' : loading ? 'VERIFICANDO…' : 'VERIFICAR CÓDIGO'}
          </button>
        </form>
        <p className="enlace-externo" style={{ marginTop: 16, fontSize: 14 }}>
          ¿No recibiste el código? <Link to="/recuperar-contrasena">Enviar de nuevo</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

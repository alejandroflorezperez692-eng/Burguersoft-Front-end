import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { isAxiosError } from 'axios';
import { enviarCodigoRegistro, verificarCodigoRegistro } from '../api/auth';

type Props = {
  correo: string;
  onClose: () => void;
  onVerified: (codigo: string) => void;
};

const MAX_INTENTOS = 3;
const SEGUNDOS_REENVIO = 60;

function generarCodigoMock(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function claveMock(correo: string): string {
  return `mock_registro_${correo.trim().toLowerCase()}`;
}

export default function ModalVerificarCorreo({ correo, onClose, onVerified }: Props) {
  const [digitos, setDigitos] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [modoMock, setModoMock] = useState(false);
  const [codigoMockVisible, setCodigoMockVisible] = useState<string | null>(null);
  const [loadingEnviar, setLoadingEnviar] = useState(false);
  const [loadingVerificar, setLoadingVerificar] = useState(false);
  const [intentosRestantes, setIntentosRestantes] = useState(MAX_INTENTOS);
  const [bloqueado, setBloqueado] = useState(false);
  const [segundosReenvio, setSegundosReenvio] = useState(0);
  const [agitar, setAgitar] = useState(false);
  const [exito, setExito] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const emailLimpio = correo.trim().toLowerCase();

  // Cooldown para reenviar
  useEffect(() => {
    if (segundosReenvio <= 0) return;
    const t = setInterval(() => {
      setSegundosReenvio((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [segundosReenvio]);

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loadingVerificar && !exito) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, loadingVerificar, exito]);

  // Foco inicial
  useEffect(() => {
    const t = setTimeout(() => inputsRef.current[0]?.focus(), 150);
    return () => clearTimeout(t);
  }, [codigoEnviado]);

  const dispararAgitado = () => {
    setAgitar(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setAgitar(true));
    });
    setTimeout(() => setAgitar(false), 500);
  };

  const fallarIntento = useCallback(
    (mensaje: string) => {
      const restantes = intentosRestantes - 1;
      setIntentosRestantes(restantes);
      if (restantes <= 0) {
        setBloqueado(true);
        setError('Agotaste tus 3 intentos. Pide un nuevo código con "Reenviar código".');
      } else {
        setError(`${mensaje} Te quedan ${restantes} intento(s).`);
      }
      dispararAgitado();
      setTimeout(() => {
        setDigitos(['', '', '', '', '', '']);
        inputsRef.current[0]?.focus();
      }, 450);
    },
    [intentosRestantes],
  );

  const activarMock = useCallback(
    (motivo: string) => {
      const codigo = generarCodigoMock();
      sessionStorage.setItem(claveMock(emailLimpio), codigo);
      setModoMock(true);
      setCodigoMockVisible(codigo);
      setCodigoEnviado(true);
      setIntentosRestantes(MAX_INTENTOS);
      setBloqueado(false);
      setSegundosReenvio(30);
      setError(null);
      // eslint-disable-next-line no-console
      console.log(`[Registro mock] Código para ${emailLimpio}: ${codigo}. ${motivo}`);
      setInfo(
        'No se pudo contactar el servicio de correo del backend, así que generamos un código de prueba.',
      );
    },
    [emailLimpio],
  );

  const handleEnviar = useCallback(async () => {
    if (loadingEnviar) return;
    setLoadingEnviar(true);
    setError(null);
    try {
      await enviarCodigoRegistro(emailLimpio);
      setModoMock(false);
      setCodigoMockVisible(null);
      setCodigoEnviado(true);
      setIntentosRestantes(MAX_INTENTOS);
      setBloqueado(false);
      setDigitos(['', '', '', '', '', '']);
      setSegundosReenvio(SEGUNDOS_REENVIO);
      setInfo(`Enviamos un código de 6 dígitos a ${emailLimpio}. Revísalo e ingrésalo abajo.`);
    } catch (err) {
      if ((err as { code?: string })?.code === 'SIN_BACKEND') {
        activarMock('Backend sin endpoints de registro.');
        return;
      }
      if (isAxiosError(err) && !err.response) {
        // Sin conexión al backend (ej. Laravel apagado): modo prueba para poder rectificar.
        activarMock('Sin conexión al backend.');
        return;
      }
      if (isAxiosError(err) && err.response?.status === 429) {
        const data = err.response.data as { segundos?: number; message?: string } | undefined;
        const seg = data?.segundos ?? SEGUNDOS_REENVIO;
        setSegundosReenvio(seg);
        setError(data?.message ?? `Debes esperar ${seg}s antes de pedir otro código.`);
        return;
      }
      const data = isAxiosError(err)
        ? (err.response?.data as { message?: string; error?: string } | undefined)
        : undefined;
      setError(data?.message ?? data?.error ?? 'No fue posible enviar el código. Intenta de nuevo.');
    } finally {
      setLoadingEnviar(false);
    }
  }, [loadingEnviar, emailLimpio, activarMock]);

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

  const handleVerificar = async () => {
    if (loadingVerificar || exito) return;
    setError(null);
    if (!codigoEnviado) {
      setError('Primero presiona "Enviar código".');
      return;
    }
    if (bloqueado) {
      setError('Cuenta bloqueada por 3 intentos fallidos. Presiona "Reenviar código" para desbloquear.');
      return;
    }
    const codigo = digitos.join('');
    if (codigo.length !== 6) {
      setError('Ingresa los 6 dígitos del código.');
      dispararAgitado();
      return;
    }
    setLoadingVerificar(true);
    try {
      if (modoMock) {
        const esperado = sessionStorage.getItem(claveMock(emailLimpio));
        // Pequeña espera para simular red
        await new Promise((r) => setTimeout(r, 500));
        if (esperado && codigo === esperado) {
          sessionStorage.removeItem(claveMock(emailLimpio));
          setExito(true);
          setError(null);
          setTimeout(() => onVerified(codigo), 900);
        } else {
          fallarIntento('Código incorrecto.');
        }
        return;
      }
      await verificarCodigoRegistro(emailLimpio, codigo);
      setExito(true);
      setError(null);
      setTimeout(() => onVerified(codigo), 900);
    } catch (err) {
      if ((err as { code?: string })?.code === 'SIN_BACKEND') {
        activarMock('Backend sin verificación; usando código de prueba.');
        return;
      }
      if (isAxiosError(err) && !err.response && modoMock === false) {
        // Si se cayó la red a mitad del flujo, cae al mock si hay uno guardado
        const esperado = sessionStorage.getItem(claveMock(emailLimpio));
        if (esperado) {
          setModoMock(true);
          setCodigoMockVisible(esperado);
          if (codigo === esperado) {
            setExito(true);
            setTimeout(() => onVerified(codigo), 900);
          } else {
            fallarIntento('Código incorrecto.');
          }
          return;
        }
      }
      if (isAxiosError(err) && err.response?.status === 429) {
        setBloqueado(true);
        setIntentosRestantes(0);
        const data = err.response.data as { message?: string } | undefined;
        setError(data?.message ?? 'Demasiados intentos. Pide un nuevo código.');
        return;
      }
      const data = isAxiosError(err)
        ? (err.response?.data as { message?: string; error?: string } | undefined)
        : undefined;
      fallarIntento(data?.message ?? data?.error ?? 'Código incorrecto o expirado.');
    } finally {
      setLoadingVerificar(false);
    }
  };

  const puedeReenviar = segundosReenvio <= 0 && !loadingEnviar && !exito;

  return (
    <>
      {createPortal(
        <>
          {error ? (
            <div
              className={bloqueado ? 'error-bloqueo' : 'auth-error'}
              role="alert"
              style={{
                position: 'fixed',
                top: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 2147483647,
                maxWidth: 520,
                width: 'calc(100% - 24px)',
                textAlign: 'center',
                margin: 0,
                boxShadow: '0 10px 30px rgba(0,0,0,.25)',
              }}
            >
              {error}
            </div>
          ) : null}
          {info ? (
            <div
              className="verify-info"
              role="status"
              style={{
                position: 'fixed',
                top: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 2147483647,
                maxWidth: 520,
                width: 'calc(100% - 24px)',
                textAlign: 'center',
                margin: 0,
                boxShadow: '0 10px 30px rgba(0,0,0,.25)',
              }}
            >
              {info}
            </div>
          ) : null}
        </>,
        document.body
      )}
      <div
        className="verify-modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Verificar correo electrónico"
        onClick={() => {
          if (!loadingVerificar && !exito) onClose();
        }}
      >
        <div className="verify-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="verify-modal-close"
          onClick={onClose}
          disabled={loadingVerificar || exito}
          aria-label="Cerrar verificación"
        >
          ✕
        </button>

        <h2>VERIFICA TU CORREO</h2>
        <p className="verify-modal-desc">
          Para crear tu cuenta debemos confirmar que este correo es tuyo:
          <br />
          <strong>{emailLimpio}</strong>
        </p>

        <button
          type="button"
          className="btn-secundario verify-btn-enviar"
          onClick={handleEnviar}
          disabled={loadingEnviar || loadingVerificar || exito || segundosReenvio > 0}
        >
          {loadingEnviar
            ? 'ENVIANDO…'
            : segundosReenvio > 0 && !codigoEnviado
              ? `Podrás reintentar en ${segundosReenvio}s`
              : 'Enviar código'}
        </button>

        {modoMock && codigoMockVisible && (
          <p className="verify-mock" role="status">
            Modo prueba — tu código es: <strong>{codigoMockVisible}</strong>
          </p>
        )}
        {!codigoEnviado && !loadingEnviar && (
          <p className="otp-estado" role="status">
            Presiona «Enviar código» para recibir el código en tu correo.
          </p>
        )}

        <label htmlFor="verify-codigo-0" className="verify-label">
          Ingresa el código de 6 dígitos
        </label>
        <div className={`otp-slots${agitar ? ' otp-slots--agitar' : ''}`} onPaste={handlePaste}>
          {digitos.map((d, i) => (
            <input
              key={i}
              id={i === 0 ? 'verify-codigo-0' : undefined}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              autoComplete="off"
              disabled={bloqueado || loadingVerificar || exito || !codigoEnviado}
              value={d}
              className={`otp-slot${d ? ' otp-slot--lleno' : ''}${exito ? ' otp-slot--ok' : ''}`}
              onChange={(e) => setDigito(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !digitos[i] && i > 0)
                  inputsRef.current[i - 1]?.focus();
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleVerificar();
                }
              }}
            />
          ))}
        </div>

        <p className={`otp-estado${exito ? ' otp-estado--ok' : ''}`} role="status">
          {exito
            ? '¡Código correcto! Creando tu cuenta…'
            : loadingVerificar
              ? 'Verificando…'
              : bloqueado
                ? 'Bloqueado por 3 intentos fallidos.'
                : codigoEnviado
                  ? `Te quedan ${intentosRestantes} intento(s).`
                  : ''}
        </p>

        <button
          type="button"
          className="btn-primario verify-btn-verificar"
          onClick={handleVerificar}
          disabled={bloqueado || loadingVerificar || exito || !codigoEnviado}
          style={bloqueado ? { opacity: 0.5 } : undefined}
        >
          {exito ? '¡VERIFICADO!' : loadingVerificar ? 'VERIFICANDO…' : 'Verificar código'}
        </button>

        <p className="otp-reenviar">
          ¿No recibiste el código?
          <button type="button" onClick={handleEnviar} disabled={!puedeReenviar}>
            {segundosReenvio > 0 ? `Reenviar en ${segundosReenvio}s` : 'Reenviar código'}
          </button>
        </p>
        {bloqueado && (
          <p className="verify-desbloqueo">
            Al reenviar se reinician tus 3 intentos y se desbloquea el formulario.
          </p>
        )}

        <button
          type="button"
          className="verify-cancelar"
          onClick={onClose}
          disabled={loadingVerificar || exito}
        >
          Cancelar y volver al registro
        </button>
      </div>
    </div>
    </>
  );
}

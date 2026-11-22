import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import ModalVerificarCorreo from '../components/ModalVerificarCorreo';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import { mensajeError } from '../utils/errores';
import { UserPlus as UserPlusIcon } from 'lucide-react';
import SelectBuscable from '../components/SelectBuscable';

// En local el backend no exige captcha; cargarlo aquí solo mete errores de
// permisos de Google en la consola. En producción se mantiene la protección.
const RECAPTCHA_SITE_KEY = import.meta.env.PROD
  ? import.meta.env.VITE_RECAPTCHA_SITE_KEY
  : undefined;


declare global {
  interface Window {
    grecaptcha: any;
  }
}

const TIPOS_DOCUMENTO = [
  'Cédula de Ciudadanía',
  'Tarjeta de Identidad',
  'Pasaporte',
  'Cédula de Extranjería',
];

function formatearNombre(valor: string): string {
  const soloLetras = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]/g, '');
  const minusculas = soloLetras.toLowerCase();
  const capitalizado = minusculas.replace(/(^|\s|'|-)([a-záéíóúñü])/g, (_m, sep: string, letra: string) => sep + letra.toUpperCase());
  return capitalizado.replace(/\s{2,}/g, ' ');
}

function soloNumeros(valor: string): string {
  return valor.replace(/\D/g, '');
}

type Requisito = {
  id: string;
  texto: string;
  cumple: boolean;
};

const TEXTO_REQUISITOS = [
  { id: 'largo', texto: 'Mínimo 8 caracteres' },
  { id: 'mayuscula', texto: 'Al menos una mayúscula' },
  { id: 'numero', texto: 'Al menos un número' },
  { id: 'simbolo', texto: 'Al menos un símbolo (@, #, $, etc.)' },
];

export default function Registro() {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mostrarConfirmPassword, setMostrarConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);

  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) {
      console.warn('VITE_RECAPTCHA_SITE_KEY no está definida en las variables de entorno.');
      return;
    }
    if (window.grecaptcha) return;

    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);
  
  useEffect(() => {
    if (!window.grecaptcha) return;
    const container = document.getElementById('recaptcha-container');
    if (container && !container.dataset.recaptchaRendered) {
      window.grecaptcha.render(container, {
        'sitekey': RECAPTCHA_SITE_KEY,
        'callback': () => { /* widget rendered, can be captured on submit */ }
      });
      container.dataset.recaptchaRendered = 'true';
    }
  }, [RECAPTCHA_SITE_KEY, window.grecaptcha]);

  const requisitos: Requisito[] = [
    { ...TEXTO_REQUISITOS[0], cumple: password.length >= 8 },
    { ...TEXTO_REQUISITOS[1], cumple: /[A-Z]/.test(password) },
    { ...TEXTO_REQUISITOS[2], cumple: /\d/.test(password) },
    {
      ...TEXTO_REQUISITOS[3],
      cumple: /[^A-Za-z0-9\s]/.test(password),
    },
  ];

  const cumpleRequisitos = requisitos.every((r) => r.cumple);
  const requisitosCumplidos = requisitos.filter((r) => r.cumple).length;
  const claseBarra =
    requisitosCumplidos === requisitos.length
      ? 'verde'
      : requisitosCumplidos >= 2
        ? 'amarillo'
        : 'rojo';
  const porcentajeBarra = (requisitosCumplidos / requisitos.length) * 100;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!nombre.trim() || nombre.trim().length < 2) {
      showToast('Ingresa un nombre válido (solo letras, mínimo 2 caracteres).', true);
      return;
    }
    if (!apellido.trim() || apellido.trim().length < 2) {
      showToast('Ingresa un apellido válido (solo letras, mínimo 2 caracteres).', true);
      return;
    }
    if (!tipoDocumento) {
      showToast('Selecciona el tipo de documento.', true);
      return;
    }
    if (!/^[0-9]{6,12}$/.test(numeroDocumento)) {
      showToast('El número de documento debe tener entre 6 y 12 dígitos (solo números).', true);
      return;
    }
    if (!correo.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      showToast('Ingresa un correo electrónico válido.', true);
      return;
    }
    if (!cumpleRequisitos) {
      showToast('La contraseña no cumple los requisitos de seguridad.', true);
      return;
    }
    if (password !== confirmPassword) {
      showToast('Las contraseñas no coinciden.', true);
      return;
    }
    if (!aceptaTerminos) {
      showToast('Debes aceptar los Términos y Condiciones y la Política de Tratamiento de Datos Personales para continuar.', true);
      return;
    }

    let recaptchaToken = '';
    try {
      if (window.grecaptcha && RECAPTCHA_SITE_KEY) {
        await new Promise((resolve) => window.grecaptcha.ready(resolve));
        recaptchaToken = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'registro' });
      }
    } catch (error) {
      console.error('Error al ejecutar reCAPTCHA:', error);
    }

    sessionStorage.setItem('recaptcha_token', recaptchaToken);
    setModalAbierto(true);
  };

  const handleCodigoVerificado = async () => {
    setModalAbierto(false);
    setLoading(true);

    try {
      const token = sessionStorage.getItem('recaptcha_token') ?? '';
      await register(
        nombre,
        apellido,
        correo,
        password,
        tipoDocumento,
        numeroDocumento,
        token,
        aceptaTerminos
      );
      sessionStorage.setItem('aviso_login', 'registro_ok');
      navigate('/login', { replace: true, state: { toast: 'registro_ok' } });
    } catch (err) {
      showToast(mensajeError(err, 'No fue posible completar el registro'), true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout regresarA="/login">
      <form id="registroForm" onSubmit={handleSubmit}>
        <div className="contenedor-registro">
          <div className="encabezado">
            <h2>CREAR UNA CUENTA</h2>
            <p>Crea tu cuenta en el sistema.</p>
          </div>

          <p className="descripcion-registro">
            Llena cada uno de los siguientes campos para tu registro
          </p>

          <div className="fila">
            <div className="campo">
              <label htmlFor="nombre">Nombre<span className="required-marker">*</span></label>
              <input
                type="text"
                id="nombre"
                placeholder="Digite su nombre"
                value={nombre}
                onChange={(e) => setNombre(formatearNombre(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key.length === 1 && /[0-9]/.test(e.key)) e.preventDefault();
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const texto = e.clipboardData.getData('text');
                  setNombre(formatearNombre(texto));
                }}
                autoComplete="given-name"
                maxLength={40}
                required
              />
            </div>
            <div className="campo">
              <label htmlFor="apellido">Apellido<span className="required-marker">*</span></label>
              <input
                type="text"
                id="apellido"
                placeholder="Digite su apellido"
                value={apellido}
                onChange={(e) => setApellido(formatearNombre(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key.length === 1 && /[0-9]/.test(e.key)) e.preventDefault();
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const texto = e.clipboardData.getData('text');
                  setApellido(formatearNombre(texto));
                }}
                autoComplete="family-name"
                maxLength={40}
                required
              />
            </div>
          </div>

          <div className="fila">
            <div className="campo">
              <SelectBuscable
                value={tipoDocumento}
                onChange={(valor) => setTipoDocumento(String(valor))}
                opciones={TIPOS_DOCUMENTO.map((tipo) => ({ value: tipo, label: tipo }))}
                placeholder="Seleccione tipo de documento"
                label="Tipo de documento"
                requerido
              />
            </div>
            <div className="campo">
              <label htmlFor="numeroDocumento">Número de documento<span className="required-marker">*</span></label>
              <input
                type="text"
                id="numeroDocumento"
                placeholder="Digite su número de documento"
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(soloNumeros(e.target.value).slice(0, 12))}
                onKeyDown={(e) => {
                  if (e.key.length === 1 && !/[0-9]/.test(e.key)) e.preventDefault();
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const texto = e.clipboardData.getData('text');
                  setNumeroDocumento(soloNumeros(texto).slice(0, 12));
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={12}
                autoComplete="off"
                required
              />
            </div>
          </div>

          <div className="fila">
            <div className="campo">
              <label htmlFor="correo">Correo<span className="required-marker">*</span></label>
              <input
                type="email"
                id="correo"
                placeholder="Digite su correo (@gmail.com)"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
                pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
                minLength={5}
                maxLength={100}
                title="Ingrese un correo electrónico válido"
              />
            </div>
          </div>

          <div className="fila">
            <div className="campo">
              <label htmlFor="password">Contraseña<span className="required-marker">*</span></label>
              <div className="campo-password">
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  id="password"
                  className="input"
                  placeholder="Digite una contraseña segura"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={64}
                  pattern="^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$"
                  title="Mínimo 8 caracteres, una mayúscula, un número y un símbolo"
                />
                <button
                  type="button"
                  className="boton-mostrar-password"
                  data-tooltip={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setMostrarPassword((visible) => !visible)}
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  title={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {mostrarPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div
                className={`barra-contrasena ${claseBarra}`}
                role="progressbar"
                aria-label="Requisitos de la contraseña"
                aria-valuemin={0}
                aria-valuemax={requisitos.length}
                aria-valuenow={requisitosCumplidos}
              >
                <span
                  className="barra-contrasena-fill"
                  style={{ width: `${porcentajeBarra}%` }}
                />
              </div>
              <ul className="requisitos">
                {requisitos.map((requisito) => (
                  <li
                    key={requisito.id}
                    className={`requisito${requisito.cumple ? ' cumple' : ''}`}
                  >
                    <span aria-hidden="true">{requisito.cumple ? '✅' : '❌'}</span>
                    {requisito.texto}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="fila">
            <div className="campo">
              <label htmlFor="confirmPassword">Confirmar Contraseña<span className="required-marker">*</span></label>
              <div className="campo-password">
                <input
                  type={mostrarConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  className="input"
                  placeholder="Confirme su contraseña segura"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={64}
                  pattern="^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$"
                  title="Mínimo 8 caracteres, una mayúscula, un número y un símbolo"
                />
                <button
                  type="button"
                  className="boton-mostrar-password"
                  data-tooltip={mostrarConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setMostrarConfirmPassword((visible) => !visible)}
                  aria-label={mostrarConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  title={mostrarConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {mostrarConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && <p className="pwd-nomatch" style={{ fontSize: 12, marginTop: 5 }}>Las contraseñas no coinciden.</p>}
              {confirmPassword && confirmPassword === password && password && <p className="pwd-match" style={{ fontSize: 12, marginTop: 5 }}>✓ Coinciden</p>}
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <input
              type="checkbox"
              id="aceptaTerminos"
              checked={aceptaTerminos}
              required
              onChange={(e) => { setAceptaTerminos(e.target.checked); }}
              style={{ marginTop: 4 }}
            />
            <label htmlFor="aceptaTerminos" style={{ fontSize: 13, lineHeight: 1.4, color: 'var(--text-700)' }}>
              He leído y acepto los{' '}
              <Link to="/politica-legal#terminos" target="_blank" rel="noopener noreferrer" className="auth-legal-link">Términos y Condiciones de Uso</Link>
              {' '}y autorizo el tratamiento de mis datos personales conforme a la{' '}
              <Link to="/politica-legal#datos" target="_blank" rel="noopener noreferrer" className="auth-legal-link">Política de Tratamiento de Datos Personales (Habeas Data - Ley 1581 de 2012)</Link>.
            </label>
          </div>

          <button type="submit" className="boton-registro" disabled={loading}><UserPlusIcon size={16} className="btn-ico" aria-hidden="true" />
            {loading ? 'REGISTRANDO…' : 'Registrarse'}
          </button>
        </div>
      </form>

      <div className="enlace-externo">
        ¿Ya tienes una cuenta?
        <Link to="/login">Inicia sesión</Link>
      </div>

      {modalAbierto && (
        <ModalVerificarCorreo
          correo={correo}
          onClose={() => setModalAbierto(false)}
          onVerified={handleCodigoVerificado}
        />
      )}
    </AuthLayout>
  );
}
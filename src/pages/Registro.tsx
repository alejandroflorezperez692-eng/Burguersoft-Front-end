import { useEffect, useRef, useState, type FormEvent } from 'react';
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

const TIPOS_DOCUMENTO = [
  'Cédula de Ciudadanía',
  'Tarjeta de Identidad',
  'Pasaporte',
  'Cédula de Extranjería',
];

function formatearNombre(valor: string): string {
  // Solo letras (incluye tildes), espacios, apóstrofe y guion
  const soloLetras = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]/g, '');
  const minusculas = soloLetras.toLowerCase();
  // Capitaliza primera letra de cada palabra / después de ' o -
  const capitalizado = minusculas.replace(/(^|\s|'|-)([a-záéíóúñü])/g, (_m, sep: string, letra: string) => sep + letra.toUpperCase());
  // Evita múltiples espacios seguidos
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
  const [tipoOpen, setTipoOpen] = useState(false);
  const tipoRef = useRef<HTMLDivElement>(null);
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mostrarConfirmPassword, setMostrarConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!tipoOpen) return;
    const onClick = (e: MouseEvent) => {
      if (tipoRef.current && !tipoRef.current.contains(e.target as Node)) setTipoOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTipoOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [tipoOpen]);

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
  const porcentajeBarra =
    (requisitosCumplidos / requisitos.length) * 100;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!nombre.trim() || nombre.trim().length < 2) {
      setError('Ingrese un nombre válido (solo letras, mínimo 2 caracteres).');
      return;
    }
    if (!apellido.trim() || apellido.trim().length < 2) {
      setError('Ingrese un apellido válido (solo letras, mínimo 2 caracteres).');
      return;
    }
    if (!tipoDocumento) {
      setError('Seleccione el tipo de documento.');
      return;
    }
    if (!/^[0-9]{6,12}$/.test(numeroDocumento)) {
      setError('El número de documento debe tener entre 6 y 12 dígitos (solo números).');
      return;
    }
    if (!cumpleRequisitos) {
      setError('La contraseña no cumple los requisitos de seguridad.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      await register(
        nombre,
        apellido,
        correo,
        password,
        tipoDocumento,
        numeroDocumento,
      );
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
              <label htmlFor="nombre">Nombre*</label>
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
              <label htmlFor="apellido">Apellido*</label>
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
              <label htmlFor="tipoDocumento">Tipo de documento*</label>
              <div className="custom-select" ref={tipoRef}>
                <button
                  type="button"
                  id="tipoDocumento"
                  className={`custom-select-trigger ${!tipoDocumento ? 'placeholder' : ''} ${tipoOpen ? 'open' : ''}`}
                  onClick={() => setTipoOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={tipoOpen}
                  aria-label="Tipo de documento"
                >
                  <span>{tipoDocumento || 'Seleccione tipo de documento'}</span>
                  <span className="custom-select-arrow" aria-hidden="true">▾</span>
                </button>
                {tipoOpen && (
                  <ul className="custom-select-options" role="listbox">
                    {TIPOS_DOCUMENTO.map((tipo) => (
                      <li
                        key={tipo}
                        role="option"
                        aria-selected={tipoDocumento === tipo}
                        className={`custom-select-option ${tipoDocumento === tipo ? 'selected' : ''}`}
                        onClick={() => {
                          setTipoDocumento(tipo);
                          setTipoOpen(false);
                        }}
                      >
                        {tipo}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="campo">
              <label htmlFor="numeroDocumento">Número de documento*</label>
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
              <label htmlFor="correo">Correo*</label>
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
              <label htmlFor="password">Contraseña*</label>
              <div className="campo-password">
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="Digite una contraseña segura"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="boton-mostrar-password"
                  onClick={() => setMostrarPassword((visible) => !visible)}
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  title={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
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
              <label htmlFor="confirmPassword">Confirmar Contraseña*</label>
              <div className="campo-password">
                <input
                  type={mostrarConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  placeholder="Confirme su contraseña segura"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="boton-mostrar-password"
                  onClick={() => setMostrarConfirmPassword((visible) => !visible)}
                  aria-label={mostrarConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  title={mostrarConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                </button>
              </div>
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
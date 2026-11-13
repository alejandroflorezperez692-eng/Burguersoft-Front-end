import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/Toast';
import apiClient from '../../api/client';
import HistorialPage from '../../components/HistorialModal';
import { normalizarRol } from '../../utils/roles';
import { mensajeError } from '../../utils/errores';
import AdminLoading from '../../components/AdminLoading';
import usuarioPerfil from '../../assets/img/usuario-perfil.png';
import {
  maxLenDocumento,
  reglasPassword,
  tiposDoc,
  validarDatos,
  validarPassword,
} from '../../utils/perfil';

type UsuarioMe = {
  nombre?: string;
  apellido?: string;
  Tdocumento?: string;
  Ndocumento?: string | number;
  telefono?: string | number;
  correo?: string;
  email?: string;
};

export default function ConfiguracionAdmin() {
  const { user, updateUser, logout } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [tdoc, setTdoc] = useState('');
  const [tdocAbierto, setTdocAbierto] = useState(false);
  const [ndoc, setNdoc] = useState('');
  const [telefono, setTelefono] = useState('');
  const [telefonoEditado, setTelefonoEditado] = useState(false);
  const [correo, setCorreo] = useState(user?.email ?? '');
  const [cargando, setCargando] = useState(true);
  const [verHistorial, setVerHistorial] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrarActual, setMostrarActual] = useState(false);
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarConf, setMostrarConf] = useState(false);
  const [actualizandoPwd, setActualizandoPwd] = useState(false);
  const selectorTdocRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVerHistorial(false);
  }, [location.key]);

  useEffect(() => {
    const cerrarAlHacerClickFuera = (event: MouseEvent) => {
      if (!selectorTdocRef.current?.contains(event.target as Node)) {
        setTdocAbierto(false);
      }
    };

    document.addEventListener('mousedown', cerrarAlHacerClickFuera);
    return () => document.removeEventListener('mousedown', cerrarAlHacerClickFuera);
  }, []);
  useEffect(() => {
  setVerHistorial(false);
}, [location.state]);
  useEffect(() => {
    let cancelado = false;
    const partes = (user?.name ?? '').split(' ');
    setNombre(partes[0] ?? '');
    setApellido(partes.slice(1).join(' ') ?? '');

    apiClient
      .get('/me')
      .then(({ data }) => {
        if (cancelado) return;
        const u: UsuarioMe = data?.usuario ?? data?.user ?? data;
        if (!u) return;
        if (u.nombre) setNombre(u.nombre);
        if (u.apellido) setApellido(u.apellido);
        if (u.Tdocumento) setTdoc(u.Tdocumento);
        if (u.Ndocumento) setNdoc(String(u.Ndocumento));
        if (u.telefono) setTelefono(String(u.telefono));
        const mail = u.correo ?? u.email;
        if (mail) setCorreo(mail);
      })
      .catch(() => {
        if (cancelado) return;
        try {
          const raw = localStorage.getItem('perfil_extra');
          if (raw) {
            const j = JSON.parse(raw);
            if (j.Tdocumento) setTdoc(j.Tdocumento);
            if (j.Ndocumento) setNdoc(String(j.Ndocumento));
            if (j.telefono) setTelefono(String(j.telefono));
          }
        } catch {
          
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [user?.name]);

  const handleInfo = async (e: React.FormEvent) => {
    e.preventDefault();

    const err = validarDatos({ nombre, apellido, tdoc, ndoc, telefono });
    if (err) {
      showToast(err, true);
      return;
    }
    setGuardando(true);
    try {
      await apiClient.put('/perfil', { nombre, apellido, Tdocumento: tdoc, Ndocumento: ndoc, telefono });
      showToast('Datos actualizados correctamente.');
      const nombreCompleto = `${nombre.trim()} ${apellido.trim()}`.trim();
      updateUser({ name: nombreCompleto });
      localStorage.setItem('perfil_extra', JSON.stringify({ Tdocumento: tdoc, Ndocumento: ndoc, telefono }));
    } catch (error: unknown) {
      showToast(mensajeError(error, 'No se pudieron guardar los cambios'), true);
    } finally {
      setGuardando(false);
    }
  };

  const handlePass = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!actual) {
      showToast('La contraseña actual es obligatoria.', true);
      return;
    }
    const errPwd = validarPassword(nueva, actual);
    if (errPwd) {
      showToast(errPwd, true);
      return;
    }
    if (nueva !== confirmar) {
      showToast('Las contraseñas no coinciden.', true);
      return;
    }
    setActualizandoPwd(true);
    try {
      await apiClient.post('/perfil/password', { actual, nueva, confirmar });
      sessionStorage.setItem('login_toast', 'password_ok');
      logout();
      window.location.replace('/login');
    } catch (error: unknown) {
      const msg = mensajeError(error, 'No se pudo actualizar la contraseña');
      if (msg.toLowerCase().includes('actual') || msg.toLowerCase().includes('incorrecta')) {
        showToast('La contraseña actual es incorrecta.', true);
      } else {
        showToast(msg, true);
      }
    } finally {
      setActualizandoPwd(false);
    }
  };

  const reglas = reglasPassword(nueva);
  const fuerza = Object.values(reglas).filter(Boolean).length;
  const claseBarra = fuerza <= 1 ? 'rojo' : fuerza === 2 ? 'amarillo' : 'verde';

  if (verHistorial) {
    return <HistorialPage onVolver={() => setVerHistorial(false)} />;
  }

  return (
    <div className="page-inner">
      {cargando && <AdminLoading area texto="Cargando configuración" subtexto="Revisando tus datos" />}
      <div className="page-header">
        <div>
          <h1>Configuración de Cuenta</h1>
          <p className="subtitulo">Gestiona tu perfil y contraseña</p>
        </div>
      </div>

      <div className="grid-perfil">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)', padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
            border: '3px solid var(--brand)',
          }}>
            <img
              src={usuarioPerfil}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 17, fontWeight: 700, color: 'var(--text-900)', margin: 0 }}>
            {user?.name ?? 'Administrador'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-400)', margin: 0 }}>{correo || user?.email || ''}</p>
          <span className="badge badge-info cfg-role-badge">{user?.role ?? 'Administrador'}</span>
        </div>
        {normalizarRol(user?.role) === 'admin' && (
          <button
            type="button"
            className="btn-primary"
            style={{ alignSelf: 'center', padding: '8px 20px', fontSize: 13 }}
            onClick={() => setVerHistorial(true)}
          >
            Historial
          </button>
        )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <form onSubmit={handleInfo} className="cfg-card">
            <h3 className="cfg-titulo">Información Personal</h3>

            <div className="grid-2col">
              <div className="form-group"> 
                <label htmlFor="admin-nombre">Nombre <span className="cfg-req">*</span></label>
                <input 
                  id="admin-nombre" 
                  type="text"
                  value={nombre}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^a-zA-ZÁÉÍÓÚÑáéíóúñ\s]/g, '');
                    setNombre(v.charAt(0).toUpperCase() + v.slice(1));
                  }}
                  placeholder="Tu nombre"
                  maxLength={40}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="admin-apellido">Apellido <span className="cfg-req">*</span></label>
                <input
                  id="admin-apellido"
                  type="text"
                  value={apellido}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^a-zA-ZÁÉÍÓÚÑáéíóúñ\s]/g, '');
                    setApellido(v.charAt(0).toUpperCase() + v.slice(1));
                  }}
                  placeholder="Tu apellido"
                  maxLength={40}
                  required
                />
              </div>
            </div>

            <div className="grid-2col">
              <div className="form-group">
                <label htmlFor="admin-tdoc">Tipo de documento <span className="cfg-req">*</span></label>
                <div className="cfg-document-select" ref={selectorTdocRef}>
                  <button
                    type="button"
                    id="admin-tdoc"
                    className={`cfg-document-trigger${tdocAbierto ? ' open' : ''}${!tdoc ? ' placeholder' : ''}`}
                    onClick={() => setTdocAbierto((abierto) => !abierto)}
                    aria-haspopup="listbox"
                    aria-expanded={tdocAbierto}
                    aria-controls="admin-tdoc-options"
                    aria-label="Tipo de documento"
                    disabled={cargando}
                  >
                    <span>{tdoc || 'Seleccione...'}</span>
                    <span className="cfg-document-arrow" aria-hidden="true">▾</span>
                  </button>
                  {tdocAbierto && (
                    <ul id="admin-tdoc-options" className="cfg-document-options" role="listbox" aria-label="Tipo de documento">
                      <button
                        type="button"
                        role="option"
                        aria-selected={!tdoc}
                        className="cfg-document-option"
                        onClick={() => {
                          setTdoc('');
                          setTdocAbierto(false);
                        }}
                      >
                        Seleccione...
                      </button>
                      {tiposDoc.map((tipo) => (
                        <button
                          type="button"
                          key={tipo}
                          role="option"
                          aria-selected={tdoc === tipo}
                          className={`cfg-document-option${tdoc === tipo ? ' selected' : ''}`}
                          onClick={() => {
                            setTdoc(tipo);
                            setTdocAbierto(false);
                          }}
                        >
                          {tipo}
                        </button>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="admin-ndoc">Número de documento</label>
                <input
                  id="admin-ndoc"
                  type="text"
                  value={ndoc}
                  placeholder="Número de documento"
                  maxLength={maxLenDocumento(tdoc)}
                  disabled
                  required
                />
                <span className="cfg-hint cfg-documento-hint">El número de documento no se puede cambiar.</span>
              </div>
            </div>

            <div className="grid-2col">
              <div className="form-group">
                <label htmlFor="admin-telefono">Teléfono <span className="cfg-req">*</span></label>
                <input
                  id="admin-telefono"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  className={telefonoEditado ? 'telefono-editado' : ''}
                  value={telefono}
                  onFocus={() => setTelefonoEditado(false)}
                  onChange={(e) => {
                    let v = e.target.value.replace(/[^0-9]/g, '');
                    if (v.length > 0 && v[0] !== '3') v = '3' + v.slice(1);
                    if (v.length > 10) v = v.slice(0, 10);
                    setTelefono(v);
                    setTelefonoEditado(true);
                  }}
                  placeholder="3001234567"
                  maxLength={10}
                  disabled={cargando}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="admin-correo">Correo electrónico</label>
                <input id="admin-correo" type="email" value={correo} disabled readOnly />
                <span className="cfg-hint">El correo no se puede cambiar.</span>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-save" type="submit" disabled={guardando || cargando}>
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>

          <form onSubmit={handlePass} className="cfg-card">
            <h3 className="cfg-titulo">Seguridad</h3>

            <div className="form-group">
              <label htmlFor="admin-pass-actual">Contraseña actual <span className="cfg-req">*</span></label>
              <div className="cfg-pw">
                <input
                  id="admin-pass-actual"
                  type={mostrarActual ? 'text' : 'password'}
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="cfg-pw-toggle"
                  onClick={() => setMostrarActual((v) => !v)}
                  aria-label={mostrarActual ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {mostrarActual ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="admin-pass-nueva">Nueva contraseña <span className="cfg-req">*</span></label>
              <div className="cfg-pw">
                <input
                  id="admin-pass-nueva"
                  type={mostrarNueva ? 'text' : 'password'}
                  value={nueva}
                  onChange={(e) => setNueva(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="cfg-pw-toggle"
                  onClick={() => setMostrarNueva((v) => !v)}
                  aria-label={mostrarNueva ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {mostrarNueva ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              <div className={`cfg-barra ${claseBarra}`} role="progressbar" aria-label="Fortaleza de la contraseña">
                <span className="cfg-barra-fill" style={{ width: `${(fuerza / 4) * 100}%` }} />
              </div>

              <ul className="cfg-requisitos">
                <li className={`cfg-requisito${reglas.longitud ? ' cumple' : ''}`}>
                  <span className="cfg-requisito-icon" aria-hidden="true">{reglas.longitud ? '✓' : '×'}</span> Mínimo 8 caracteres
                </li>
                <li className={`cfg-requisito${reglas.mayuscula ? ' cumple' : ''}`}>
                  <span className="cfg-requisito-icon" aria-hidden="true">{reglas.mayuscula ? '✓' : '×'}</span> Al menos una mayúscula
                </li>
                <li className={`cfg-requisito${reglas.numero ? ' cumple' : ''}`}>
                  <span className="cfg-requisito-icon" aria-hidden="true">{reglas.numero ? '✓' : '×'}</span> Al menos un número
                </li>
                <li className={`cfg-requisito${reglas.especial ? ' cumple' : ''}`}>
                  <span className="cfg-requisito-icon" aria-hidden="true">{reglas.especial ? '✓' : '×'}</span> Al menos un símbolo (@, #, $, etc.)
                </li>
              </ul>
            </div>

            <div className="form-group">
              <label htmlFor="admin-pass-confirmar">Confirmar nueva <span className="cfg-req">*</span></label>
              <div className="cfg-pw">
                <input
                  id="admin-pass-confirmar"
                  type={mostrarConf ? 'text' : 'password'}
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="cfg-pw-toggle"
                  onClick={() => setMostrarConf((v) => !v)}
                  aria-label={mostrarConf ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {mostrarConf ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              {confirmar && confirmar !== nueva && <span className="cfg-hint cfg-hint-err">Las contraseñas no coinciden.</span>}
              {confirmar && confirmar === nueva && nueva && <span className="cfg-hint cfg-hint-ok">✓ Coinciden</span>}
            </div>

            <div className="modal-actions">
              <button className="btn-save" type="submit" disabled={actualizandoPwd}>
                {actualizandoPwd ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
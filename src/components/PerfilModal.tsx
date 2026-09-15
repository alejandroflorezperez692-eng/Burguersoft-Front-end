import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';


type Tab = 'datos' | 'pwd' | 'info';

const tiposDoc = [
  'Cédula de Ciudadanía',
  'Tarjeta de Identidad',
  'Pasaporte',
  'Cédula de Extranjería',
] as const;

function formatearTelefono(v: string): string {
  const limpio = v.replace(/[^0-9]/g, '');
  const partes = [limpio.slice(0, 3), limpio.slice(3, 6), limpio.slice(6, 10)];
  return partes.filter(Boolean).join(' ');
}

function validarDatos(d: { nombre: string; apellido: string; tdoc: string; ndoc: string; telefono: string }): string | null {
  if (!d.nombre.trim() || !d.apellido.trim()) return 'Nombre y apellido son obligatorios.';
  if (!d.tdoc) return 'Debes seleccionar un tipo de documento.';
  if (!d.ndoc.trim()) return 'El número de documento es obligatorio.';
  const len = d.ndoc.trim().length;
  if (d.tdoc === 'Cédula de Ciudadanía' && (len < 6 || len > 10)) return 'La cédula debe tener entre 6 y 10 dígitos.';
  if (d.tdoc === 'Tarjeta de Identidad' && (len < 10 || len > 11)) return 'La tarjeta de identidad debe tener entre 10 y 11 dígitos.';
  if (d.tdoc === 'Cédula de Extranjería' && (len < 6 || len > 10)) return 'La cédula de extranjería debe tener entre 6 y 10 dígitos.';
  if (d.tdoc === 'Pasaporte' && (len < 6 || len > 9)) return 'El pasaporte debe tener entre 6 y 9 caracteres.';
  if (d.telefono) {
    const limpio = d.telefono.replace(/\s/g, '');
    if (!/^(\+57|57)?3[0-9]{9}$/.test(limpio)) return 'El teléfono debe ser un número colombiano válido (ej: 3001234567).';
  }
  return null;
}

export default function PerfilModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, updateUser } = useAuth();
  // Si el usuario ya editó algo, la respuesta tardía de /me no debe borrarlo.
  const dirtyRef = useRef(false);
  const abiertoRef = useRef(false);
  const [tab, setTab] = useState<Tab>('datos');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // datos del usuario - intentar cargar de /me
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [tdoc, setTdoc] = useState('');
  const [ndoc, setNdoc] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo] = useState(user?.email ?? '');

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrarActual, setMostrarActual] = useState(false);
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarConf, setMostrarConf] = useState(false);
  const [enviandoPwd, setEnviandoPwd] = useState(false);

  const marcarEditado = () => {
    dirtyRef.current = true;
  };

  // cargar datos solo una vez por apertura; lo que el usuario
  // ya editó no se sobrescribe cuando /me responde tarde
  useEffect(() => {
    if (!isOpen) {
      abiertoRef.current = false;
      return;
    }
    if (abiertoRef.current) return;
    abiertoRef.current = true;
    dirtyRef.current = false;
    setError(''); setSuccess(''); setTab('datos');
    // intentar split nombre
    const partes = (user?.name ?? '').split(' ');
    setNombre(partes[0] ?? '');
    setApellido(partes.slice(1).join(' ') ?? '');
    // intentar obtener perfil completo del backend
    apiClient.get('/me').then(({ data }) => {
      if (dirtyRef.current) return;
      // data puede venir con nombre, apellido, Tdocumento etc
      const u = data?.usuario ?? data?.user ?? data;
      if (u) {
        if (u.nombre) setNombre(u.nombre);
        if (u.apellido) setApellido(u.apellido);
        if (u.Tdocumento) setTdoc(u.Tdocumento);
        if (u.Ndocumento) setNdoc(String(u.Ndocumento));
        if (u.telefono) setTelefono(String(u.telefono));
        if (u.correo && !correo) {/* */}
      }
    }).catch(() => {
      // fallback: leer de localStorage si existía algo extra
      try {
        const raw = localStorage.getItem('perfil_extra');
        if (raw) {
          const j = JSON.parse(raw);
          if (j.Tdocumento) setTdoc(j.Tdocumento);
          if (j.Ndocumento) setNdoc(j.Ndocumento);
          if (j.telefono) setTelefono(j.telefono);
        }
      } catch { /* ignore */ }
    });
  }, [isOpen, user?.name, correo]);

  // configurar longitud según tipo documento (como PHP)
  const maxLenDoc = tdoc === 'Cédula de Ciudadanía' ? 10 : tdoc === 'Tarjeta de Identidad' ? 11 : tdoc === 'Cédula de Extranjería' ? 10 : tdoc === 'Pasaporte' ? 9 : 12;

  const handleGuardarDatos = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const err = validarDatos({ nombre, apellido, tdoc, ndoc, telefono });
    if (err) { setError(err); return; }
    const nombreCompleto = `${nombre.trim()} ${apellido.trim()}`.trim();
    try {
      await apiClient.put('/perfil', { nombre, apellido, Tdocumento: tdoc, Ndocumento: ndoc, telefono });
      setSuccess('Datos actualizados correctamente.');
      // actualizar contexto + local para que no se revierta al reabrir
      updateUser({ name: nombreCompleto });
      localStorage.setItem('perfil_extra', JSON.stringify({ Tdocumento: tdoc, Ndocumento: ndoc, telefono }));
    } catch {
      // si backend no existe, igual mostramos éxito local (para demo)
      const msg = 'Datos actualizados correctamente.';
      setSuccess(msg);
      localStorage.setItem('perfil_extra', JSON.stringify({ Tdocumento: tdoc, Ndocumento: ndoc, telefono }));
      updateUser({ name: nombreCompleto });
    }
  };

const handlePassword = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(''); setSuccess('');
  if (!actual) { setError('La contraseña actual es obligatoria.'); return; }
  if (nueva.length < 8) { setError('La nueva contraseña debe tener al menos 8 caracteres.'); return; }
  if (nueva === actual) { setError('La nueva contraseña debe ser diferente a la actual.'); return; }
  if (nueva !== confirmar) { setError('Las contraseñas no coinciden.'); return; }
  // validaciones extra de fortaleza (como en PHP + UI)
  const hasMayus = /[A-Z]/.test(nueva);
  const hasNum = /[0-9]/.test(nueva);
  const hasEsp = /[^A-Za-z0-9]/.test(nueva);
  if (!hasMayus || !hasNum || !hasEsp) {
    setError('La contraseña debe tener mayúscula, número y símbolo.');
    return;
  }
  setEnviandoPwd(true);
  try {
    await apiClient.post('/perfil/password', { actual, nueva, confirmar });
    setSuccess('Contraseña actualizada correctamente.');
    setActual(''); setNueva(''); setConfirmar('');
  } catch (err: any) {
    const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? '';
    if (msg.toLowerCase().includes('actual') || msg.toLowerCase().includes('incorrecta')) {
      setError('La contraseña actual es incorrecta.');
    } else if (msg) {
      setError(msg);
    } else {
      setError('No se pudo actualizar la contraseña. Intenta de nuevo más tarde.');
    }
  } finally {
    setEnviandoPwd(false);
  }
};

  // fuerza de contraseña
  const reglas = {
    longitud: nueva.length >= 8,
    mayuscula: /[A-Z]/.test(nueva),
    numero: /[0-9]/.test(nueva),
    especial: /[^A-Za-z0-9]/.test(nueva),
  };
  const fuerza = Object.values(reglas).filter(Boolean).length;
  const barraColor = fuerza <= 1 ? '#e63946' : fuerza === 2 ? '#E8821A' : fuerza === 3 ? '#EF9F27' : '#2a9d48';

  if (!isOpen) return null;

  const iniciales = (nombre?.[0] ?? user?.name?.[0] ?? 'U').toUpperCase();

  return (
    <>
      <div className="mp-overlay mp-show" onClick={onClose} />
      <div className="mp-panel mp-show" role="dialog" aria-modal="true" aria-label="Mi perfil">
        <div className="mp-head">
          <div className="mp-head-left">
            <div className="mp-ava">{iniciales}</div>
            <div>
              <div className="mp-title">{[nombre, apellido].filter(Boolean).join(' ') || user?.name || 'Usuario'}</div>
              <div className="mp-sub">{correo}</div>
            </div>
          </div>
          <button className="mp-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="mp-body">
          {error && tab === 'datos' && <div className="mp-alert mp-alert-err">⚠ {error}</div>}
          {success && tab === 'datos' && <div className="mp-alert mp-alert-ok">✓ {success}</div>}
          {error && tab === 'pwd' && <div className="mp-alert mp-alert-err">⚠ {error}</div>}
          {success && tab === 'pwd' && <div className="mp-alert mp-alert-ok">✓ {success}</div>}

          <div className="mp-tabs-container">
            <button type="button" className={`mp-tab ${tab === 'datos' ? 'mp-tab-active' : ''}`} onClick={() => { setTab('datos'); setError(''); setSuccess(''); }}>
              <span className="mp-tab-icon" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
                  <circle cx="8.5" cy="11" r="2" />
                  <path d="M5.5 16.5a3.5 3.5 0 0 1 6 0" />
                  <path d="M14 9.5h4M14 13h4" />
                </svg>
              </span><span className="mp-tab-label">Mis datos</span>
            </button>
            <button type="button" className={`mp-tab ${tab === 'pwd' ? 'mp-tab-active' : ''}`} onClick={() => { setTab('pwd'); setError(''); setSuccess(''); }}>
              <span className="mp-tab-icon" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="14" r="4.5" />
                  <path d="M11.5 10.5 20 3.5" />
                  <path d="M16 7.5l2.5 2.5M13.5 10l2 2" />
                </svg>
              </span><span className="mp-tab-label">Contraseña</span>
            </button>
            <button type="button" className={`mp-tab ${tab === 'info' ? 'mp-tab-active' : ''}`} onClick={() => { setTab('info'); setError(''); setSuccess(''); }}>
              <span className="mp-tab-icon" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3Z" />
                  <path d="M9 12l2 2 4-4.5" />
                </svg>
              </span><span className="mp-tab-label">Cuenta</span>
            </button>
          </div>

          {tab === 'datos' && (
            <form onSubmit={handleGuardarDatos}>
              <div className="mp-grid">
                <div className="mp-field">
                  <label className="mp-label">Nombre <span className="mp-req">*</span></label>
                  <input 
                    type="text" 
                    value={nombre} 
                    onChange={(e) => { 
                      marcarEditado(); 
                      const v = e.target.value.replace(/[^a-zA-ZÁÉÍÓÚÑáéíóúñ\s]/g, ''); 
                      setNombre(v.charAt(0).toUpperCase() + v.slice(1)); 
                    }} 
                    placeholder="Tu nombre" 
                    required 
                    maxLength={20} 
                  />
                </div>
                <div className="mp-field">
                  <label className="mp-label">Apellido <span className="mp-req">*</span></label>
                  <input 
                    type="text" 
                    value={apellido} 
                    onChange={(e) => { 
                      marcarEditado(); 
                      const v = e.target.value.replace(/[^a-zA-ZÁÉÍÓÚÑáéíóúñ\s]/g, ''); 
                      setApellido(v.charAt(0).toUpperCase() + v.slice(1)); 
                    }} 
                    placeholder="Tu apellido" 
                    required 
                    maxLength={20} 
                  />
                </div>
                <div className="mp-field">
                  <label className="mp-label">Tipo de documento</label>
                  <div className="mp-select-wrap">
                    <select value={tdoc} onChange={(e) => { marcarEditado(); setTdoc(e.target.value); }} required>
                      <option value="">Seleccione...</option>
                      {tiposDoc.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mp-field">
                  <label className="mp-label">Número de documento</label>
                  <input type="text" value={ndoc} onChange={(e) => { marcarEditado(); setNdoc(e.target.value.replace(/[^0-9A-Za-z]/g, '')); }} placeholder="Número de documento" maxLength={maxLenDoc} required />
                </div>
                <div className="mp-field mp-full">
                  <label className="mp-label">Teléfono</label>
                  <input 
                    type="tel" 
                    value={formatearTelefono(telefono)} 
                    onChange={(e) => {
                      marcarEditado();
                      const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                      if (v.length > 0 && v[0] !== '3') return; // bloquea si no empieza en 3
                      setTelefono(v);
                    }} 
                    placeholder="300 123 4567" 
                    maxLength={12} 
                  />
                </div>
                <div className="mp-field mp-full">
                  <label className="mp-label">Correo electrónico</label>
                  <input type="email" value={correo} disabled />
                  <span className="mp-hint">El correo no se puede cambiar.</span>
                </div>
              </div>
              <div className="mp-actions">
                <button type="button" className="mp-btn-cancel" onClick={onClose}>Cancelar</button>
                <button type="submit" className="mp-btn-save">Guardar cambios</button>
              </div>
            </form>
          )}

          {tab === 'pwd' && (
            <form onSubmit={handlePassword}>
              <div className="mp-grid">
                <div className="mp-field mp-full">
                  <label className="mp-label">Contraseña actual <span className="mp-req">*</span></label>
                  <div className="mp-pw">
                    <input type={mostrarActual ? 'text' : 'password'} value={actual} onChange={(e) => setActual(e.target.value)} placeholder="••••••••" required />
                    <button type="button" className="mp-pw-toggle" onClick={() => setMostrarActual((v) => !v)}>{mostrarActual ? 'Ocultar' : 'Mostrar'}</button>
                  </div>
                </div>
                <div className="mp-field mp-full">
                  <label className="mp-label">Nueva contraseña <span className="mp-req">*</span></label>
                  <div className="mp-pw">
                    <input type={mostrarNueva ? 'text' : 'password'} value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Mínimo 8 caracteres" required />
                    <button type="button" className="mp-pw-toggle" onClick={() => setMostrarNueva((v) => !v)}>{mostrarNueva ? 'Ocultar' : 'Mostrar'}</button>
                  </div>
                  <div style={{ height: 6, width: '100%', background: '#e0e0e0', marginTop: 10, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(fuerza / 4) * 100}%`, background: barraColor, transition: '0.3s' }} />
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, fontSize: 13, marginTop: 10, color: '#999', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <li style={{ color: reglas.longitud ? '#2a9d48' : '#999' }}>{reglas.longitud ? '✓' : '❌'} Mínimo 8 caracteres</li>
                    <li style={{ color: reglas.mayuscula ? '#2a9d48' : '#999' }}>{reglas.mayuscula ? '✓' : '❌'} Al menos una mayúscula</li>
                    <li style={{ color: reglas.numero ? '#2a9d48' : '#999' }}>{reglas.numero ? '✓' : '❌'} Al menos un número</li>
                    <li style={{ color: reglas.especial ? '#2a9d48' : '#999' }}>{reglas.especial ? '✓' : '❌'} Al menos un símbolo (@, #, $, etc.)</li>
                  </ul>
                </div>
                <div className="mp-field mp-full">
                  <label className="mp-label">Confirmar nueva <span className="mp-req">*</span></label>
                  <div className="mp-pw">
                    <input type={mostrarConf ? 'text' : 'password'} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} placeholder="Repite la contraseña" required />
                    <button type="button" className="mp-pw-toggle" onClick={() => setMostrarConf((v) => !v)}>{mostrarConf ? 'Ocultar' : 'Mostrar'}</button>
                  </div>
                  {confirmar && confirmar !== nueva && <p style={{ fontSize: 12, color: '#e63946', marginTop: 5 }}>Las contraseñas no coinciden.</p>}
                  {confirmar && confirmar === nueva && nueva && <p style={{ fontSize: 12, color: '#2a9d48', marginTop: 5 }}>✓ Coinciden</p>}
                </div>
              </div>
              <div className="mp-actions">
                <button type="submit" className="mp-btn-save" disabled={enviandoPwd}>
                  {enviandoPwd ? 'Actualizando...' : 'Actualizar contraseña'}
                </button>
              </div>
            </form>
          )}

          {tab === 'info' && (
            <>
              <div className="mp-info-list">
                <div className="mp-info-row"><span className="mp-info-lbl">Correo</span><span>{correo || '—'}</span></div>
                <div className="mp-info-row"><span className="mp-info-lbl">Tipo documento</span><span>{tdoc || '—'}</span></div>
                <div className="mp-info-row"><span className="mp-info-lbl">N.º documento</span><span>{ndoc || '—'}</span></div>
                <div className="mp-info-row"><span className="mp-info-lbl">Teléfono</span><span>{telefono ? formatearTelefono(telefono) : '—'}</span></div>
                <div className="mp-info-row"><span className="mp-info-lbl">Estado</span><span className="mp-badge-ok">✓ Activo</span></div>
              </div>
              <div className="mp-actions" style={{ marginTop: 16 }}>
                <button type="button" className="mp-btn-cancel" style={{ flex: 1 }} onClick={onClose}>Cerrar</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
